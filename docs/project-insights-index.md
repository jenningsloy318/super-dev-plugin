# Project Insights Distillation Index

Systematic distillation of patterns from real projects to enrich super-dev plugin agents, skills, and rules.

## Batches

| Batch | Date | Source Projects | Focus Area | Status |
|-------|------|-----------------|------------|--------|
| [Batch 1](project-insights-batch1-rust-desktop.md) | 2026-06-30 | wooRDP, woo-tv, woo-launcher, woo-dock, live-Cap, termusic, Feeder | Rust/GPUI/Desktop patterns, LLM integration, performance | ✅ Rules created + wired |
| [Batch 2](project-insights-batch2-enterprise-orchestration.md) | 2026-06-30 | stock-analysis-plugin, MaCo dashboard, lib-llm-utilities, claude-skill-artifacts, context-keeper | Orchestration, enterprise patterns, AI agent meta-patterns | ✅ Rules + agents + workflow implemented |

## Rules Created from Insights

### From Batch 1:
- `rules/rust-gpui-patterns.md` — GPUI state, platform, events
- `rules/rust-performance-desktop.md` — Generation counter, pre-created window, FIFO, lock-free
- `rules/rust-async-correctness.md` (enhanced) — TaskPool, adaptive poll, periodic task
- `rules/rust-security-hardening.md` — Token bucket, SecurityGate, degradation flags, RAII
- `rules/llm-integration-patterns.md` — Parallel LLM, robust parsing, tag preservation, caching

### From Batch 2:
- `rules/error-classification.md` — Retriable vs terminal, backoff, error persistence (from MaCo OData)
- `rules/multi-file-sync.md` — Coupled file detection, atomic multi-file tasks (from MaCo RBAC)
- `rules/frontend-data-patterns.md` — Convention detection, chained filtering, pagination (from MaCo dashboard)
- `rules/enterprise-handler-patterns.md` — CRUD+, enrichment, batch upload, SSE, correlation (from MaCo SNOW)

### From Batch 2 (agents enhanced):
- `agents/backend-developer.md` — error-classification, handler patterns, multi-file-sync, api-design, config-design
- `agents/frontend-developer.md` — frontend-data-patterns, multi-file-sync
- `agents/golang-developer.md` — error-classification, handler patterns, multi-file-sync, config-design
- `agents/code-assessor.md` — expanded with all-project + per-language rules
- `agents/code-reviewer.md` — expanded with all new rules + quality score integration + test-quality + pr-readiness
- `agents/team-lead.md` — Phase-Orchestrator protocol, Bug Fix Verification Pause, Stage 10.5 Rule Evolution

## Workflow Improvements Identified

| Issue | Source | Fix Status |
|-------|--------|------------|
| Stage 10 gate loop bug (CONTEST with findings loops instead of routing to fix) | termusic session | Pending |
| Phase dependency DAG for parallel execution | stock-analysis async-pool pattern | ✅ Done (v2.5.21) |
| Post-workflow memory persistence | context-keeper hook pattern | ✅ Done (v2.5.21) |
| Cross-check script (spec vs implementation contradiction detection) | stock-analysis cross_check.py | ✅ Done (v2.5.21) |
| Never-push-before-confirm for bug fixes | MaCo feedback memory | ✅ Done (v2.5.21) |
| Rule Evolution / Autoresearch integration (Stage 10.5) | Karpathy autoresearch pattern | ✅ Done (v2.5.21) |
| Hybrid quality scoring (deterministic + LLM adjust) | stock-analysis scorer pattern | ✅ Done (v2.5.21) |
