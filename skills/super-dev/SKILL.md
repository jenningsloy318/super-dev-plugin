---
name: super-dev
description: Multi-step development orchestrator for implementing features, fixing bugs, refactoring, optimizing performance, and resolving deprecations
author: Jennings Liu
version: 2.4.13
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

<workflow>
  <stage n="1" name="Specification Setup">Create worktree, spec dir, workflow JSON, agent team. MUST complete before any codebase exploration or agent spawning.</stage>
  <stage n="2" name="Requirements Clarification">Spawn requirements-clarifier + doc-validator (parallel). Gate: gate-requirements.sh.</stage>
  <stage n="2.5" name="BDD Scenarios">Spawn bdd-scenario-writer + doc-validator (parallel). Gate: gate-bdd.sh.</stage>
  <stage n="3" name="Research">Spawn research-agent. Firecrawl MCP first, then supplementary scripts. Present 3-5 options to user.</stage>
  <stage n="3.5" name="Deep Research">Conditional: only if Stage 3 report identifies issues, flaws, or ambiguities. Spawn research-agent in deep-research mode targeting specific issues. Loop until all issues are clearly understood (max 3 iterations).</stage>
  <stage n="4" name="Debug Analysis">Spawn debug-analyzer. Only for bug fixes — skip otherwise.</stage>
  <stage n="5" name="Code Assessment">Spawn code-assessor. FIRST stage allowed to read/grep/explore the codebase.</stage>
  <stage n="5.3" name="Architecture">
    Route based on task type:
    - NEW feature/module → spawn architecture-designer (design from scratch: module decomposition, interfaces, ADRs, evaluation matrix)
    - IMPROVE existing code (refactor, testability, structural optimization) → spawn architecture-improver (deepening analysis: find shallow modules, Design It Twice, migration path)
    - UI ONLY → skip to 5.5
    - BOTH architecture + UI → spawn product-designer (5.4)
    Selection signal: requirements doc mentions "refactor", "improve", "testability", "restructure" → architecture-improver. Otherwise → architecture-designer.
  </stage>
  <stage n="5.5" name="UI/UX Design">Spawn ui-ux-designer. Only if UI feature.</stage>
  <stage n="6" name="Specification Writing">Spawn spec-writer + doc-validator (parallel). Produces specification, implementation plan, task list. Gate: gate-spec-trace.sh.</stage>
  <stage n="7" name="Specification Review">Spawn spec-reviewer + doc-validator (parallel). Reviewer MUST verify spec covers ALL requirements ACs, ALL BDD scenarios, and aligns with architecture/UI design decisions. Gate: gate-spec-review.sh. On failure: follow Spec Iteration Loop.</stage>
  <stage n="8" name="Implementation">Sequential TDD workflow per phase: Step 8.1 spawn tdd-guide (write failing tests from req/bdd/spec/plan/tasks) → Step 8.2 spawn domain specialist (make tests pass, produce `*-implementation-summary.md`) → Step 8.3 spawn qa-agent (run tests, verify coverage, report) → Step 8.4 spawn e2e-runner (E2E tests, Web/UI only — skip for backend-only/CLI/library). Each step MUST complete before the next begins. Gate: gate-build.sh. Loops through ALL implementation-plan phases via Implementation Completeness Loop.</stage>
  <stage n="9" name="Code Review + Adversarial Review">Spawn code-reviewer + adversarial-reviewer + 2x doc-validator (4 parallel). Gate: gate-review.sh. On failure: follow Implementation Iteration Loop.</stage>
  <stage n="10" name="Documentation Update">Spawn docs-executor. WAIT for `DOCS_STAGE_11_COMPLETE` signal or agent termination — do NOT proceed while docs-executor is still running. Then run gate-docs-drift.sh. MANDATORY — do not skip.</stage>
  <stage n="10.5" name="Handoff Writing">Spawn handoff-writer. WAIT for completion before Stage 11. Skip ONLY if all stages completed in a single session (no continuation needed).</stage>
  <stage n="11" name="Team Cleanup">Verify all teammates terminated. Spawn build-cleaner agent to detect project type and clean build artifacts/caches (e.g., cargo clean, rm node_modules, etc.). Worktree preserved.</stage>
  <stage n="11.5" name="User Confirmation">Present summary to user for confirmation before merge.</stage>
  <stage n="12" name="Commit and Merge">Git operations: commit spec directory + code, merge to main.</stage>
  <stage n="13" name="Final Verification">Verify completion, worktree preserved for reference.</stage>
</workflow>

<processes>
  <process name="Specification Setup (Stage 1)">
    <step n="1" name="Spec Index">Scan main repo's `specification/` directory for highest `[XX]` prefix. Next index = max + 1 (zero-padded).</step>
    <step n="2" name="Spec Name">Derive from user request (e.g., "add auth" → `add-auth`). Kebab-case, lowercase.</step>
    <step n="3" name="Spec Identifier">Define as `[spec-index]-[spec-name]` (e.g., `22-xml-restructure`). Use this identifier for worktree, branch, spec directory, and all references.</step>
    <step n="4" name="Worktree">Create worktree: `git worktree add .worktree/[spec-identifier] -b [spec-identifier]`. Immediately compute and store WORKTREE_PATH as the absolute path: `WORKTREE_PATH="$(cd .worktree/[spec-identifier] && pwd)"`. Store this value in the workflow tracking JSON under `worktreePath`. ALL subsequent operations use this absolute path.</step>
    <step n="5" name="Spec Directory">Create `specification/[spec-identifier]/` INSIDE the worktree using absolute path: `mkdir -p $WORKTREE_PATH/specification/[spec-identifier]`.</step>
    <step n="6" name="Agent Team">Create team named `super-dev-[spec-name]` (e.g., `super-dev-xml-restructure`). All agents spawn into this team. Store the team name — it is written into the workflow tracking JSON in step 7 and passed as `team_name` on every Agent spawn.</step>
    <step n="7" name="Workflow JSON">Create `[spec-identifier]-workflow-tracking.json` in the worktree spec directory using template from `${PLUGIN_ROOT}/reference/workflow-tracking-template.json`. CRITICAL: `stages` MUST be a JSON array `[{id, name, status, startedAt, completedAt}, ...]` — NEVER a keyed object. Timestamps: ISO 8601 with seconds precision. Include `"worktreePath": "<absolute path>"` at the top level. MUST also populate `team.name` with the team name from step 6 — every subsequent agent spawn reads `team_name` from this field.</step>
  </process>

  <process name="First-Run Configuration">
    <step n="1" name="Detect">Derive project key: `PROJECT_NAME="$(basename "$(git rev-parse --show-toplevel)")"`. Check `${PLUGIN_DATA}/projects/${PROJECT_NAME}/config.json`.</step>
    <step n="2" name="Auto-detect">Language (package.json→Node, Cargo.toml→Rust, go.mod→Go, pyproject.toml→Python). Framework (next.config.*→Next.js, vite.config.*→Vite). Package manager (bun.lockb, pnpm-lock.yaml, yarn.lock). Test runner (jest.config.*, vitest.config.*, playwright.config.*).</step>
    <step n="3" name="Confirm and Write">Ask user to confirm detected values. Write config to `${PLUGIN_DATA}/projects/${PROJECT_NAME}/config.json` (include `project.path` for collision detection). On subsequent runs, read config silently.</step>
  </process>

  <process name="Verification Gates">
    Gate scripts in `${PLUGIN_ROOT}/scripts/gates/` exit 0 (PASS) or 1 (FAIL). Gates are NON-NEGOTIABLE — if a gate fails, loop back and fix.

    <step n="1" name="Gate Map">
      <gate after="2 → 2.5" script="gate-requirements.sh" run_by="doc-validator" checks="Acceptance criteria, NFRs, summary" />
      <gate after="2.5 → 3" script="gate-bdd.sh" run_by="doc-validator" checks="SCENARIO-IDs, Given/When/Then, AC traceability" />
      <gate after="6 → 7" script="gate-spec-trace.sh" run_by="doc-validator" checks="Spec refs BDD scenarios, testing strategy" />
      <gate after="7 → 8" script="gate-spec-review.sh" run_by="doc-validator" checks="Review verdict, 8 dimensions, grounding" />
      <gate after="8 → 9" script="gate-build.sh" run_by="team-lead" checks="Build succeeds, tests pass, type checks" />
      <gate after="9 → 10" script="gate-review.sh" run_by="doc-validator" checks="Code review approved, adversarial PASS" />
      <gate after="9 → 10" script="gate-implementation-complete.sh" run_by="team-lead" checks="ALL implementation-plan phases complete in tracking JSON" />
      <gate after="10 → 10.5" script="gate-docs-drift.sh" run_by="team-lead" checks="Docs exist, no excessive TODOs" />
    </step>
    <step n="2" name="Execution">`bash ${PLUGIN_ROOT}/scripts/gates/<gate-name>.sh <spec-dir>`</step>
    <step n="3" name="Failure Handling">Gate fails → report which checks failed → spawn appropriate agent to fix → re-run gate → proceed only on PASS (exit 0).</step>
  </process>

  <process name="Document Naming Pre-Computation">
    Team Lead pre-computes exact filenames BEFORE spawning agents. Agents receive concrete names, never `[doc-index]` placeholders.

    <step n="1">List spec directory, find highest existing `[XX]` prefix</step>
    <step n="2">Next index = max + 1 (zero-padded to 2 digits)</step>
    <step n="3">For multi-doc stages, pre-allocate consecutive indices</step>
    <step n="4">Use canonical suffixes from team-lead constraint lookup table — NEVER derive from stage display name</step>
    <step n="5">Pass EXACT filenames to agents via `OUTPUT FILENAME` in spawn prompts</step>
    <step n="6">Doc-validator receives same filenames and verifies (not renames)</step>
  </process>

  <process name="Worktree Enforcement (PRE-STAGE GATE)">

    At the START of every stage (Stage 2 onwards), before ANY action:

    <step n="1" name="Read WORKTREE_PATH">Read `worktreePath` from the workflow tracking JSON. This is the absolute path (e.g., `/home/user/project/.worktree/22-add-auth`). Store as WORKTREE_PATH for this stage.</step>
    <step n="2" name="Verify Exists">Run: `test -d "$WORKTREE_PATH"`. If fails → ABORT: "WORKTREE VIOLATION: $WORKTREE_PATH does not exist. Run Stage 1 first."</step>
    <step n="3" name="Prefix All Commands">Every Bash command in Stage 2+ MUST use: `cd $WORKTREE_PATH && <command>`. No exceptions. This ensures even if shell state resets between calls, you always land in the worktree.</step>
    <step n="4" name="Absolute Paths Only">ALL file paths passed to agents or used in Read/Write/Edit MUST be absolute paths starting with $WORKTREE_PATH. Relative paths are FORBIDDEN — they resolve against the wrong root.</step>

    This applies to ALL stages ≥3, not just agent spawning. File reads, greps, builds, commits — everything must happen inside the worktree. Wrong pwd means wrong relative paths for gate scripts, specs, and agent work.
  </process>

  <process name="Stage Transition Protocol (MANDATORY)">
    At EVERY stage transition, the Team Lead MUST update the workflow tracking JSON with BOTH status changes atomically:

    <step n="1" name="Terminate Previous Agents">Terminate ALL sub-agents spawned during the finishing stage. Verify none are still running before proceeding. Exception: Stage 8/9 parallel agents — wait for ALL to complete first, then terminate together.</step>
    <step n="2" name="Complete Previous">Set the finishing stage's `status` to `"complete"` and `completedAt` to the current ISO 8601 timestamp (seconds precision). Exception: if the stage was skipped, set `status` to `"skipped"` instead.</step>
    <step n="3" name="Start Next">Set the next stage's `status` to `"in_progress"` and `startedAt` to the current ISO 8601 timestamp (seconds precision).</step>
    <step n="4" name="Single Update">Both changes MUST happen in a single JSON write — never leave the tracking file in a state where the previous stage is still `"in_progress"` while the new stage has also started.</step>

    This applies to ALL stage transitions (1→2, 2→3, 3→3.5, etc.), not just implementation phases. Skipping a stage (e.g., Stage 4 for non-bug work) still requires marking it `"skipped"` before advancing.

    Violation: If a new stage begins without the previous stage being marked `"complete"` or `"skipped"`, the workflow tracking is INVALID and must be corrected immediately.
  </process>

  <process name="Domain-Aware Agent Routing">
    For Stage 8, spawn domain specialists directly instead of dev-executor:
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

  <process name="Spec Iteration Loop (Stage 6/7)">
    <step n="1" name="Trigger">Stage 7 spec-reviewer reports issues or gate-spec-review.sh fails.</step>
    <step n="2" name="STOP">FREEZE — Do NOT open any spec file with Edit or Write. The Team Lead's ONLY action is to follow steps 3-5.</step>
    <step n="3" name="Spawn Fix">Team Lead spawns spec-writer + doc-validator (parallel) with reviewer findings as input. Include exact quotes from the reviewer's findings in the prompt.</step>
    <step n="4" name="Re-review">After spec-writer completes, spawn spec-reviewer + doc-validator (parallel) again.</step>
    <step n="5" name="Exit Criteria">Loop exits when: spec-reviewer approves AND gate-spec-review.sh passes. Max 3 iterations. After 3: escalate to user with findings summary.</step>
  </process>

  <process name="Implementation Completeness Loop (Stage 8/9)">
    <purpose>Ensures ALL phases defined in the implementation-plan are implemented before proceeding to Stage 10. Even if the plan has only one phase, this loop verifies completion.</purpose>

    <step n="1" name="Initialize">At Stage 8 entry, Team Lead reads implementation-plan.md and task-list.md. Identify total number of implementation phases (N). Set currentPhase = 1. Update workflow tracking JSON: `implementationPhases[].status = "pending"` for all phases.</step>
    <step n="2" name="Scope Current Phase">Extract tasks belonging to the current phase from implementation-plan. Include only this phase's scope in agent spawn prompts. Update tracking: `implementationPhases[currentPhase].status = "in_progress"`.</step>
    <step n="3" name="Step 8.1 — TDD (SEQUENTIAL)">Spawn tdd-guide scoped to current phase. Provide: requirements.md, bdd-scenarios.md, specification.md, implementation-plan.md, task-list.md. tdd-guide writes failing tests (RED phase). WAIT for completion before Step 8.2.</step>
    <step n="4" name="Step 8.2 — Implementation (SEQUENTIAL)">Spawn domain specialist(s) scoped to current phase. Provide: requirements.md, bdd-scenarios.md, specification.md, implementation-plan.md, task-list.md, plus test files from Step 8.1. Specialist makes tests pass (GREEN phase) and creates/updates `*-implementation-summary.md` (APPEND new progress section per phase — never overwrite prior entries). WAIT for completion before Step 8.3.</step>
    <step n="5" name="Step 8.3 — QA Verification (SEQUENTIAL)">Spawn qa-agent. qa-agent runs all tests, verifies coverage (80%+ overall, 90%+ new code), validates BDD scenario coverage. Run gate-build.sh after qa-agent completes. If tests fail → spawn domain specialist to fix (max 2 attempts), then re-run qa-agent.</step>
    <step n="6" name="Review">Spawn code-reviewer + adversarial-reviewer + doc-validators (parallel). If review fails → follow Implementation Iteration Loop (fix loop). If review passes → continue.</step>
    <step n="7" name="Mark Complete">Update tracking: `implementationPhases[currentPhase].status = "complete"`. Increment currentPhase.</step>
    <step n="8" name="Completeness Check">
      If currentPhase > N (all phases done) → proceed to Stage 10.
      If currentPhase ≤ N (more phases remain) → go to step 2.
      CRITICAL: Do NOT proceed to Stage 10 until ALL implementation phases are complete.
    </step>

    <enforcement>
      Before transitioning from Stage 9 to Stage 10, Team Lead MUST verify:
      1. Read implementation-plan.md — count total phases
      2. Read workflow tracking JSON — verify ALL `implementationPhases[].status == "complete"`
      3. If ANY phase has status "pending" or "in_progress" → BLOCK transition, loop back to step 2
      This check is NON-NEGOTIABLE. Partial implementation is a CRITICAL violation.
    </enforcement>
  </process>

  <process name="Implementation Iteration Loop (Stage 8/9 Fix Loop)">
    <step n="1" name="Trigger">Stage 9 code-reviewer verdict is not "Approved" or adversarial-reviewer returns REJECT.</step>
    <step n="2" name="STOP">FREEZE — Do NOT open any file with Edit or Write. Do NOT run any fix command in Bash. The Team Lead's ONLY action is to follow steps 3-8.</step>
    <step n="3" name="Extract">Read the review findings from code-review and adversarial-review reports. List every finding with: file path, line number, severity, description.</step>
    <step n="4" name="Compose Prompt">Write a sub-agent prompt that includes: (a) exact file paths and line numbers from review, (b) the specific finding and why it failed, (c) the expected fix or acceptance criteria. Do NOT paraphrase — quote the reviewer's words.</step>
    <step n="5" name="Fix Tests (if needed)">If findings relate to missing/incorrect tests, spawn tdd-guide with findings. WAIT for completion.</step>
    <step n="6" name="Fix Code">Spawn domain specialist(s) with the composed prompt. Provide: requirements.md, bdd-scenarios.md, specification.md, task-list.md as reference. WAIT for completion.</step>
    <step n="7" name="QA Verify">Spawn qa-agent to run all tests and verify fixes. Run gate-build.sh after completion.</step>
    <step n="8" name="Re-review">Spawn code-reviewer + adversarial-reviewer + doc-validators (parallel) again.</step>
    <step n="9" name="Exit Criteria">Loop exits when: code-reviewer returns "Approved" (zero findings of any severity) AND adversarial-reviewer returns PASS. No partial approvals allowed — ALL findings must be resolved. Max 3 iterations per phase. After 3: escalate to user with review findings.</step>
  </process>

  <process name="Research Deep-Dive Loop (Stage 3.5)">
    <step n="1" name="Trigger">Stage 3 research report contains an ISSUES, FLAWS, AMBIGUITIES, or CONCERNS section listing unresolved items.</step>
    <step n="2" name="Extract">Team Lead reads Stage 3 report, extracts each flagged issue with: topic, description, why it's unclear, what specifically needs deeper investigation.</step>
    <step n="3" name="Spawn Deep Research">Spawn research-agent in deep-research mode. Prompt MUST include: (a) the specific issues extracted from Stage 3, (b) what is already known vs what remains unclear, (c) instruction to investigate root causes, resolution paths, and alternative approaches for each issue.</step>
    <step n="4" name="Review Output">Team Lead reads the deep-research report. Check: are all flagged issues now clearly understood? Are there new issues or ambiguities surfaced?</step>
    <step n="5" name="Loop Decision">If remaining unclear items or new ambiguities found → extract them and go to step 3 (next iteration). If all issues are clearly understood → proceed to Stage 4/6.</step>
    <step n="6" name="Exit Criteria">Loop exits when: ALL issues have clear resolution paths with sufficient evidence. Max 3 iterations. After 3: present remaining ambiguities to user for decision.</step>
    <step n="7" name="Document Naming">Each iteration produces a separate document: `[XX]-deep-research-report-N.md` where N is the iteration number (1, 2, 3). Pre-compute filenames before spawning.</step>
  </process>
</processes>

<criteria name="Success">
  <criterion name="Outcome">Feature/fix works correctly. All tests pass with new coverage. Code review resolves all Critical/High/Medium to zero. BDD scenario coverage 100%. Documentation updated. Handoff document generated.</criterion>
  <criterion name="Efficiency">Stage iteration loops less than 3. ALL implementation-plan phases completed. Teammates terminated immediately after completion. Team Lead never performs agent work directly.</criterion>
  <criterion name="Style">Git worktree with matching branch name. Spec directory structure followed. Workflow tracking JSON maintained. Commit messages follow conventions. All work inside worktree.</criterion>
</criteria>

<constraints>
  <constraint name="Worktree-Only Modifications">NEVER modify files in the main repo. ALL file operations MUST use absolute paths starting with WORKTREE_PATH. Only exception: Stage 1 scanning main repo's specification/ for next index (read-only). Stage 12 merges to main.</constraint>
  <constraint name="Iteration Rules">Stage 6/7: follow Spec Iteration Loop. Stage 8/9: follow Implementation Completeness Loop + Implementation Iteration Loop. Both: max 3 iterations, spawn sub-agents for fixes, escalate after 3.</constraint>
  <constraint name="Version Bump">Every modification to super-dev-plugin files requires patch version bump in plugin.json and marketplace.json.</constraint>
  <constraint name="Stage 1 Gate">Stage 1 MUST complete before ANY exploration, code reading, grep, glob, research, or agent spawning.</constraint>
  <constraint name="No Early Code Analysis">Do NOT read code or explore the codebase before Stage 5. Stages 1-4 work from requirements and research only.</constraint>
  <constraint name="Parallel Doc-validator Rule">Stages 2, 2.5, 6, 7, 9: ALWAYS spawn doc-validator alongside writer/reviewer.</constraint>
  <constraint name="MANDATORY Stage 10-12 Transition">Execute in strict order: Stage 10 → gate-docs-drift.sh → Stage 10.5 → Stage 11 → Stage 11.5 → Stage 12. Skipping is a CRITICAL violation.</constraint>
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
  <ref>Compatibility: Claude Code CLI, Codex CLI, or Antigravity IDE/CLI. Git required for worktree management.</ref>
</references>
