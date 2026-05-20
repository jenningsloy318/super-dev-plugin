# Verification Gates Protocol

Loaded by: team-lead before/after each gate execution.

Gate scripts live in `${PLUGIN_ROOT}/scripts/gates/`. Exit 0 = PASS, exit 1 = FAIL. **Gates are NON-NEGOTIABLE — fail = loop back and fix.**

## Execution

```bash
bash ${PLUGIN_ROOT}/scripts/gates/<gate-name>.sh <spec-dir>
```

## Failure handling

1. Report which checks failed.
2. Spawn appropriate agent to fix (spec-writer for spec gates, domain specialist for code gates, docs-executor for docs gates).
3. Re-run gate.
4. Proceed only on PASS (exit 0). Never bypass.

## Gate map (canonical)

This table is duplicated in SKILL.md for inline reference — keep both in sync.

| After transition | Script | Run by | Checks |
|---|---|---|---|
| 2 (req → bdd) | `gate-requirements.sh` | doc-validator | Acceptance criteria, NFRs, summary |
| 2 → 3 | `gate-bdd.sh` | doc-validator | SCENARIO-IDs, Given/When/Then, AC traceability |
| 7 → 8 | `gate-spec-trace.sh` | doc-validator | Spec refs BDD scenarios, testing strategy |
| 8 → 9 | `gate-spec-review.sh` | doc-validator | Review verdict, 8 dimensions, grounding |
| 9 → 10 | `gate-build.sh` | team-lead | Build succeeds, tests pass, type checks |
| 10 → 11 | `gate-review.sh` | doc-validator | Code review approved, adversarial PASS |
| 10 → 11 | `gate-implementation-complete.sh` | team-lead | ALL implementation-plan phases complete in tracking JSON |
| 11 (docs → handoff) | `gate-docs-drift.sh` | team-lead | Docs exist, no excessive TODOs |
