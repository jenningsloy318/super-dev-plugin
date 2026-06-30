---
name: error-classification
description: "Error handling in service pipelines — retriable vs terminal errors, backoff strategies, error persistence, and timeout budgeting"
---

<purpose>Enforce structured error handling for any code that makes external calls (HTTP APIs, databases, message queues). Derived from production OData enrichment pipeline handling millions of rows with rate limiting, retry, and per-row error persistence.</purpose>

<directives>
  <directive severity="critical" name="Classify Every Error Path">Every external call MUST have explicit error classification: retriable (network glitch, timeout, rate limit, 5xx) vs terminal (bad input 400, auth failure 401 without refresh, not found 404). NEVER catch-all with a single error handler that retries everything.</directive>
  <directive severity="critical" name="Retriable Error Set is Explicit">Define retriable HTTP status codes as a constant set: `{408, 425, 429, 500, 502, 503, 504}`. Everything else in 4xx is terminal by default. 401 gets ONE refresh-retry, then terminal. This set MUST be documented and reviewable.</directive>
  <directive severity="high" name="Backoff with Full Jitter">Retry backoff MUST use full-jitter exponential: `sleep = random(0, min(cap, base * 2^attempt))`. Fixed schedule `[250ms, 1s, 4s]` is acceptable for 3-retry scenarios. NEVER use fixed delays (thundering herd) or unbounded exponential (starvation).</directive>
  <directive severity="high" name="One Persistence Record Per Error Path">Every classified error MUST produce exactly ONE observability/persistence record containing: outcome classification string, HTTP status, failure reason text, and diagnostic context. No silent swallowing. No duplicate records from retry loops (only persist the FINAL outcome).</directive>
  <directive severity="high" name="Timeout Budget Accounting">When setting context/request timeouts, account for ALL inner operations: `outer_timeout > (inner_http_timeout × max_retries) + backoff_budget + processing_overhead`. A row-level timeout of 30s with a 35s HTTP deadline + 3 retries will ALWAYS timeout. Budget explicitly.</directive>
  <directive severity="medium" name="Error Envelope Parsing">When an API returns structured error bodies (OData error, JSON API errors, GraphQL errors), parse the envelope to extract the error code/message. Use parsed code for classification (`odata_error_{code}`) rather than just HTTP status. Fall back to generic `http_error_{status}` if body is unparseable.</directive>
  <directive severity="medium" name="Auth Refresh on 401">On HTTP 401, attempt ONE token refresh before failing. After refresh, retry the original request once. If still 401, classify as terminal auth failure. This is the E16 pattern: refresh + 1 extra attempt.</directive>
  <directive severity="medium" name="Rate Limit Respect">On HTTP 429, read `Retry-After` header if present. If absent, use exponential backoff. If rate-limited N times consecutively, reduce request rate for the remainder of the batch (adaptive throttling).</directive>
  <directive severity="low" name="Error Isolation Between Items">When processing N items in a batch, one item's failure MUST NOT prevent other items from processing. Each item gets its own error context. Aggregate failures are reported after all items complete (not fail-fast on first error).</directive>
</directives>

<detection-patterns>
  <pattern name="Catch-All Retry" severity="critical">
    <signature>catch (error) { retry() } — retries ALL errors including terminal ones</signature>
    <fix>Add error classification before retry decision: if isRetriable(error) { retry() } else { fail(error) }</fix>
  </pattern>
  <pattern name="Fixed Delay Retry" severity="high">
    <signature>await sleep(1000) between retries — no jitter, no backoff</signature>
    <fix>Use exponential backoff with jitter: sleep(random(0, base * 2^attempt))</fix>
  </pattern>
  <pattern name="Timeout Budget Violation" severity="high">
    <signature>Context timeout ≤ (HTTP timeout × retries). Inner operation can exceed outer budget.</signature>
    <fix>Ensure: contextTimeout > httpTimeout × maxRetries + totalBackoff + 5s safety margin</fix>
  </pattern>
  <pattern name="Silent Error Swallowing" severity="high">
    <signature>catch (error) { log.debug(error) } — no persistence, no metric, easily missed</signature>
    <fix>Every error path produces a structured record: { outcome, status, reason, timestamp }</fix>
  </pattern>
  <pattern name="Fail-Fast Batch" severity="medium">
    <signature>for item in items { result = process(item); if err { return err } } — one failure stops all</signature>
    <fix>Collect errors per item, continue processing remaining items, report aggregate at end</fix>
  </pattern>
</detection-patterns>

<checklist>
  <check>Every external call has explicit retriable vs terminal classification</check>
  <check>Retry uses exponential backoff with jitter (not fixed delays)</check>
  <check>Max retry count is bounded (typically 3)</check>
  <check>Context timeout budgets inner operations correctly</check>
  <check>Every error path produces exactly one persistence/observability record</check>
  <check>401 triggers one refresh-retry before failing</check>
  <check>Batch processing continues on individual item failure</check>
  <check>Structured error bodies are parsed for richer classification</check>
</checklist>
