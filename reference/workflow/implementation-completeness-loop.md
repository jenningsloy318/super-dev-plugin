# Implementation Completeness Loop Protocol (Stage 9/10)

Loaded by: team-lead at Stage 9 entry.

**Purpose:** Ensure ALL phases defined in implementation-plan are implemented before proceeding to Stage 11. Even single-phase plans must verify completion.

## Steps

1. **Initialize** — Read implementation-plan.md and task-list.md. Identify total phases (N). Set `currentPhase = 1`. Update tracking JSON: `implementationPhases[].status = "pending"` for all.
2. **Scope current phase** — Extract tasks for `currentPhase`. Include only this phase's scope in spawn prompts. Update tracking: `implementationPhases[currentPhase].status = "in_progress"`.
3. **Step 9.1 — TDD (sequential)** — Spawn tdd-guide scoped to current phase. Provide: requirements.md, bdd-scenarios.md, specification.md, implementation-plan.md, task-list.md. tdd-guide writes failing tests (RED). WAIT before 9.2.
4. **Step 9.2 — Implementation (sequential)** — Spawn domain specialist(s). Provide same docs + test files from 9.1. Specialist makes tests pass (GREEN) and creates/updates `*-implementation-summary.md` (**APPEND** new section per phase — never overwrite). WAIT before 9.3.
5. **Step 9.3 — QA (sequential)** — Spawn qa-agent. Runs all tests, verifies coverage (80%+ overall, 90%+ new code), validates BDD coverage. Run `gate-build.sh` after. If tests fail → spawn domain specialist to fix (max 2 attempts), then re-run qa-agent.
6. **Review** — Spawn code-reviewer + adversarial-reviewer + doc-validators (parallel). On failure → see `implementation-iteration-loop.md`. On pass → continue.
7. **Mark complete** — Update tracking: `implementationPhases[currentPhase].status = "complete"`. Increment `currentPhase`.
8. **Completeness check**:
   - `currentPhase > N` → proceed to Stage 11.
   - `currentPhase ≤ N` → loop to step 2.

**CRITICAL:** Do NOT proceed to Stage 11 until ALL phases are complete.

## ENFORCEMENT (NON-NEGOTIABLE)

Before transitioning Stage 10 → Stage 11, Team Lead MUST verify:

1. Read implementation-plan.md — count total phases.
2. Read tracking JSON — verify ALL `implementationPhases[].status == "complete"`.
3. If ANY phase has status `"pending"` or `"in_progress"` → **BLOCK transition, loop back to step 2.**

This check is NON-NEGOTIABLE. **Partial implementation is a CRITICAL violation.**
