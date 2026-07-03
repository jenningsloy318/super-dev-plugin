# Scripts

Cross-platform Node.js ESM scripts for hooks, quality gates, and utilities.

## Architecture

```
scripts/
├── lib/                    ← Shared runtime modules
│   ├── hook-runtime.mjs    ← stdin JSON parser, exit helpers, createHook()
│   ├── gate-engine.mjs     ← Declarative gate executor + reporter
│   ├── fs.mjs              ← findSpecFile, findProjectRoot, glob helpers
│   ├── git.mjs             ← git() wrapper over spawnSync
│   └── toolchain.mjs       ← Detect pm/formatter/linter/test-runner
│
├── hooks/                  ← Claude Code hooks (one behavior each)
│   ├── block-dangerous.mjs ← Regex match → exit 2
│   ├── protect-files.mjs   ← Path pattern → exit 2
│   ├── stage-gate.mjs      ← Manifest + prerequisite validator
│   ├── auto-fix.mjs        ← Format + lint (merged)
│   ├── run-tests.mjs       ← Post-edit test run (opt-in)
│   ├── log-commands.mjs    ← Append audit trail
│   ├── auto-checkpoint.mjs ← git stash create on stop
│   └── require-tests-pr.mjs ← Test gate for PR creation
│
├── gates/
│   ├── definitions.mjs     ← All 14 spec gates as declarative data
│   └── runner.mjs          ← CLI: node runner.mjs <gate> <spec-dir>
│
└── utils/
    ├── gate-build.mjs      ← Project build/test runner (standalone)
    ├── gate-quality-score.mjs ← Code metrics scorer (standalone)
    ├── usage-tracker.mjs   ← Skill/agent usage logging
    ├── preflight-env.mjs   ← Claude Code version + env check
    ├── persist-memory.mjs  ← Extract workflow decisions to memory
    └── setup-codex.mjs     ← Install .codex agent configs
```

## Gate System

All 14 spec-file quality gates are defined declaratively in `gates/definitions.mjs`.
Run any gate via the unified runner:

```bash
node scripts/gates/runner.mjs <gate-name> <spec-dir-or-file>

# Available gates:
#   requirements, bdd, specification, implementation-plan, task-list,
#   spec-review, code-review, adversarial-review, implementation-summary,
#   spec-trace, docs-drift, implementation-complete, handoff, prototype, visual
```

## Hook Protocol

Hooks use the Claude Code JSON-on-stdin protocol:
- **Exit 0** = allow the action
- **Exit 2** = block the action
- Input is JSON with `tool_name` and `tool_input` fields

Hook config in settings.json:
```json
{
  "hooks": {
    "PreToolUse": [
      { "type": "command", "command": ["node", "scripts/hooks/block-dangerous.mjs"] }
    ]
  }
}
```

## MCP Tools (Direct Access)

Research and search tools are accessed directly via MCP — no wrapper scripts needed:

- **Exa**: `mcp__exa__web_search_exa`
- **DeepWiki**: `mcp__deepwiki__ask_question`, `mcp__deepwiki__read_wiki_structure`, `mcp__deepwiki__read_wiki_contents`
- **Context7**: `mcp__context7__resolve-library-id`, `mcp__context7__query-docs`
- **GitHub**: `mcp__github__search_code`, `mcp__github__search_repositories`, `mcp__github__get_file_contents`
