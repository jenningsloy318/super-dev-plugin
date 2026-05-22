# Implementation Summary: Enhance Research and Stages

## Overview

This work enhanced the super-dev plugin by injecting domain best practices, sharper rubrics, and tighter cross-stage contracts into all 13 stages of the workflow. The enhancement spanned 16 Claude agents (`agents/*.md`), their 16 Codex mirrors (`.codex/agents/*.toml`), three reference documents under `reference/`, and the orchestrator skill (`skills/super-dev/SKILL.md`). Total impact: **36 files, +1,298 / -116 lines**.

The goal was to lift each stage from generic instructions toward concrete heuristics, citation discipline, and explicit handoff contracts so that downstream agents can rely on a known-good shape from upstream artifacts.

## Files Modified

### Reference docs (3 files)
- `reference/research-methodology.md` — **new** 108-line methodology covering source tiers, breadth-then-depth strategy, citation discipline, and stop conditions.
- `reference/research-report-template.md` — expanded with confidence levels, source-quality tiers, contradiction logging, and an evidence appendix (+105 / -2).
- `reference/workflow/research-deep-dive-loop.md` — **new** 44-line loop describing the iterative deep-dive pattern (broad scan → targeted dives → synthesis).

### Claude agents (16 files, `agents/*.md`)
- `search-agent.md` — promoted to first-class agent: source tiering, query strategy, citation requirements (+107 / negligible removals).
- `research-agent.md` — adopts deep-dive loop and confidence rubric (+12 / -1).
- `requirements-clarifier.md` — adds clarification taxonomy and ambiguity heuristics (+12).
- `bdd-scenario-writer.md` — Gherkin discipline notes (+4).
- `debug-analyzer.md` — adds first-principles triage tree, evidence ladder, root-cause vs symptom distinction (+49 / -7).
- `code-assessor.md` — adds rubric for severity, smell catalog, traceable findings (+69 / -3).
- `architecture-designer.md` — emphasises trade-off matrices and ADR pointers (+10 / -1).
- `architecture-improver.md` — incremental refactor playbook (+6 / -1).
- `spec-writer.md` — tightened contract with downstream stages (+6 / -1).
- `spec-reviewer.md` — review checklist split by concern (+11 / -1).
- `code-reviewer.md` — SOLID/security/perf rubrics, severity bands, suggested-patch format (+73 / -3).
- `adversarial-reviewer.md` — threat-model lens, attack-tree prompts (+53 / -2).
- `tdd-guide.md` — red-green-refactor invariants, test-pyramid guidance (+26 / -2).
- `qa-agent.md` — risk-based test planning, exit criteria (+26 / -2).
- `docs-executor.md` — doc-with-code rule reinforced (+8).
- `build-cleaner.md` — minor parity fixes (+5 / -1).

### Codex mirrors (16 files, `.codex/agents/*.toml`)
Each Claude agent above has a Codex twin (TOML). All 16 were updated for line-by-line behavioural parity, totalling +754 / -64 lines across the `.codex/agents/` tree.

### Orchestrator skill (1 file)
- `skills/super-dev/SKILL.md` — wiring updates so Stage references point at the enhanced agents and new reference docs (+26 / -16, mostly rewording, no stage renumbering).

## Phase Summary

1. **Foundation (3 files)** — Created `reference/research-methodology.md` and `reference/workflow/research-deep-dive-loop.md`, then upgraded `search-agent.md` to be the canonical retrieval primitive used by every research-flavoured stage.
2. **Core Research Agent (3 files)** — Hooked `research-agent.md` into the new methodology and template; expanded `research-report-template.md` with confidence/source-tier sections.
3. **Analysis Agents (4 files)** — Sharpened `requirements-clarifier`, `bdd-scenario-writer`, `debug-analyzer`, `code-assessor` with concrete rubrics and decision trees.
4. **Design & Spec Agents (4 files)** — Tightened `architecture-designer`, `architecture-improver`, `spec-writer`, `spec-reviewer` around trade-off articulation and downstream-contract clarity.
5. **Review Agents (4 files)** — Added severity bands and structured-finding formats to `code-reviewer`, `adversarial-reviewer`, `tdd-guide`, `qa-agent`.
6. **Finalization Agents (3 files)** — Light parity fixes in `docs-executor`, `build-cleaner`, plus orchestrator wiring in `SKILL.md`.
7. **Codex Parity (16 files)** — Mirrored every Claude agent change into its `.codex/agents/*.toml` twin so both runtimes behave identically.

## Key Decisions

- **Reference-docs over inlining**: Methodology and the deep-dive loop live in `reference/` so multiple agents can cite them without prompt duplication.
- **Search-agent as a primitive**: Rather than teach every research-adjacent agent how to retrieve sources, retrieval logic was centralised in `search-agent.md`.
- **Rubrics, not rules**: Added severity bands, confidence levels, and source tiers (rubrics) instead of hard rules — agents retain judgement while gaining shared vocabulary.
- **No stage renumbering**: Stages 1–13 (with sub-stages 2.5, 3.5, 5.3, 5.5, 10.5, 11.5) are unchanged; the enhancement is content-only, preserving the cascade.
- **Strict Claude/Codex parity**: Every `agents/*.md` change has a matching `.codex/agents/*.toml` change in the same logical phase, per the project's multi-platform parity rule.
- **Template additions are additive**: New sections in `research-report-template.md` (confidence, source tier, contradictions, evidence appendix) extend the schema without breaking existing reports.

## Testing Notes

To verify the changes:

1. **Run the full super-dev workflow on a small feature** (`/super-dev:super-dev`) and confirm Stages 1–13 each execute without prompt errors.
2. **Spot-check Stage 3 output** — the research report should now include confidence levels, source-tier annotations, and an evidence appendix as defined in `reference/research-report-template.md`.
3. **Spot-check Stage 4 / 9 / 11** (code-assessor, code-reviewer, adversarial-reviewer) — findings should arrive with severity bands and structured fields rather than free prose.
4. **Codex parity check** — run any one of the updated agents under both Claude Code and Codex CLI; outputs should be behaviourally identical (wording may differ slightly per runtime).
5. **Diff sanity** — `git diff --stat main` should show the 36-file footprint described above; no unrelated files should be touched.
6. **Manifest version bump** — confirm all four manifests (`plugin.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`) are bumped together before merging, per the plugin versioning rule.

## Known Limitations

- **No automated regression tests for prompts**: Verification is manual. A future enhancement could snapshot stage outputs on a canonical input and diff them on each prompt change.
- **`research-methodology.md` is prescriptive but not enforced**: Agents are instructed to follow it, but there is no programmatic gate that rejects a research report missing source tiers or confidence levels.
- **Codex TOML mirrors are hand-maintained**: Drift between `agents/*.md` and `.codex/agents/*.toml` is possible. A diff-checker script would help but is out of scope here.
- **Reference doc cross-linking is one-way**: Agents link out to `reference/`, but the reference docs do not enumerate which agents consume them. Adding a "Used by" footer would aid maintenance.
- **No update to existing example specifications**: Spec artifacts under `specification/01-enhance-research-and-stages/` (e.g., `03-research-report.md`) were authored before the new template sections existed; they do not yet demonstrate the expanded schema.
- **Stage sub-numbering preserved by design**: Anyone wanting to reorganise stages (e.g., merge 5.3/5.5) still faces the project's cascade-safe-renumbering caveat — this work did not address that.
