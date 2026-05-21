## Plugin versioning rule (MUST follow)

Every modification MUST include a patch version bump in ALL platform manifests simultaneously:
- `plugin.json` (root — Antigravity IDE/CLI)
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json` (the plugin entry version)
- `.codex-plugin/plugin.json`

Bump the patch level (e.g., `2.4.14 → 2.4.15`) and include ALL four files in the same commit. ALL four manifest versions MUST always match.

**Commit immediately after each bump** — never accumulate multiple version bumps in uncommitted state. Each logical change group gets its own version bump AND its own commit before starting the next group.

## Project-specific notes

- This is a multi-platform agent plugin (Claude Code, Codex CLI, Antigravity IDE/CLI). Edits to the Claude version under `agents/*.md` and `skills/super-dev/SKILL.md` usually need a mirror edit under `.codex/agents/*.toml` for parity.
- **No backward compatibility** — Break old formats freely; the plugin is in active development.
- **Stage workflow**: super-dev uses Stages 1–13 (with sub-stages 2.5, 3.5, 5.3, 5.5, 10.5, 11.5). Stage numbers are referenced in many files; renumbering requires cascade-safe updates.

## Inherits from global

All generic rules (development philosophy, git workflow, github rule, refactor process, decision framework, error handling, time MCP, agent spawn) live in `~/.claude/CLAUDE.md` and apply here. Do NOT duplicate them in this file.
