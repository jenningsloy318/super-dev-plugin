---
name: super-dev
description: Multi-step development orchestrator for implementing features, fixing bugs, refactoring, optimizing performance, and resolving deprecations
author: Jennings Liu
version: 2.4.18
license: MIT
---

<platform-paths>
  PLUGIN_ROOT:
    claude: ${CLAUDE_PLUGIN_ROOT}
  PLUGIN_DATA:
    claude: ${CLAUDE_PLUGIN_DATA}
  Use whichever value resolved to an actual path (not a literal variable name).
</platform-paths>

<purpose>Team Lead agent team workflow. The Team Lead orchestrates specialized agent teammates — it NEVER implements directly, only spawns, coordinates, and verifies. Agents execute research, architecture, coding, QA, code review, and documentation stages in parallel where possible.</purpose>

<triggers>Triggers on: "implement", "build", "fix bug", "refactor", "add feature", "develop this", "help me build", "add functionality", "optimize performance", "resolve deprecation", "systematic development". Do NOT trigger on: simple questions, file searches, one-off commands, code explanations, quick edits, non-development tasks.</triggers>

<note>Detailed protocols live in `${PLUGIN_ROOT}/reference/workflow/*.md` — load each one lazily at its triggering stage. See `<protocols>` block below for the file-per-process map.</note>

<workflow>
  <stage n="1" name="Specification Setup">Create worktree, spec dir, workflow JSON, agent team. MUST complete before any codebase exploration or agent spawning.</stage>
  <stage n="2" name="Requirements + BDD">Sequential: spawn requirements-clarifier + doc-validator (parallel) → after gate-requirements.sh PASS, spawn bdd-scenario-writer + doc-validator (parallel). Gates: gate-requirements.sh, gate-bdd.sh.</stage>
  <stage n="3" name="Research">Spawn research-agent. Firecrawl MCP first, then supplementary scripts. If report identifies issues/flaws/ambiguities, re-spawn research-agent in deep-research mode targeting specific issues (max 3 iterations). Present 3-5 options to user.</stage>
  <stage n="4" name="Debug Analysis">Spawn debug-analyzer. Only for bug fixes — skip otherwise.</stage>
  <stage n="5" name="Code Assessment">Spawn code-assessor. FIRST stage allowed to read/grep/explore the codebase.</stage>
  <stage n="6" name="Design">
    Route based on task type:
    - NEW feature/module → spawn architecture-designer (design from scratch: module decomposition, interfaces, ADRs, evaluation matrix)
    - IMPROVE existing code (refactor, testability, structural optimization) → spawn architecture-improver (deepening analysis: find shallow modules, Design It Twice, migration path)
    - UI ONLY → spawn ui-ux-designer
    - BOTH architecture + UI → spawn product-designer
    Selection signal: requirements doc mentions "refactor", "improve", "testability", "restructure" → architecture-improver. Otherwise → architecture-designer. Skip entirely for backend-only changes with no architecture impact.
  </stage>
  <stage n="7" name="Specification Writing">Spawn spec-writer + doc-validator (parallel). Produces specification, implementation plan, task list. Gate: gate-spec-trace.sh.</stage>
  <stage n="8" name="Specification Review">Spawn spec-reviewer + doc-validator (parallel). Reviewer MUST verify spec covers ALL requirements ACs, ALL BDD scenarios, and aligns with design decisions. Gate: gate-spec-review.sh. On failure: follow Spec Iteration Loop.</stage>
  <stage n="9" name="Implementation">Sequential TDD workflow per phase: Step 9.1 spawn tdd-guide (write failing tests from req/bdd/spec/plan/tasks) → Step 9.2 spawn domain specialist (make tests pass, produce `*-implementation-summary.md`) → Step 9.3 spawn qa-agent (run tests, verify coverage, report) → Step 9.4 spawn e2e-runner (E2E tests, Web/UI only — skip for backend-only/CLI/library). Each step MUST complete before the next begins. Gate: gate-build.sh. Loops through ALL implementation-plan phases via Implementation Completeness Loop.</stage>
  <stage n="10" name="Code Review">Spawn code-reviewer + adversarial-reviewer + 2x doc-validator (4 parallel). Gate: gate-review.sh. On failure: follow Implementation Iteration Loop.</stage>
  <stage n="11" name="Documentation">Sequential: spawn docs-executor → WAIT for `DOCS_COMPLETE` signal or agent termination → run gate-docs-drift.sh → spawn handoff-writer → WAIT for completion. Skip handoff-writer ONLY if all stages completed in a single session (no continuation needed). MANDATORY — do not skip docs-executor.</stage>
  <stage n="12" name="Cleanup & Confirmation">Verify all teammates terminated. Spawn build-cleaner agent to detect project type and clean build artifacts/caches (e.g., cargo clean, rm node_modules, etc.). Worktree preserved. Then present summary to user for confirmation before merge.</stage>
  <stage n="13" name="Commit and Merge">Git operations: commit spec directory + code, merge to main. Verify completion; worktree preserved for reference.</stage>
</workflow>

<protocols>
  Lazy-loaded per-process protocol files. Read each one at its triggering stage — NOT at workflow start.

  <protocol stage="1" file="reference/workflow/specification-setup.md">Spec index, worktree creation, tracking JSON format. Read at Stage 1 entry.</protocol>
  <protocol stage="1" file="reference/workflow/first-run-config.md">Project stack auto-detect and config write. Read once on first run per project.</protocol>
  <protocol stage="2,3,4,5,6,7,8,9,10,11" file="reference/workflow/document-naming.md">Pre-compute exact filenames before spawning writers. Canonical suffix table. Read before any document-producing spawn.</protocol>
  <protocol stage="2,3,7,8,9,10,11" file="reference/workflow/verification-gates.md">Gate execution and failure handling. Read before first gate of the workflow.</protocol>
  <protocol stage="7,8" file="reference/workflow/spec-iteration-loop.md">Read ONLY when spec-reviewer rejects or gate-spec-review.sh fails.</protocol>
  <protocol stage="9" file="reference/workflow/implementation-completeness-loop.md">Per-phase TDD sequence and completeness enforcement. Read at Stage 9 entry.</protocol>
  <protocol stage="9,10" file="reference/workflow/implementation-iteration-loop.md">Read ONLY when code-reviewer ≠ "Approved" or adversarial-reviewer returns REJECT.</protocol>
  <protocol stage="3" file="reference/workflow/research-deep-dive-loop.md">Read ONLY when Stage 3 research flags issues/flaws/ambiguities.</protocol>
</protocols>

<gate-map>
  Gate scripts: `${PLUGIN_ROOT}/scripts/gates/<name>.sh <spec-dir>`. Exit 0 = PASS, 1 = FAIL. **NON-NEGOTIABLE — fail = loop and fix.** Detail: see `reference/workflow/verification-gates.md`.

  | After | Script | Run by | Checks |
  |---|---|---|---|
  | 2 (req → bdd) | `gate-requirements.sh` | doc-validator | ACs, NFRs, summary |
  | 2 → 3 | `gate-bdd.sh` | doc-validator | SCENARIO-IDs, Given/When/Then, AC traceability |
  | 7 → 8 | `gate-spec-trace.sh` | doc-validator | Spec refs BDD scenarios, testing strategy |
  | 8 → 9 | `gate-spec-review.sh` | doc-validator | Review verdict, 8 dimensions, grounding |
  | 9 → 10 | `gate-build.sh` | team-lead | Build, tests, type checks |
  | 10 → 11 | `gate-review.sh` | doc-validator | Code review approved, adversarial PASS |
  | 10 → 11 | `gate-implementation-complete.sh` | team-lead | ALL implementation-plan phases complete |
  | 11 (docs → handoff) | `gate-docs-drift.sh` | team-lead | Docs exist, no excessive TODOs |
</gate-map>

<process name="Worktree Enforcement (PRE-STAGE GATE)">

  At the START of every stage (Stage 2 onwards), before ANY action:

  <step n="1" name="Read WORKTREE_PATH">Read `worktreePath` from the workflow tracking JSON. This is the absolute path (e.g., `/home/user/project/.worktree/22-add-auth`). Store as WORKTREE_PATH for this stage.</step>
  <step n="2" name="Verify Exists">Run: `test -d "$WORKTREE_PATH"`. If fails → ABORT: "WORKTREE VIOLATION: $WORKTREE_PATH does not exist. Run Stage 1 first."</step>
  <step n="3" name="Prefix All Commands">Every Bash command in Stage 2+ MUST use: `cd $WORKTREE_PATH && <command>`. No exceptions. This ensures even if shell state resets between calls, you always land in the worktree.</step>
  <step n="4" name="Absolute Paths Only">ALL file paths passed to agents or used in Read/Write/Edit MUST be absolute paths starting with $WORKTREE_PATH. Relative paths are FORBIDDEN — they resolve against the wrong root.</step>

  This applies to ALL stages ≥2, not just agent spawning. File reads, greps, builds, commits — everything must happen inside the worktree. Wrong pwd means wrong relative paths for gate scripts, specs, and agent work.
</process>

<process name="Stage Transition Protocol (MANDATORY)">
  At EVERY stage transition, the Team Lead MUST update the workflow tracking JSON with BOTH status changes atomically:

  <step n="1" name="Terminate Previous Agents">Terminate ALL sub-agents spawned during the finishing stage. Verify none are still running before proceeding. Exception: Stage 9/10 parallel agents — wait for ALL to complete first, then terminate together.</step>
  <step n="2" name="Complete Previous">Set the finishing stage's `status` to `"complete"` and `completedAt` to the current ISO 8601 timestamp (seconds precision). Exception: if the stage was skipped, set `status` to `"skipped"` instead.</step>
  <step n="3" name="Start Next">Set the next stage's `status` to `"in_progress"` and `startedAt` to the current ISO 8601 timestamp (seconds precision).</step>
  <step n="4" name="Single Update">Both changes MUST happen in a single JSON write — never leave the tracking file in a state where the previous stage is still `"in_progress"` while the new stage has also started.</step>

  This applies to ALL stage transitions (1→2, 2→3, 3→4, etc.), not just implementation phases. Skipping a stage (e.g., Stage 4 for non-bug work) still requires marking it `"skipped"` before advancing.

  Violation: If a new stage begins without the previous stage being marked `"complete"` or `"skipped"`, the workflow tracking is INVALID and must be corrected immediately.
</process>

<process name="Domain-Aware Agent Routing">
  For Stage 9, spawn domain specialists directly instead of dev-executor:
  <route domain="Rust" agent="rust-developer" />
  <route domain="Go" agent="golang-developer" />
  <route domain="Frontend" agent="frontend-developer" />
  <route domain="Backend" agent="backend-developer" />
  <route domain="iOS" agent="ios-developer" />
  <route domain="Android" agent="android-developer" />
  <route domain="Windows" agent="windows-app-developer" />
  <route domain="macOS" agent="macos-app-developer" />
  <route domain="Unknown" agent="dev-executor" />
</process>

<criteria name="Success">
  <criterion name="Outcome">Feature/fix works correctly. All tests pass with new coverage. Code review resolves all Critical/High/Medium to zero. BDD scenario coverage 100%. Documentation updated. Handoff document generated.</criterion>
  <criterion name="Efficiency">Stage iteration loops less than 3. ALL implementation-plan phases completed. Teammates terminated immediately after completion. Team Lead never performs agent work directly.</criterion>
  <criterion name="Style">Git worktree with matching branch name. Spec directory structure followed. Workflow tracking JSON maintained. Commit messages follow conventions. All work inside worktree.</criterion>
</criteria>

<constraints>
  <constraint name="Worktree-Only Modifications">NEVER modify files in the main repo. ALL file operations MUST use absolute paths starting with WORKTREE_PATH. Only exception: Stage 1 scanning main repo's specification/ for next index (read-only). Stage 13 merges to main.</constraint>
  <constraint name="Iteration Rules">Stage 7/8: follow `spec-iteration-loop.md`. Stage 9/10: follow `implementation-completeness-loop.md` + `implementation-iteration-loop.md`. Both: max 3 iterations, spawn sub-agents for fixes, escalate after 3.</constraint>
  <constraint name="Version Bump">Every modification to super-dev-plugin files requires patch version bump in plugin.json and marketplace.json.</constraint>
  <constraint name="Stage 1 Gate">Stage 1 MUST complete before ANY exploration, code reading, grep, glob, research, or agent spawning.</constraint>
  <constraint name="No Early Code Analysis">Do NOT read code or explore the codebase before Stage 5. Stages 1-4 work from requirements and research only.</constraint>
  <constraint name="Parallel Doc-validator Rule">Stages 2, 7, 8, 10: ALWAYS spawn doc-validator alongside writer/reviewer.</constraint>
  <constraint name="MANDATORY Stage 11-13 Transition">Execute in strict order: Stage 11 (docs-executor → gate-docs-drift.sh → handoff-writer) → Stage 12 (cleanup + user confirmation) → Stage 13 (commit + merge). Skipping is a CRITICAL violation.</constraint>
  <ref>Team Lead operational constraints (worktree paths in spawn prompts, cd-prefix, delegation mode, implementation completeness, teammate termination) live in `agents/team-lead.md` — not duplicated here.</ref>
</constraints>

<rules>
  <rule name="agent-team" mandatory="true">ALL work MUST use agent team. Create team via TeamCreate before spawning any agents, and persist the team name to `team.name` in the workflow tracking JSON.</rule>
  <rule name="team-name-on-spawn" mandatory="true">EVERY Agent tool call MUST pass `team_name` (the value of `team.name` from the workflow tracking JSON). Spawning teammates as direct sub-agents — without `team_name` — is forbidden. If `team.name` is unset, complete Stage 1 setup before any spawn.</rule>
  <rule name="team-lead-delegation" mandatory="true">Team Lead NEVER implements directly. Only assigns tasks, spawns agents, coordinates, and verifies output.</rule>
  <ref>Generic dev rules (git-workflow, coding-style, testing, security, agents, patterns, performance, rust-project) live in `${PLUGIN_ROOT}/rules/*.md` and are loaded automatically.</ref>
</rules>

<references>
  <ref>Plugin root: `${PLUGIN_ROOT}` — agents, commands, rules, skills, templates, scripts</ref>
  <ref>Plugin data: `${PLUGIN_DATA}` — global stats, learned patterns, autoresearch results</ref>
  <ref>Per-process protocols: `${PLUGIN_ROOT}/reference/workflow/*.md` — see `<protocols>` block above</ref>
  <ref>Compatibility: Claude Code CLI, Codex CLI, or Antigravity IDE/CLI. Git required for worktree management.</ref>
</references>
