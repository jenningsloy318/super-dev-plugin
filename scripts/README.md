# Scripts

Quality gate scripts and utilities for the super-dev workflow.

## Gate Scripts (`gates/`)

Quality gates that verify workflow stage completion:

| Script | Purpose |
|--------|---------|
| `gate-bdd.sh` | Validate BDD scenarios |
| `gate-build.sh` | Verify build passes |
| `gate-docs-drift.sh` | Check documentation drift |
| `gate-implementation-complete.sh` | Verify implementation completeness |
| `gate-lib.sh` | Library utilities for gates |
| `gate-requirements.sh` | Validate requirements |
| `gate-review.sh` | Code review gate |
| `gate-spec-review.sh` | Specification review gate |
| `gate-spec-trace.sh` | Specification traceability |

## Utilities

| Script | Purpose |
|--------|---------|
| `usage-tracker.sh` | Track workflow usage metrics |
| `setup-codex-agents.sh` | Install agents for OpenAI Codex |

## MCP Tools (Direct Access)

Research and search tools are accessed directly via MCP — no wrapper scripts needed:

- **Exa**: `mcp__exa__web_search_exa`
- **DeepWiki**: `mcp__deepwiki__ask_question`, `mcp__deepwiki__read_wiki_structure`, `mcp__deepwiki__read_wiki_contents`
- **Context7**: `mcp__context7__resolve-library-id`, `mcp__context7__query-docs`
- **GitHub**: `mcp__github__search_code`, `mcp__github__search_repositories`, `mcp__github__get_file_contents`
