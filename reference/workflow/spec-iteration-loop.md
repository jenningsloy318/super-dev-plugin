# Spec Iteration Loop Protocol (Stage 7/8)

Loaded by: team-lead when Stage 8 spec-reviewer reports issues OR `gate-spec-review.sh` fails.

## STOP — FREEZE

**Do NOT open any spec file with Edit or Write.** The Team Lead's ONLY action is to follow steps below. This FREEZE rule is non-negotiable: direct edits by team-lead bypass spec-writer's structured authoring and break traceability.

## Steps

1. **Trigger** — Stage 8 spec-reviewer reports issues OR `gate-spec-review.sh` fails.
2. **Spawn fix** — Spawn spec-writer + doc-validator (parallel) with reviewer findings as input. **Quote the reviewer's findings verbatim** in the prompt — do not paraphrase.
3. **Re-review** — After spec-writer completes, spawn spec-reviewer + doc-validator (parallel) again.
4. **Exit criteria** — Loop exits when: spec-reviewer approves AND `gate-spec-review.sh` passes.
5. **Cap** — Max 3 iterations. After 3, escalate to user with findings summary.
