# Project Insights Distillation Index

Systematic distillation of patterns from real projects to enrich super-dev plugin agents, skills, and rules.

## Batches

| Batch | Date | Source Projects | Focus Area | Status |
|-------|------|-----------------|------------|--------|
| [Batch 1](project-insights-batch1-rust-desktop.md) | 2026-06-30 | wooRDP, woo-tv, woo-launcher, woo-dock, live-Cap, termusic, Feeder | Rust/GPUI/Desktop patterns, LLM integration, performance | ✅ Rules created + wired |
| [Batch 2](project-insights-batch2-enterprise-orchestration.md) | 2026-06-30 | stock-analysis-plugin, MaCo dashboard, lib-llm-utilities, claude-skill-artifacts, context-keeper | Orchestration, enterprise patterns, AI agent meta-patterns | 🔄 Analysis complete, rules pending |

## Rules Created from Insights

### From Batch 1:
- `rules/rust-gpui-patterns.md` — GPUI state, platform, events
- `rules/rust-performance-desktop.md` — Generation counter, pre-created window, FIFO, lock-free
- `rules/rust-async-correctness.md` (enhanced) — TaskPool, adaptive poll, periodic task
- `rules/rust-security-hardening.md` — Token bucket, SecurityGate, degradation flags, RAII
- `rules/llm-integration-patterns.md` — Parallel LLM, robust parsing, tag preservation, caching

### From Batch 2 (pending creation):
- `rules/error-classification.md` — Retriable vs terminal, backoff, error persistence (from MaCo OData)
- `rules/multi-file-sync.md` — Coupled file detection, atomic multi-file tasks (from MaCo RBAC)
- `rules/frontend-data-patterns.md` — Convention detection, chained filtering, pagination (from MaCo dashboard)
- `rules/enterprise-handler-patterns.md` — CRUD+, enrichment, batch upload, SSE, correlation (from MaCo SNOW)

## Agents Enhanced from Insights

### From Batch 1:
- `agents/rust-developer.md` — mandatory-rules for GPUI, async, performance, security
- `agents/code-reviewer.md` — mandatory-rules for all 5 rule files
- `agents/code-assessor.md` — mandatory-rules for Rust rule files
- `agents/security-reviewer.md` — reference to rust-security-hardening

### From Batch 2 (pending enhancement):
- `agents/backend-developer.md` — error classification, handler patterns, enterprise auth
- `agents/frontend-developer.md` — convention detection, cascading filters, data-fetch pattern matching
- `agents/code-assessor.md` — multi-file sync-point detection, coverage audit
- `agents/team-lead.md` — phase DAG awareness, progress streaming, parallel phase spawning

## Workflow Improvements Identified

| Issue | Source | Fix Status |
|-------|--------|------------|
| Stage 10 gate loop bug (CONTEST with findings loops instead of routing to fix) | termusic session | Pending |
| Phase dependency DAG for parallel execution | stock-analysis async-pool pattern | Pending |
| Post-workflow memory persistence | context-keeper hook pattern | Pending |
| Cross-check script (spec vs implementation contradiction detection) | stock-analysis cross_check.py | Pending |
| Never-push-before-confirm for bug fixes | MaCo feedback memory | Pending |
