# Specification Setup Protocol (Stage 1)

Loaded by: team-lead at Stage 1 entry.

## Steps

1. **Preflight** — Run `bash ${CLAUDE_PLUGIN_ROOT}/scripts/preflight-env.sh`. The script verifies `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and Claude Code ≥ v2.1.178. Non-zero exit → ABORT and surface the script's remediation message to the user. No Agent spawns until this passes.
2. **Pull Latest Main** — In the main repo (NOT a worktree), run `git fetch origin && git checkout <default-branch> && git pull --ff-only origin <default-branch>`. The `<default-branch>` is whichever the repo treats as its trunk (`main`, `master`, `trunk`, …) — detect with `git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`. If `pull --ff-only` fails (local commits / detached HEAD / dirty tree), ABORT and surface the actual git output to the user — do NOT auto-rebase, force-pull, or stash unilaterally. The worktree created in Step 6 must branch from a known-clean tip, otherwise downstream gates compare against stale references.
3. **Spec Index** — Scan main repo's `docs/specifications/` for highest `[XX]` prefix. Next index = max + 1, zero-padded to 2 digits.
4. **Spec Name** — Derive from user request, kebab-case lowercase (e.g., "add auth" → `add-auth`).
5. **Spec Identifier** — `[spec-index]-[spec-name]` (e.g., `22-xml-restructure`). Used for worktree, branch, spec dir, and references.
6. **Worktree** — `git worktree add .worktree/[spec-identifier] -b [spec-identifier]`. Then compute `WORKTREE_PATH="$(cd .worktree/[spec-identifier] && pwd)"` and store as the absolute path. **ALL subsequent operations MUST use this absolute path.**
7. **Spec Directory** — `mkdir -p $WORKTREE_PATH/docs/specifications/[spec-identifier]`. Absolute path only.
8. **Team Name (informational)** — Compute the conventional name `super-dev-[spec-name]` and record it as `team.name` in the workflow tracking JSON for the audit trail. As of Claude Code v2.1.178 `TeamCreate` has been removed; the team is created automatically on the first Agent spawn, and the harness derives a session team name even if `team_name` is omitted from spawn args. Passing the recorded value on every spawn keeps the audit trail consistent and enables `SendMessage` addressing.
9. **Workflow JSON** — Create `[spec-identifier]-workflow-tracking.json` from `${CLAUDE_PLUGIN_ROOT}/reference/workflow-tracking-template.json`.

## Workflow JSON format (CRITICAL)

- `stages` MUST be a JSON array of `{id, name, status, startedAt, completedAt}` objects — **NEVER a keyed object**.
- `implementationPhases` MUST also be a JSON array.
- Timestamps: ISO 8601 with seconds precision (e.g., `2026-05-04T14:30:25Z`).
- Top-level field `worktreePath` MUST contain the absolute worktree path.
- Top-level `team.name` contains the team name from step 8 (informational; the harness owns the real value as of v2.1.178).

Every subsequent agent spawn passes `team.name` as `team_name` for `SendMessage` addressing.
