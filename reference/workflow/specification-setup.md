# Specification Setup Protocol (Stage 1)

Loaded by: team-lead at Stage 1 entry.

## Steps

1. **Spec Index** — Scan main repo's `specification/` for highest `[XX]` prefix. Next index = max + 1, zero-padded to 2 digits.
2. **Spec Name** — Derive from user request, kebab-case lowercase (e.g., "add auth" → `add-auth`).
3. **Spec Identifier** — `[spec-index]-[spec-name]` (e.g., `22-xml-restructure`). Used for worktree, branch, spec dir, and references.
4. **Worktree** — `git worktree add .worktree/[spec-identifier] -b [spec-identifier]`. Then compute `WORKTREE_PATH="$(cd .worktree/[spec-identifier] && pwd)"` and store as the absolute path. **ALL subsequent operations MUST use this absolute path.**
5. **Spec Directory** — `mkdir -p $WORKTREE_PATH/specification/[spec-identifier]`. Absolute path only.
6. **Agent Team** — Create team `super-dev-[spec-name]` via TeamCreate. Persist name to workflow tracking JSON `team.name`.
7. **Workflow JSON** — Create `[spec-identifier]-workflow-tracking.json` from `${PLUGIN_ROOT}/reference/workflow-tracking-template.json`.

## Workflow JSON format (CRITICAL)

- `stages` MUST be a JSON array of `{id, name, status, startedAt, completedAt}` objects — **NEVER a keyed object**.
- `implementationPhases` MUST also be a JSON array.
- Timestamps: ISO 8601 with seconds precision (e.g., `2026-05-04T14:30:25Z`).
- Top-level field `worktreePath` MUST contain the absolute worktree path.
- Top-level `team.name` MUST contain the team name from step 6.

Every subsequent agent spawn reads `team.name` from this field and passes it as `team_name`.
