---
name: agents
description: Agent orchestration rules for usage, parallel execution, and termination
---

<purpose>Define rules for agent usage, parallel task execution, immediate termination after completion, and multi-perspective analysis.</purpose>

<reference name="Available Agents">
  Located in `${PLUGIN_ROOT}/agents/`:
  Writers: requirements-clarifier, bdd-scenario-writer, spec-writer, handoff-writer.
  Reviewers: spec-reviewer, code-reviewer, adversarial-reviewer.
  Researchers: research-agent, search-agent, investigator.
  Assessors: code-assessor, debug-analyzer.
  Designers: architecture-designer, architecture-improver, ui-ux-designer, product-designer.
  Implementers: dev-executor, frontend-developer, backend-developer, rust-developer, golang-developer, ios-developer, android-developer, macos-app-developer, windows-app-developer, build-error-resolver, refactor-cleaner.
  QA: qa-agent, e2e-runner, tdd-guide.
  Docs: docs-executor, doc-updater, doc-validator.
</reference>

<directives>
  <directive severity="critical" name="Team Membership">EVERY Agent tool call MUST pass `team_name` set to `team.name` from the workflow tracking JSON. Spawning a teammate without `team_name` makes it a direct sub-agent — outside the team's coordination, peer messaging, and termination — and is a CRITICAL violation. If `team.name` is empty, finish Stage 1 setup (TeamCreate + tracking JSON) before any spawn.</directive>
  <directive severity="critical" name="Worktree-First Action">When an agent receives `worktree_path` in its spawn prompt, its FIRST action in any Bash call MUST be `cd $WORKTREE_PATH && <command>`. ALL file paths used in Read/Write/Edit MUST be absolute paths starting with the provided worktree_path. Never use relative paths — shell state does NOT persist between tool calls.</directive>
  <directive severity="high" name="Immediate agent usage">No user prompt needed: Complex features → planner, Code written/modified → code-reviewer, Bug fix or new feature → tdd-guide, New architecture → architecture-designer, Improve existing architecture → architecture-improver</directive>
  <directive severity="high" name="Parallel Task execution">ALWAYS use parallel execution for independent operations. Never run sequentially when tasks are independent.</directive>
  <directive severity="high" name="Sequential TDD workflow">Stage 8 is strictly sequential: tdd-guide (8.1) → domain specialist (8.2) → qa-agent (8.3). Each step MUST complete before the next begins.</directive>
  <directive severity="critical" name="TERMINATE IMMEDIATELY AFTER COMPLETION">Verify output is complete, terminate the agent. Prevents resource accumulation. Exception: parallel agents in Stage 9 (code-reviewer + adversarial-reviewer) — wait for ALL to complete before terminating.</directive>
  <directive severity="medium" name="MCP Wrapper Scripts">Use wrapper scripts via Bash for Exa, DeepWiki, Context7, and GitHub per `${PLUGIN_ROOT}/scripts/README.md` instead of calling MCP servers directly. Exception: `mcp__time-mcp__current_time` may be called directly.</directive>
  <directive severity="medium" name="Multi-perspective analysis">For complex problems: use split role sub-agents (factual reviewer, senior engineer, security expert, consistency reviewer, redundancy checker)</directive>
</directives>
