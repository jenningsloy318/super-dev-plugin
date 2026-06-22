# super-dev workflow scripts

Phase B (v3.0.0) of the super-dev plugin ships its Stage 1-13 orchestration
as a Claude Code **Dynamic Workflow** script. See
`../docs/phase-b-dynamic-workflows-design.md` for the full design.

## Layout

```
scripts/workflow/
├── super-dev.workflow.js       # entry point: meta + 13-stage flow
├── lib/                        # internal helpers (Stage 1 setup, git, etc.)
└── schemas/                    # JSON Schema for structured agent outputs
```

The workflow is invoked from the `super-dev:super-dev` skill via the harness's
`Workflow` tool. It is NOT meant to be run with `node` directly — only the
Claude Code Workflow runtime provides the `agent()`, `pipeline()`, `parallel()`
globals it uses.

## Compatibility

- Requires Claude Code ≥ v2.1.178 (`scripts/preflight-env.sh` enforces this).
- The Codex CLI and Antigravity platforms have no Workflow runtime; they keep
  the team-lead-narrated orchestration documented in `agents/team-lead.md`.
