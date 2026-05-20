# Implementation Iteration Loop Protocol (Stage 9/10 Fix Loop)

Loaded by: team-lead when Stage 10 code-reviewer verdict is not "Approved" OR adversarial-reviewer returns REJECT.

## STOP — FREEZE

**Do NOT open any file with Edit or Write. Do NOT run any fix command in Bash.** The Team Lead's ONLY action is to follow the steps below. Direct fixes by team-lead bypass TDD discipline and review traceability — this is a known anti-foot-gun.

## Steps

1. **Trigger** — code-reviewer verdict ≠ "Approved" OR adversarial-reviewer returns REJECT.
2. **Extract** — Read code-review and adversarial-review reports. List every finding: file path, line number, severity, description.
3. **Compose prompt** — Sub-agent prompt MUST include: (a) exact file paths and line numbers from review, (b) the specific finding and why it failed, (c) the expected fix or acceptance criteria. **Do NOT paraphrase — quote the reviewer's words.**
4. **Fix tests (if needed)** — If findings relate to missing/incorrect tests, spawn tdd-guide with findings. WAIT for completion.
5. **Fix code** — Spawn domain specialist(s) with the composed prompt. Provide: requirements.md, bdd-scenarios.md, specification.md, task-list.md as reference. WAIT for completion.
6. **QA verify** — Spawn qa-agent to run all tests and verify fixes. Run `gate-build.sh` after.
7. **Re-review** — Spawn code-reviewer + adversarial-reviewer + doc-validators (parallel) again.
8. **Exit criteria** — Loop exits when: code-reviewer returns "Approved" (zero findings of any severity) AND adversarial-reviewer returns PASS. **No partial approvals — ALL findings must be resolved.**
9. **Cap** — Max 3 iterations per phase. After 3, escalate to user with findings.
