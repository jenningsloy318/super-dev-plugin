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
  <directive severity="critical" name="Agent Teams Preflight">Stage 1 MUST run `${PLUGIN_ROOT}/scripts/preflight-env.sh` before any Agent spawn. The script verifies `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and Claude Code ≥ v2.1.178. Non-zero exit → ABORT, surface the remediation message to the user. As of v2.1.178 `TeamCreate`/`TeamDelete` have been removed: the team is created on the first Agent spawn and torn down on session exit. Pass `team_name` on every spawn for `SendMessage` coordination, but a missing value is no longer fatal — the harness derives one from the session.</directive>
  <directive severity="critical" name="Worktree-First Action">When an agent receives `worktree_path` in its spawn prompt, its FIRST action in any Bash call MUST be `cd $WORKTREE_PATH && <command>`. ALL file paths used in Read/Write/Edit MUST be absolute paths starting with the provided worktree_path. Never use relative paths — shell state does NOT persist between tool calls.</directive>
  <directive severity="high" name="Immediate agent usage">No user prompt needed: Complex features → planner, Code written/modified → code-reviewer, Bug fix or new feature → tdd-guide, New architecture → architecture-designer, Improve existing architecture → architecture-improver</directive>
  <directive severity="high" name="Parallel Task execution">ALWAYS use parallel execution for independent operations. Never run sequentially when tasks are independent.</directive>
  <directive severity="high" name="Sequential TDD workflow">Stage 9 is strictly sequential: tdd-guide (9.1) → domain specialist (9.2) → qa-agent (9.3) → e2e-runner (9.4 for Web/UI). Each step MUST complete before the next begins.</directive>
  <directive severity="critical" name="TERMINATE IMMEDIATELY AFTER COMPLETION">Verify output is complete, terminate the agent. Prevents resource accumulation. Exception: parallel agents in Stage 10 (code-reviewer + adversarial-reviewer) — wait for ALL to complete before terminating.</directive>
  <directive severity="medium" name="MCP Wrapper Scripts">Use wrapper scripts via Bash for Exa, DeepWiki, Context7, and GitHub per `${PLUGIN_ROOT}/scripts/README.md` instead of calling MCP servers directly. Exception: `mcp__time-mcp__current_time` may be called directly.</directive>
  <directive severity="medium" name="Multi-perspective analysis">For complex problems: use split role sub-agents (factual reviewer, senior engineer, security expert, consistency reviewer, redundancy checker)</directive>
</directives>
