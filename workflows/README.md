# super-dev workflow scripts

Phase B (v3.0.0) of the super-dev plugin ships its Stage 1-13 orchestration
as a Claude Code **Dynamic Workflow** script. See
`../docs/phase-b-dynamic-workflows-design.md` for the full design.

## Layout

```
workflows/
├── super-dev.workflow.js       # entry point: meta + 13-stage flow + inlined helpers
schemas/
└── *.json                      # JSON Schema for structured agent outputs
```

The workflow is invoked from the `super-dev:super-dev` skill via the harness's
`Workflow` tool. It is NOT meant to be run with `node` directly — only the
Claude Code Workflow runtime provides the `agent()`, `pipeline()`, `parallel()`
globals it uses.

The Workflow runtime requires `export const meta` to be the FIRST statement
and forbids `import` declarations, so the git-helper Bash snippets and
`shellQuote` live as plain function declarations at the bottom of
`super-dev.workflow.js` (hoisted within the module).

## Compatibility

- Requires Claude Code ≥ v2.1.178 (`scripts/utils/preflight-env.mjs` enforces this).
- No fallback path — the Workflow tool MUST be available.
