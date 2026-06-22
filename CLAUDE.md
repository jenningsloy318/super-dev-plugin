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
- **Workflow engine**: on Claude Code v2.1.178+ the super-dev pipeline runs as a Dynamic Workflow at `scripts/workflow/super-dev.workflow.js` (entry script + JSON schemas + git helpers). The 13-stage prose in `skills/super-dev/SKILL.md` is the contract both the workflow and the Team Lead narrated fallback implement. See `scripts/workflow/README.md` for layout.
- **No backward compatibility** — Break old formats freely; the plugin is in active development.
- **Stage workflow**: super-dev uses Stages 1–13 (with sub-stages 2.5, 3.5, 5.3, 5.5, 10.5, 11.5). Stage numbers are referenced in many files; renumbering requires cascade-safe updates AND a matching update to `scripts/workflow/super-dev.workflow.js` (`meta.phases` + `phase()` calls).

## Agent capabilities (v2.4.31)

Each agent has been enhanced with 2026 best practices. Highlights:

- **search-agent** — community mode (Reddit/HN/forums), ai-docs mode, momentum scoring, emerging consensus detection
- **research-agent** — 4-pass pipeline: community discovery, AI doc traversal, innovation discovery, internal improvement suggestions
- **requirements-clarifier** — interview pattern, ambiguity detection, context retrieval
- **bdd-scenario-writer** — quality self-scoring, edge case generation, coverage metrics
- **debug-analyzer** — hypothesis trees, chain-of-thought debugging, reproduction scripts, root-cause isolation
- **code-assessor** — architecture smells, dependency health scoring, technical debt quantification, pattern library
- **architecture-designer** — AI-aware patterns, token budget, parallelism annotation, research-informed design
- **architecture-improver** — subagent exploration, community-informed refactoring, research-grounded decisions
- **spec-writer** — task DAG format, agent-friendly decomposition, complexity-adaptive, parallelism by design
- **spec-reviewer** — 100% AC coverage, grounding scores, anti-pattern verification, cross-reference verification
- **code-reviewer** — coverage-first, OWASP 2025, dimension scoring, community-informed review
- **adversarial-reviewer** — CONTEST verdict, context-window-abuse lens, agent-coordination-failure lens, calibrated severity
- **tdd-guide** — incremental verification, anti-hardcoding, feature-by-feature commits, quality gates
- **qa-agent** — traceability over pass/fail, coverage-first verification, regression detection, BDD mapping
- **docs-executor** — docs-with-code, changelog automation, AI-optimized documentation
- **build-cleaner** — intelligent detection, sensitive data scan, project-type patterns
- **team-lead** — competing-hypotheses guidance for research and debug stages

## Inherits from global

All generic rules (development philosophy, git workflow, github rule, refactor process, decision framework, error handling, time MCP, agent spawn) live in `~/.claude/CLAUDE.md` and apply here. Do NOT duplicate them in this file.
