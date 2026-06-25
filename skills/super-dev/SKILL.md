---
name: super-dev
description: Multi-step development orchestrator for implementing features, fixing bugs, refactoring, optimizing performance, and resolving deprecations
author: Jennings Liu
version: 2.4.51
license: MIT
---

<platform-paths>
  PLUGIN_ROOT:
    claude: ${CLAUDE_PLUGIN_ROOT}
  PLUGIN_DATA:
    claude: ${CLAUDE_PLUGIN_DATA}
  Use whichever value resolved to an actual path (not a literal variable name).
</platform-paths>

<purpose>13-stage development pipeline for features, bug fixes, and refactors. Runs as a Dynamic Workflow (deterministic JS orchestration) on Claude Code v2.1.178+. There is no fallback path — the Workflow tool MUST be available.</purpose>

<orchestration-model>
  **Dynamic Workflows REQUIRED** (Claude Code v2.1.178+). There is no fallback path.

  The team-lead agent invokes ONE `Workflow` tool call with `scriptPath="${PLUGIN_ROOT}/workflows/super-dev.workflow.js"` and the args. The workflow runtime executes the script in an isolated environment outside Claude's context window. Intermediate per-stage results stay in JavaScript variables inside the script — they NEVER enter the team-lead context window. Only the final compressed result returns to team-lead, which relays it to the user.

  Caps: 16 concurrent subagents / 1000 total agents per workflow run (harness-enforced).

  Benefits:
  1. Context isolation — team-lead sees only the final summary, not per-stage data.
  2. Cached resume — `Workflow({scriptPath, resumeFromRunId})` replays completed `agent()` calls instantly; only failed/new agents re-run live.
  3. Structured output — `schema:` forces validated JSON from each subagent.
  4. Built-in concurrency + token-budget management via `budget` global.
  5. Progress streaming via `/workflows` view + `log()` + `phase()` markers.
</orchestration-model>

<triggers>Triggers on: "implement", "build", "fix bug", "refactor", "add feature", "develop this", "help me build", "add functionality", "optimize performance", "resolve deprecation", "systematic development". Do NOT trigger on: simple questions, file searches, one-off commands, code explanations, quick edits, non-development tasks.</triggers>

<note>Detailed protocols live in `${PLUGIN_ROOT}/reference/workflow/*.md` — load each one lazily at its triggering stage. See `<protocols>` block below for the file-per-process map.</note>

<pre-flight-checklist name="Visual / UI Feature">
  Before starting Stage 1 on a feature that touches rendering (UI, layout, custom-painted graphics, document layout, game UI), confirm — do not just nod past these questions:

  1. **Have I identified 5-10 representative real input samples?** Real production data, real user content, real assets — not placeholders. Without these, Stage 6.5 prototype-runner has nothing to test against. (Discipline A)
  2. **What is the cheapest pixel/DOM property assertion that would fail if the design were wrong?** Write it as a one-liner now; it becomes the first test of Phase 1. If you cannot articulate this, the success criteria are too vague — re-scope the spec. (Discipline B, Tier 1)
  3. **Which render-artifact tier will visual-verifier produce per phase?** Tier 1 (pixel/DOM assertions) is the default; only escalate to Tier 2/3 if Tier 1 cannot capture the regression. Document the choice in the spec. (Discipline B)
  4. **Does the spec contain numeric design constants?** Thresholds, ratios, percentages, alphas, sizes. If yes, Stage 6.5 prototype-runner will be triggered automatically — but the spec should already mention which constants to test and what tolerance to allow. (Discipline A)
  5. **Is the visual artifact part of every phase's "done" definition?** No phase is complete without the artifact; no Stage 10 reviewer verdict is valid without `Read`-ing it. (Discipline B)
  6. **If iteration reveals the spec is wrong, will the protocol catch it?** Confirm `reference/workflow/pivot-protocol.md` is wired into the workflow. (Discipline C)

  Skipping any of these is the tell that you're about to repeat spec-29. See `reference/lessons-learned/spec-29-visual-verification.md` for the postmortem that motivated this checklist.
</pre-flight-checklist>

<workflow>
  <!--
    This 13-stage contract is the source of truth for BOTH execution modes.
    Workflow mode: every stage maps to a phase() block in workflows/super-dev.workflow.js.
    Narrated mode: Team Lead walks the stages here turn-by-turn.
    Renumbering or adding stages requires updating BOTH the workflow script
    (meta.phases + phase()/agent() calls) AND the protocol files under
    reference/workflow/.
  -->
  <stage n="1" name="Specification Setup">Create worktree, spec dir, workflow JSON, agent team. MUST complete before any codebase exploration or agent spawning.</stage>
  <stage n="2" name="Requirements + BDD">Sequential pairs: spawn requirements-clarifier + doc-validator (gate-requirements) in parallel → WAIT for doc-validator PASS signal (do NOT read the doc or run the gate yourself) → spawn bdd-scenario-writer + doc-validator (gate-bdd) in parallel → WAIT for doc-validator PASS signal. Interview pattern with ambiguity detection (Scope/Behavior/Data/Integration/Performance categories), codebase-grounded context retrieval, edge case generation (null/empty/boundary/concurrent/timeout/overflow), and quality self-scoring. Gates: gate-requirements.sh, gate-bdd.sh (both run by doc-validator, NEVER by team-lead).</stage>
  <stage n="3" name="Research">Spawn research-agent. Firecrawl MCP first, then supplementary scripts. Parallel community discovery (Reddit, HN, GitHub Discussions, Dev.to, X) and AI documentation traversal (Anthropic, OpenAI, Google, framework docs) with momentum scoring. Innovation discovery for technologies less than 12 months old. If report identifies issues/flaws/ambiguities, re-spawn research-agent in deep-research mode targeting specific issues (max 3 iterations). For complex/contentious topics, use competing hypotheses pattern (2-3 agents with different angles). Present 3-5 options with momentum-scored comparison matrix to user.</stage>
  <stage n="4" name="Debug Analysis">Spawn debug-analyzer. Hypothesis trees with probability estimates, chain-of-thought traces, automated reproduction scripts. Community search for identical error messages. Only for bug fixes — skip otherwise.</stage>
  <stage n="5" name="Code Assessment">Spawn code-assessor. Architecture smell detection (God Class, Feature Envy, Shotgun Surgery), dependency health scoring (Healthy/Warning/Critical), technical debt quantification with severity/effort/blast-radius, pattern library extraction. FIRST stage allowed to read/grep/explore the codebase.</stage>
  <stage n="6" name="Design">
    Route based on task type:
    - NEW feature/module → spawn architecture-designer (design from scratch: module decomposition, interfaces, ADRs, evaluation matrix, AI-aware patterns: token budget efficiency, prompt caching friendliness, parallel agent execution potential)
    - IMPROVE existing code (refactor, testability, structural optimization) → spawn architecture-improver (deepening analysis: find shallow modules, Design It Twice, migration path)
    - UI ONLY → spawn ui-ux-designer
    - BOTH architecture + UI → spawn product-designer
    Task Graph Thinking: structure as DAGs with parallelism annotations ([PARALLEL: A, B, C] vs [SERIAL: D → E → F]). Selection signal: requirements doc mentions "refactor", "improve", "testability", "restructure" → architecture-improver. Otherwise → architecture-designer. Skip entirely for backend-only changes with no architecture impact.
  </stage>
  <stage n="6.5" name="Empirical Prototype (CONDITIONAL)">When the design output (`05-architecture.md` and/or pre-spec design) contains numeric design constants (thresholds, ratios, percentages, alphas, sizes), spawn prototype-runner + doc-validator (gate-prototype) BEFORE Stage 7. The prototype tests those constants against 5-10 representative real inputs and reports measured-vs-spec deltas. On `PROTOTYPE_FAILED`, invoke pivot-protocol before spec writing — the spec is built on wrong constants. On no-constants detected, mark Stage 6.5 `skipped`. See `reference/lessons-learned/spec-29-visual-verification.md#three-disciplines` Discipline A.</stage>
  <stage n="7" name="Specification Writing">Spawn spec-writer + doc-validator (parallel). Produces specification, implementation plan (DAG format with depends_on and parallelizable_with fields), task list. Agent-friendly decomposition with complexity-adaptive granularity. Contract-first: every module interface has explicit I/O type signatures. Gate: gate-spec-trace.sh.</stage>
  <stage n="8" name="Specification Review">Spawn spec-reviewer + doc-validator (parallel). Reviewer MUST verify spec covers ALL requirements ACs (100% coverage required — <100% = automatic rejection), ALL BDD scenarios, and aligns with design decisions. Grounding scores (verified_references/total >= 90%), anti-pattern verification (YAGNI, premature optimization, untestable requirements, missing error paths). Gate: gate-spec-review.sh. On failure: follow Spec Iteration Loop.</stage>
  <stage n="9" name="Implementation">Sequential TDD workflow per phase: Step 9.1 spawn tdd-guide (write failing tests from req/bdd/spec/plan/tasks, anti-hardcoding enforced) → Step 9.2 spawn domain specialist (make tests pass) → Step 9.3 spawn impl-summary-writer (DOCUMENT) → **Step 9.4 spawn visual-verifier (RENDER ARTIFACT — picks Tier 1 pixel/DOM assertions / Tier 2 render harness / Tier 3 headless screenshot per project type; non-visual phases drop `.non-visual` marker and skip cleanly)** → Step 9.5 spawn qa-agent (run tests, feature-by-feature verification, verify coverage, report) → Step 9.6 spawn e2e-runner (E2E tests, Web/UI only — skip for backend-only/CLI/library). Incremental verification with feature-by-feature commits. Each step MUST complete before the next begins. Gates: doc-validator(gate-visual) after Step 9.4 + doc-validator(gate-build) after Step 9.5 — WAIT for PASS. Loops through ALL implementation-plan phases via Implementation Completeness Loop. See `reference/lessons-learned/spec-29-visual-verification.md#three-disciplines` Discipline B.</stage>
  <stage n="10" name="Code Review">Spawn code-reviewer + adversarial-reviewer + 2x doc-validator (gate-review) + doc-validator (gate-implementation-complete) — 5 parallel. **Reviewer prompts MUST include visual-verifier artifact paths; reviewers MUST `Read` each artifact via the Read tool before issuing verdict — verdicts without artifact inspection are invalid.** Coverage-first review (report EVERY issue including uncertain/low-severity), CONTEST verdict format, community-informed patterns, fresh context mandate (writer/reviewer separation). Gate: gate-review.sh, gate-implementation-complete.sh. On failure: follow Implementation Iteration Loop. **Pivot branch:** if iteration ≥ 2 reveals the spec design is wrong (not the implementation), invoke `reference/workflow/pivot-protocol.md` instead of continuing to iterate.</stage>
  <stage n="11" name="Documentation">Sequential: spawn docs-executor → WAIT for `DOCS_COMPLETE` signal or agent termination → spawn doc-validator (gate-docs-drift) → WAIT for PASS → spawn handoff-writer → WAIT for completion → spawn doc-validator (gate-handoff, conditional — when iteration.loops > 0 OR implementationPhases > 1 OR pivot artifacts present, requires `## AC Coverage Assessment` section listing ACs met as planned / met by alternative mechanism / superseded). Docs-with-code pattern (same commit as code changes), changelog automation from git history, AI-optimized documentation (structured for human + agent consumption). Skip handoff-writer ONLY if all stages completed in a single session (no continuation needed). MANDATORY — do not skip docs-executor. See `reference/lessons-learned/spec-29-visual-verification.md#three-disciplines` Discipline C.</stage>
  <stage n="12" name="Cleanup & Confirmation">Verify all teammates terminated. Spawn build-cleaner agent: intelligent artifact detection based on project type, sensitive data scan (secrets/credentials/API keys — BLOCKING if found), project-type-specific cleanup patterns. Worktree preserved. Then present summary to user for confirmation before merge.</stage>
  <stage n="13" name="Commit and Merge">Git operations: semantic commit format (conventional commits with scope, breaking change markers, AC-ID traceability), PR description auto-generation from specification, pre-merge CI-equivalent checks. Commit spec directory + code, merge to main. Verify completion; worktree preserved for reference.</stage>
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
  | 9 (per phase) | `gate-build.sh` | doc-validator | Build, tests, type checks |
  | 10 → 11 | `gate-review.sh` | doc-validator | Code review approved, adversarial PASS |
  | 10 → 11 | `gate-implementation-complete.sh` | doc-validator | ALL implementation-plan phases complete |
  | 11 (docs → handoff) | `gate-docs-drift.sh` | doc-validator | Docs exist, no excessive TODOs |
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
  <constraint name="NEVER Analyze Directly">team-lead invokes the workflow and relays its result. ALL implementation, gate checks, and agent spawning happens inside `agent()` calls within the workflow script.</constraint>
  <constraint name="Single Tool Call">A normal run should be 1 (ToolSearch verify) + 1 (Workflow invocation) + 1 (relay result) = ~3 turns total in team-lead context. Anything beyond that suggests team-lead is doing work that belongs in the script.</constraint>
  <constraint name="No Pause for Confirmation">NEVER pause to ask the user for confirmation. After path resolution, invoke the workflow immediately. The workflow runs autonomously to completion.</constraint>
  <constraint name="Worktree-Only Modifications">The workflow creates a worktree. ALL file operations happen there. Only Stage 13 merges to main.</constraint>
  <constraint name="Resume on Failure">If the workflow returns status='failed', users can re-run with `Workflow({scriptPath, resumeFromRunId})` to replay cached agents and only re-run the failed stage onward.</constraint>
</constraints>

<rules>
  <rule name="Workflow Required" mandatory="true">Claude Code v2.1.178+ and the `Workflow` tool MUST be available. The team-lead agent verifies Workflow availability before invoking; on absence it aborts with an upgrade recommendation.</rule>
  <rule name="team-lead-delegation" mandatory="true">team-lead does ONE thing: invoke `Workflow({scriptPath: "${PLUGIN_ROOT}/workflows/super-dev.workflow.js", args})`. It does not spawn individual agents, does not run scripts, does not write tracking files. All stage logic lives in the workflow script.</rule>
  <rule name="no-pause" mandatory="true">team-lead never pauses to ask for confirmation. After parameter extraction, invoke the workflow immediately and run to completion.</rule>
</rules>

<references>
  <ref>Canonical workflow script: `workflows/super-dev.workflow.js` — all orchestration logic lives here</ref>
  <ref>Plugin root: `${PLUGIN_ROOT}` — agents, scripts, skills, workflows</ref>
  <ref>Plugin data: `${PLUGIN_DATA}` — global stats, learned patterns</ref>
  <ref>Per-process protocols: `${PLUGIN_ROOT}/reference/workflow/*.md` — loaded lazily per-stage by the workflow</ref>
</references>
