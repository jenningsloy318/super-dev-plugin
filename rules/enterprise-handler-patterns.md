---
name: enterprise-handler-patterns
description: "Backend handler architecture — CRUD+enrichment, batch upload with async processing, SSE progress, correlation/link patterns, and router wiring"
---

<purpose>Guide implementation of enterprise backend handlers that go beyond simple CRUD. Covers common patterns for data pipelines: upload → async enrichment → listing with filters → detail with nested links → reverse lookup for cross-navigation. Derived from production Go/Echo service handling OData enrichment with SSE progress streaming.</purpose>

<directives>
  <directive severity="high" name="Upload-Enrich-List Pattern">Multi-step data flows follow: (1) Upload handler: validate → parse → persist raw records in transaction, (2) Async enrichment: spawn goroutine/worker for external API calls, (3) List handler: query with filters/search/sort/pagination, (4) Detail handler: full record with nested relationships. Each step is a separate handler with its own endpoint.</directive>
  <directive severity="high" name="Async Enrichment with Progress">Long-running enrichment MUST: (1) return immediately from the upload handler (HTTP 202 Accepted), (2) process items in a background worker with rate limiting (`semaphore.Wait(ctx)`), (3) emit SSE events per-item (`row_enriched`) and on completion (`enrichment_complete` with aggregated counts), (4) update item status in DB as each completes.</directive>
  <directive severity="high" name="Rate-Limited Iteration">When calling external APIs in a loop over N items, ALWAYS use a rate limiter: `limiter.Wait(ctx)` before each call. Never fire N concurrent requests at an external service. Typical: semaphore with concurrency 3-5 for external APIs, token bucket for rate-limited APIs.</directive>
  <directive severity="high" name="Router Wiring Completeness">Every new handler MUST have: (1) handler function implementation, (2) router registration with path + method + middleware, (3) permission/RBAC middleware attached. A handler that exists but isn't wired → 404. A handler wired without permission → security hole. Follow existing route group patterns.</directive>
  <directive severity="medium" name="One-to-Many Lookup Pattern">When enrichment produces one-to-many relationships (one correlation ID → many linked records), implement: (1) forward lookup: correlation row → its links with linked row brief info, (2) reverse lookup: linked row → which correlation rows reference it (for cross-navigation). Both directions are needed for usable UIs.</directive>
  <directive severity="medium" name="Link Priority Decision">When linking records, determine link type from data: distinct values in field A → link type X, same values but distinct in field B → link type Y. Encapsulate in a pure `determineLinkPriority()` function that's independently testable.</directive>
  <directive severity="medium" name="Nested Response Structure">List endpoints with relationships use nested response shapes: `{ rows: [{ ...rowFields, links: [{ ...linkFields, linkedRow: { ...briefFields } }] }] }`. Query pattern: (1) query main rows, (2) for each: query links, (3) for each link: query brief info of linked row. Use preloading/joins for performance when N is large.</directive>
  <directive severity="medium" name="Upsert with Latest-Wins">For enrichment records that may be re-processed, use UPSERT (ON CONFLICT DO UPDATE) with ALL diagnostic columns in the update list. Latest write wins — no COALESCE preservation of old values. This ensures re-enrichment always overwrites with fresh data.</directive>
  <directive severity="low" name="Composite Key Design">Enrichment/link records use composite keys: `(groupId, entityId, documentId)` or `(correlationRowId, linkedRowId)`. Add UNIQUE constraint with ON CONFLICT DO NOTHING for idempotent link creation.</directive>
</directives>

<handler-anatomy>
  <pattern name="Standard CRUD+ Handler Set">
    <endpoint>POST   /:parent_id/entities/upload — Upload (parse + persist + trigger async)</endpoint>
    <endpoint>POST   /:parent_id/entities/enrich — Re-trigger enrichment</endpoint>
    <endpoint>GET    /:parent_id/entities/rows — List with filters/search/sort/pagination</endpoint>
    <endpoint>GET    /:parent_id/entities/rows/:id — Detail with nested links</endpoint>
    <endpoint>GET    /:parent_id/entities/rows/:id/links — Forward link lookup</endpoint>
    <endpoint>GET    /:parent_id/entities/:type/rows/:id/reverse-links — Reverse lookup</endpoint>
    <endpoint>PATCH  /:parent_id/entities/rows/:id — Update fields</endpoint>
    <endpoint>DELETE /:parent_id/entities/rows/:id — Delete (soft or hard)</endpoint>
  </pattern>
</handler-anatomy>

<enrichment-flow>
  ```
  Upload Handler (sync, fast)
  ├── Validate file/payload
  ├── Parse into row records
  ├── BEGIN transaction
  │   ├── Create parent record (Upload)
  │   └── Batch insert row records
  ├── COMMIT
  └── go enrichmentSvc.EnrichRows(ctx, ...) ← async, non-blocking

  Enrichment Worker (async, long-running)
  ├── Query rows by (parentId, docType, uploadId)
  ├── for each row:
  │   ├── rateLimiter.Wait(ctx) ← respect rate limits
  │   ├── Build external API query (URL + filters)
  │   ├── Call external API with retry + classification
  │   ├── Process response (create links, extract fields)
  │   ├── Update row status in DB
  │   └── Emit SSE event: "row_enriched"
  └── Emit SSE: "enrichment_complete" { total, succeeded, failed }
  ```
</enrichment-flow>

<checklist>
  <check>Upload returns immediately (202), enrichment is async</check>
  <check>Rate limiter guards external API calls in loops</check>
  <check>SSE events emitted per-item and on batch completion</check>
  <check>Both forward AND reverse link lookups implemented</check>
  <check>Handler function + router wiring + permission middleware all present</check>
  <check>Upsert with latest-wins for re-enrichment idempotency</check>
  <check>Composite keys with unique constraints for link records</check>
  <check>Error isolation: one item failure doesn't stop batch</check>
</checklist>
