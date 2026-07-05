# Implementation Completeness Loop Protocol (Stage 9/10)

Loaded by: team-lead at Stage 9 entry.

**Purpose:** Ensure ALL phases defined in implementation-plan are implemented before proceeding to Stage 12. Even single-phase plans must verify completion.

## Steps

1. **Initialize** — Read implementation-plan.md and task-list.md. Identify total phases (N). Set `currentPhase = 1`. Update tracking JSON: `implementationPhases[].status = "pending"` for all.
2. **Scope current phase** — Extract tasks for `currentPhase`. Include only this phase's scope in spawn prompts. Update tracking: `implementationPhases[currentPhase].status = "in_progress"`.
3. **Step 9.1 — TDD (sequential)** — Spawn tdd-guide scoped to current phase. Provide: `spec_directory` (agent reads its own input files). tdd-guide writes failing tests (RED). WAIT before 9.2.
4. **Step 9.2 — Implementation (sequential)** — Spawn domain specialist(s). Provide `spec_directory` + test files from 9.1. Specialist makes tests pass (GREEN) and creates/updates `*-implementation-summary.md` (**APPEND** new section per phase — never overwrite). WAIT before 9.3.
5. **Step 9.3 — QA (sequential)** — Spawn qa-agent. Runs all tests, verifies coverage (80%+ overall, 90%+ new code), validates BDD coverage. Then spawn doc-validator (gate-build) — WAIT for PASS. If FAIL → spawn domain specialist to fix (max 2 attempts), then re-run doc-validator (gate-build).
6. **Review** — Spawn code-reviewer + adversarial-reviewer + doc-validators (gate-review) + doc-validator (gate-implementation-complete) — all parallel. On failure → see `implementation-iteration-loop.md`. On pass → continue.
7. **Mark complete** — Update tracking: `implementationPhases[currentPhase].status = "complete"`. Increment `currentPhase`.
8. **Completeness check**:
   - `currentPhase > N` → proceed to Stage 12.
   - `currentPhase ≤ N` → loop to step 2.

**CRITICAL:** Do NOT proceed to Stage 12 until ALL phases are complete.

## ENFORCEMENT (NON-NEGOTIABLE)

Before transitioning Stage 10 → Stage 12, Team Lead MUST spawn doc-validator with `gate_profile=gate-implementation-complete`. This gate verifies:

1. Implementation-plan.md exists and has phases.
2. Tracking JSON `implementationPhases` array has matching entries.
3. ALL phases have `status == "complete"`.

If doc-validator signals FAIL → **BLOCK transition, loop back to step 2.**

Team Lead does NOT read implementation-plan or tracking JSON to verify this itself — it delegates to doc-validator and reacts to the PASS/FAIL signal. This keeps the orchestrator's context window clean.

This check is NON-NEGOTIABLE. **Partial implementation is a CRITICAL violation.**
