# Document Naming Pre-Computation Protocol

Loaded by: team-lead before spawning any document-producing agent.

Team Lead pre-computes exact filenames BEFORE spawning. Agents receive concrete names — never `[doc-index]` placeholders.

## Steps

1. List spec directory; find highest existing `[XX]` prefix.
2. Next index = max + 1, zero-padded to 2 digits.
3. For multi-doc stages, pre-allocate consecutive indices.
4. Use canonical suffixes from team-lead lookup table — NEVER derive from stage display name.
5. Pass EXACT filenames to agents via `OUTPUT FILENAME` in spawn prompts.
6. Doc-validator receives same filenames and verifies (not renames).

## Canonical suffixes (lookup table)

| Stage | Suffixes |
|-------|----------|
| 2 | `requirements.md`, `bdd-scenarios.md` |
| 3 | `research-report.md`, `deep-research-report-N.md` (N = iteration) |
| 4 | `debug-analysis.md` |
| 5 | `code-assessment.md` |
| 6 | `architecture.md`, `ui-ux-design.md`, `product-design-summary.md` |
| 7 | `specification.md`, `implementation-plan.md`, `task-list.md` |
| 8 | `spec-review.md` |
| 9 | `implementation-summary.md`, `qa-report.md`, `e2e-report.md` |
| 10 | `code-review.md`, `adversarial-review.md` |
| 11 | `handoff.md` |

Example: empty directory, Stage 2 → `01-requirements.md`, then `02-bdd-scenarios.md`.
