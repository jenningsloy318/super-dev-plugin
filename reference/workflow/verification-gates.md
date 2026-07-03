# Verification Gates Protocol

Loaded by: team-lead before/after each gate execution.

Gate scripts live in `${CLAUDE_PLUGIN_ROOT}/scripts/gates/`. Exit 0 = PASS, exit 1 = FAIL. **Gates are NON-NEGOTIABLE — fail = loop back and fix.**

## Execution

All gates are executed by **doc-validator** agents spawned by team-lead. Team-lead NEVER runs gate scripts directly — it spawns doc-validator with the appropriate `gate_profile` and waits for the PASS/FAIL signal.

```bash
# doc-validator runs this internally:
node ${CLAUDE_PLUGIN_ROOT}/scripts/gates/runner.mjs <gate-name> <spec-dir>
# For build gate: node ${CLAUDE_PLUGIN_ROOT}/scripts/utils/gate-build.mjs <worktree-path>
```

## Failure handling

1. doc-validator reports which checks failed (with fix instructions) to the responsible agent.
2. Responsible agent fixes the issue and signals doc-validator.
3. doc-validator re-runs gate. Loop max 3 iterations.
4. After 3 failures: doc-validator escalates to team-lead as VALIDATION BLOCKED.
5. Team-lead spawns appropriate fix agent or escalates to user.

## Gate map (canonical)

This table is duplicated in SKILL.md for inline reference — keep both in sync.

| After transition | Gate name | Run by | Checks |
|---|---|---|---|
| 2 (req → bdd) | `requirements` | doc-validator | Acceptance criteria, NFRs, summary |
| 2 → 3 | `bdd` | doc-validator | SCENARIO-IDs, Given/When/Then, AC traceability |
| 7 → 8 | `spec-trace` | doc-validator | Spec refs BDD scenarios, testing strategy |
| 8 → 9 | `spec-review` | doc-validator | Review verdict, 8 dimensions, grounding |
| 9 (per phase) | `build` (standalone) | doc-validator | Build succeeds, tests pass, type checks |
| 10 → 11 | `review` | doc-validator | Code review approved, adversarial PASS |
| 10 → 11 | `implementation-complete` | doc-validator | ALL implementation-plan phases complete in tracking JSON |
| 11 (docs → handoff) | `docs-drift` | doc-validator | Docs exist, no excessive TODOs |
