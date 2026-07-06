---
name: super-dev
description: Multi-step development orchestrator for implementing features, fixing bugs, refactoring, optimizing performance, and resolving deprecations
author: Jennings Liu
version: 2.5.23
license: MIT
---

<platform-paths>
  PLUGIN_ROOT:
    claude: ${CLAUDE_PLUGIN_ROOT}
  PLUGIN_DATA:
    claude: ${CLAUDE_PLUGIN_DATA}
  Use whichever value resolved to an actual path (not a literal variable name).
</platform-paths>

<purpose>YOU are the Team Lead. You orchestrate the 13-stage development pipeline by spawning specialized agent teammates via the Agent tool — you NEVER implement directly, only spawn, coordinate, and verify. Agents execute research, architecture, coding, QA, code review, and documentation stages in parallel where possible. This skill file IS your complete operational playbook — do NOT spawn a separate team-lead agent.</purpose>

<tool-disambiguation>
  All sub-agent spawning uses the harness's **`Agent`** tool (param: `subagent_type=super-dev:<agent-name>`, `prompt=...`). The `Task` tool was renamed to `Agent` in Claude Code v2.1.63 (2026-02-28); the `Task(...)` alias still works in settings/agent definitions but hook payloads emit `tool_name="Agent"`.

  Team scaffolding is DEPRECATED in modern Claude Code:
  - `TeamCreate` / `TeamDelete` tools were REMOVED in v2.1.178. Do not call them.
  - `team_name` on the `Agent` tool is accepted but informational only. Pass it for audit trail consistency.
  - The session uses a single implicit team. Agent lifecycle is managed by you (the team-lead) via `run_in_background=true` + polling.
</tool-disambiguation>

<orchestration-model>
  **Agent Tool orchestration** — you (the team-lead, reading this SKILL) spawn specialist agents directly via the `Agent` tool. No Dynamic Workflow dependency. Compatible with all Claude Code versions that support the Agent tool.

  Stage 9 implementation phases are executed sequentially by you, spawning specialist agents per step (tdd-guide → domain-specialist → impl-summary-writer → visual-verifier → qa-agent → e2e-runner). For features with ≥4 phases and disjoint file sets, the Phase-Orchestrator Pattern enables parallel execution (see `<protocol>` below).

  **Retry policy**: If an agent returns null (terminal API error / crash), retry up to 3 times before escalating to user. This applies to ALL agent spawns.
</orchestration-model>

<triggers>Triggers on: "implement", "build", "fix bug", "refactor", "add feature", "develop this", "help me build", "add functionality", "optimize performance", "resolve deprecation", "systematic development". Do NOT trigger on: simple questions, file searches, one-off commands, code explanations, quick edits, non-development tasks.

**Flags** (optional, extracted from the user's message):
- `--skip-worktree` → skip worktree/branch creation, work directly on current branch. Use when already on a feature branch.
- `--skip=N,N,N` → skip specified stages entirely (comma-separated numbers, supports decimals like 6.5). Skipped stages are marked 'skipped' in tracking JSON without spawning agents. Example: `--skip=2,3,4,5` to jump straight to design.
- `--workflow` → redirect to `super-dev:workflow` skill (Dynamic Workflow variant) instead. Requires Claude Code v2.1.178+.
</triggers>

<note>Detailed protocols live in `${PLUGIN_ROOT}/reference/workflow/*.md` — load each one lazily at its triggering stage. See `<protocols>` block below for the file-per-process map.</note>

<pre-flight-checklist name="Visual / UI Feature">
  Before starting Stage 1 on a feature that touches rendering (UI, layout, custom-painted graphics, document layout, game UI), confirm — do not just nod past these questions:

  1. **Have I identified 5-10 representative real input samples?** Real production data, real user content, real assets — not placeholders. Without these, Stage 6.5 prototype-runner has nothing to test against. (Discipline A)
  2. **What is the cheapest pixel/DOM property assertion that would fail if the design were wrong?** Write it as a one-liner now; it becomes the first test of Phase 1. If you cannot articulate this, the success criteria are too vague — re-scope the spec. (Discipline B, Tier 1)
  3. **Which render-artifact tier will visual-verifier produce per phase?** Tier 1 (pixel/DOM assertions) is the default; only escalate to Tier 2/3 if Tier 1 cannot capture the regression. Document the choice in the spec. (Discipline B)
  4. **Does the spec contain numeric design constants?** Thresholds, ratios, percentages, alphas, sizes. If yes, Stage 6.5 prototype-runner will be triggered automatically — but the spec should already mention which constants to test and what tolerance to allow. (Discipline A)
  5. **Is the visual artifact part of every phase's "done" definition?** No phase is complete without the artifact; no Stage 10 reviewer verdict is valid without `Read`-ing it. (Discipline B)
  6. **If iteration reveals the spec is wrong, will the protocol catch it?** Confirm `reference/workflow/pivot-protocol.md` is wired into the pipeline. (Discipline C)

  Skipping any of these is the tell that you're about to repeat spec-29. See `reference/lessons-learned/spec-29-visual-verification.md` for the postmortem that motivated this checklist.
</pre-flight-checklist>

<stages>
  <stage n="1" name="Specification Setup">Create worktree, spec dir, tracking JSON, agent team. MUST complete before any codebase exploration or agent spawning.</stage>
  <stage n="2" name="Requirements + BDD">Sequential pairs: spawn requirements-clarifier + doc-validator (gate-requirements) in parallel → WAIT for doc-validator PASS signal (do NOT read the doc or run the gate yourself) → spawn bdd-scenario-writer + doc-validator (gate-bdd) in parallel → WAIT for doc-validator PASS signal. Interview pattern with ambiguity detection (Scope/Behavior/Data/Integration/Performance categories), codebase-grounded context retrieval, edge case generation (null/empty/boundary/concurrent/timeout/overflow), and quality self-scoring. Gates: gate: requirements, gate: bdd (both run by doc-validator, NEVER by team-lead).</stage>
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
  <stage n="7" name="Specification Writing">Spawn spec-writer + doc-validator (parallel). Produces specification, implementation plan (DAG format with depends_on and parallelizable_with fields), task list. Agent-friendly decomposition with complexity-adaptive granularity. Contract-first: every module interface has explicit I/O type signatures. Gate: gate: spec-trace.</stage>
  <stage n="8" name="Specification Review">Spawn spec-reviewer + doc-validator (parallel). Reviewer MUST verify spec covers ALL requirements ACs (100% coverage required — <100% = automatic rejection), ALL BDD scenarios, and aligns with design decisions. Grounding scores (verified_references/total >= 90%), anti-pattern verification (YAGNI, premature optimization, untestable requirements, missing error paths). Gate: gate: spec-review. On failure: follow Spec Iteration Loop.</stage>
  <stage n="9" name="Implementation">Sequential TDD sequence per phase: Step 9.1 spawn tdd-guide (write failing tests from req/bdd/spec/plan/tasks, anti-hardcoding enforced) → Step 9.2 spawn domain specialist (make tests pass) → Step 9.3 spawn impl-summary-writer (DOCUMENT) → **Step 9.4 spawn visual-verifier (RENDER ARTIFACT — picks Tier 1 pixel/DOM assertions / Tier 2 render harness / Tier 3 headless screenshot per project type; non-visual phases drop `.non-visual` marker and skip cleanly)** → Step 9.5 spawn qa-agent (run tests, feature-by-feature verification, verify coverage, report) → Step 9.6 spawn e2e-runner (NON-BLOCKING — Web/UI only; failure is logged as a warning but does NOT block the pipeline or trigger iteration). Incremental verification with feature-by-feature commits. Each step MUST complete before the next begins. Gates: doc-validator(gate-visual) after Step 9.4 + doc-validator(gate-build) after Step 9.5 — WAIT for PASS. Loops through ALL implementation-plan phases via Implementation Completeness Loop. See `reference/lessons-learned/spec-29-visual-verification.md#three-disciplines` Discipline B.</stage>
  <stage n="10" name="Code Review">Spawn code-reviewer + adversarial-reviewer + 2x doc-validator (gate-review) + doc-validator (gate-implementation-complete) — 5 parallel. **Reviewer prompts MUST include visual-verifier artifact paths; reviewers MUST `Read` each artifact via the Read tool before issuing verdict — verdicts without artifact inspection are invalid.** Coverage-first review (report EVERY issue including uncertain/low-severity), CONTEST verdict format, community-informed patterns, fresh context mandate (writer/reviewer separation). Gate: gate: review, gate: implementation-complete. On failure: follow Implementation Iteration Loop. **Pivot branch:** if iteration ≥ 2 reveals the spec design is wrong (not the implementation), invoke `reference/workflow/pivot-protocol.md` instead of continuing to iterate.</stage>
  <stage n="11" name="Integration Testing">OUTER LOOP wrapping Stages 10+11 (max 3): After code review PASSES, run integration tests. 11A (backend): api-tester generates + runs CRUD/validation/auth/edge tests against all endpoints. 11B (frontend): e2e-runner maps ALL BDD SCENARIO-NNNs to Playwright journeys, cross-browser (chromium/firefox/webkit), performance budgets, accessibility scan. BLOCKING: 100% pass required. On failure: classify (CODE_BUG/TEST_BUG) → specialist fix → BACK TO Stage 10 (re-review) → Stage 11 (re-test). Same error persisting → ask user. Max 3 outer iters → ask user. Gate: gate-api-tests, gate-e2e-report. Skip if: no backend AND no frontend (pure library/CLI).</stage>
  <stage n="12" name="Documentation">Sequential: spawn docs-executor → WAIT for `DOCS_COMPLETE` signal or agent termination → spawn doc-validator (gate-docs-drift) → WAIT for PASS → spawn handoff-writer → WAIT for completion → spawn doc-validator (gate-handoff, conditional — when iteration.loops > 0 OR implementationPhases > 1 OR pivot artifacts present, requires `## AC Coverage Assessment` section listing ACs met as planned / met by alternative mechanism / superseded). Docs-with-code pattern (same commit as code changes), changelog automation from git history, AI-optimized documentation (structured for human + agent consumption). Skip handoff-writer ONLY if all stages completed in a single session (no continuation needed). MANDATORY — do not skip docs-executor. See `reference/lessons-learned/spec-29-visual-verification.md#three-disciplines` Discipline C.</stage>
  <stage n="13" name="Cleanup & Confirmation">Verify all teammates terminated. Spawn build-cleaner agent: intelligent artifact detection based on project type, sensitive data scan (secrets/credentials/API keys — BLOCKING if found), project-type-specific cleanup patterns. Worktree preserved. Then present summary to user for confirmation before merge.</stage>
  <stage n="14" name="Commit and Merge">Git operations: semantic commit format (conventional commits with scope, breaking change markers, AC-ID traceability), PR description auto-generation from specification, pre-merge CI-equivalent checks. Commit spec directory + code, merge to main. Verify completion; worktree preserved for reference.</stage>
</stages>

<protocols>
  Lazy-loaded per-process protocol files. Read each one at its triggering stage — NOT at pipeline start.

  <protocol stage="1" file="reference/workflow/specification-setup.md">Spec index, worktree creation, tracking JSON format. Read at Stage 1 entry.</protocol>
  <protocol stage="1" file="reference/workflow/first-run-config.md">Project stack auto-detect and config write. Read once on first run per project.</protocol>
  <protocol stage="2,3,4,5,6,7,8,9,10,11" file="reference/workflow/document-naming.md">Pre-compute exact filenames before spawning writers. Canonical suffix table. Read before any document-producing spawn.</protocol>
  <protocol stage="2,3,7,8,9,10,11" file="reference/workflow/verification-gates.md">Gate execution and failure handling. Read before first gate of the pipeline.</protocol>
  <protocol stage="7,8" file="reference/workflow/spec-iteration-loop.md">Read ONLY when spec-reviewer rejects or gate: spec-review fails.</protocol>
  <protocol stage="9" file="reference/workflow/implementation-completeness-loop.md">Per-phase TDD sequence and completeness enforcement. Read at Stage 9 entry.</protocol>
  <protocol stage="9,10" file="reference/workflow/implementation-iteration-loop.md">Read ONLY when code-reviewer ≠ "Approved" or adversarial-reviewer returns REJECT.</protocol>
  <protocol stage="3" file="reference/workflow/research-deep-dive-loop.md">Read ONLY when Stage 3 research flags issues/flaws/ambiguities.</protocol>
</protocols>

<gate-map>
  Gate scripts: `node ${PLUGIN_ROOT}/scripts/gates/runner.mjs <gate-name> <spec-dir>`. Exit 0 = PASS, 1 = FAIL. **NON-NEGOTIABLE — fail = loop and fix.** Detail: see `reference/workflow/verification-gates.md`.

  | After | Script | Run by | Checks |
  |---|---|---|---|
  | 2 (req → bdd) | `gate: requirements` | doc-validator | ACs, NFRs, summary |
  | 2 → 3 | `gate: bdd` | doc-validator | SCENARIO-IDs, Given/When/Then, AC traceability |
  | 7 → 8 | `gate: spec-trace` | doc-validator | Spec refs BDD scenarios, testing strategy |
  | 8 → 9 | `gate: spec-review` | doc-validator | Review verdict, 8 dimensions, grounding |
  | 9 (per phase) | `gate: build` | doc-validator | Build, tests, type checks |
  | 10 → 11 | `gate: review` | doc-validator | Code review approved, adversarial PASS |
  | 10 → 11 | `gate: implementation-complete` | doc-validator | ALL implementation-plan phases complete |
  | 11 (docs → handoff) | `gate: docs-drift` | doc-validator | Docs exist, no excessive TODOs |
</gate-map>

<parameters>
  <parameter name="skip_worktree" default="false">When true, skip worktree/branch creation and work directly on the current branch. Flag: `--skip-worktree`.</parameter>
  <parameter name="skip_stages" default="">Comma-separated stage numbers to skip entirely (e.g., "2,3,4,5"). Skipped stages are marked 'skipped' in tracking JSON without spawning agents. Flag: `--skip=2,3,4,5`. Supports decimals (6.5).</parameter>

  <flag-dispatch>
    Extract CLI-style flags from the user's message. After extraction, remaining text = `request`.
    - `--skip-worktree` → skip_worktree = true
    - `--skip=N,N,N` → skip_stages = Set of stage numbers to skip. Parse the comma-separated values. At each stage entry, check if the stage number is in skip_stages — if yes, mark 'skipped' in tracking JSON and proceed to the next stage without spawning any agents.
    - `--workflow` → REDIRECT: invoke `super-dev:workflow` skill instead and exit immediately
    The flags are removed from the request text before passing to agents.
  </flag-dispatch>
</parameters>

<process name="Stage Flow">
  <phase n="1" name="Setup">
    Stage 1: Create worktree, spec dir, JSON tracking, agent team. NEVER skippable — always runs.

    Step 1.1: Run `node ${PLUGIN_ROOT}/scripts/utils/preflight-env.mjs` to verify environment.
    Step 1.2: Pull latest (see "Pull Latest Before Worktree" constraint).
    Step 1.3 — Spec Naming (MANDATORY): Derive spec_identifier from the user's request:
      1. Look at `docs/specifications/` directory in the repo
      2. Find the highest existing 2-digit numeric prefix (e.g., folders `01-something`, `02-another`)
      3. Compute `next_index` = max + 1, zero-padded to 2 digits (e.g., "03")
      4. Derive `spec_name` from the user's request as kebab-case lowercase (e.g., "add-auth-flow", "fix-pagination-bug", "refactor-handler-pattern")
      5. `spec_identifier` = `{next_index}-{spec_name}` (e.g., "03-add-auth-flow")
      If `docs/specifications/` doesn't exist, start at "01".
    Step 1.4 — Create Worktree (unless --skip-worktree):
      - Branch name: `{spec_identifier}` (e.g., "03-add-auth-flow")
      - Worktree path: `.worktree/{spec_identifier}` (relative to repo root)
      - Command: `git worktree add .worktree/{spec_identifier} -b {spec_identifier}`
      - Capture absolute worktree path via `cd .worktree/{spec_identifier} && pwd`
      - Store as WORKTREE_PATH in tracking JSON
    Step 1.5 — Create Spec Directory: `mkdir -p $WORKTREE_PATH/docs/specifications/{spec_identifier}/`
    Step 1.6 — Initialize Tracking JSON: Copy template from `${PLUGIN_ROOT}/reference/workflow-tracking-template.json` to `{spec_directory}/{spec_identifier}-workflow-tracking.json`. Populate: specId, specName, worktreePath, team.name, startedAt.
    Step 1.7 — Copy .env files from main repo to worktree (recursive, skip *.example).
  </phase>
  <phase n="2" name="Requirements & Research">
    Stage 2: IF stage 2 is in skip_stages → mark 'skipped' in tracking JSON, do NOT spawn requirements-clarifier or bdd-scenario-writer, proceed to Stage 3. ELSE → spawn requirements-clarifier + doc-validator (gate-requirements) in parallel → WAIT for doc-validator to signal PASS → then spawn bdd-scenario-writer + doc-validator (gate-bdd) in parallel → WAIT for doc-validator to signal PASS.
    Stage 3: IF stage 3 is in skip_stages → mark 'skipped' in tracking JSON, proceed to Stage 4. ELSE → research-agent (Firecrawl first; deep-research iterations if issues flagged).
  </phase>
  <phase n="3" name="Analysis & Design">
    Stage 4: IF stage 4 is in skip_stages → mark 'skipped', proceed to Stage 5. ELSE → debug-analyzer (bug fixes only; already skipped for features).
    Stage 5: IF stage 5 is in skip_stages → mark 'skipped', proceed to Stage 6. ELSE → code-assessor (FIRST codebase exploration).
    Stage 6: IF stage 6 is in skip_stages → mark 'skipped', proceed to Stage 6.5/7. ELSE → architecture-designer (new) / architecture-improver (refactor) / product-designer (UI+arch) / ui-ux-designer (UI only).
    Stage 6.5 (CONDITIONAL): IF stage 6.5 is in skip_stages → mark 'skipped'. ELSE → If design output contains numeric design constants, spawn prototype-runner + doc-validator(gate-prototype). On no-constants detected, mark 'skipped' and proceed.
  </phase>
  <phase n="4" name="Specification">
    Stage 7: IF stage 7 is in skip_stages → mark 'skipped', proceed to Stage 8. ELSE → spec-writer + doc-validator → specification, plan, tasks (gate-spec-trace).
    Stage 8: IF stage 8 is in skip_stages → mark 'skipped', proceed to Stage 9. ELSE → spec-reviewer + doc-validator → review (gate-spec-review). On failure: Spec Iteration Loop (max 3, escalate after 3).
  </phase>
  <phase n="5" name="Implementation">
    Stage 9: IF stage 9 is in skip_stages → mark 'skipped', proceed to Stage 10. ELSE → Sequential per-phase TDD loop across ALL plan phases:
    Step 9.1: tdd-guide (RED) → Step 9.2: domain specialist (GREEN) → Step 9.3: impl-summary-writer (DOCUMENT) → Step 9.4: visual-verifier (RENDER ARTIFACT, all visual phases — emits .non-visual marker for non-visual phases) → Step 9.5: qa-agent (VERIFY) → Step 9.6: e2e-runner (NON-BLOCKING — Web/UI only; failure logged as warning, does NOT block or trigger re-iteration)
    Gates: doc-validator(gate-visual) after Step 9.4 — WAIT for PASS; doc-validator(gate-build) after Step 9.5 — WAIT for PASS
    Commit: after gate-build PASS, commit all phase changes with message: "feat(<phase-name>): <description>". The new HEAD becomes base_sha for next phase.
    Stage 10: IF stage 10 is in skip_stages → mark 'skipped', proceed to Stage 11. ELSE → code-reviewer + adversarial-reviewer + 2× doc-validator (gate-review) + doc-validator (gate-implementation-complete). Reviewer prompts MUST include visual-verifier artifact paths; reviewers MUST `Read` each artifact before issuing verdict.
    On failure: Implementation Iteration Loop (max 3 per phase)
    Stage 11: IF stage 11 is in skip_stages OR (no backend AND no frontend) → mark 'skipped', proceed to Stage 12. ELSE → OUTER LOOP (max 3 iters wrapping Stages 10+11): 11A (backend): api-tester + doc-validator(gate-api-tests). 11B (frontend): e2e-runner + doc-validator(gate-e2e-report). On failure: classify → specialist fix → BACK TO Stage 10 (re-review) → Stage 11 (re-test). Same error persisting → ask user. Max 3 → ask user.
  </phase>
  <phase n="6" name="Finalization">
    Stage 12: IF stage 12 is in skip_stages → mark 'skipped', proceed to Stage 13. ELSE → docs-executor → spawn doc-validator (gate-docs-drift) → WAIT for PASS → handoff-writer → spawn doc-validator (gate-handoff, conditional) → WAIT for PASS (skip handoff if single session).
    Stage 13: IF stage 13 is in skip_stages → mark 'skipped', proceed to Stage 14. ELSE → terminate all, build-cleaner, user confirmation.
    Stage 14: IF stage 14 is in skip_stages → mark 'skipped'. ELSE → commit any remaining uncommitted changes (docs, handoff), merge worktree branch to main. Post-merge: run `${PLUGIN_ROOT}/scripts/utils/persist-memory.mjs {spec_directory} {worktree_path}` to extract key decisions.
  </phase>
</process>

<process name="--skip Flag Processing (MANDATORY)">
  When `--skip=N,N,N` is present in the user's message:

  <step n="1" name="Parse">Extract comma-separated numbers from --skip value. Store as a set of stage numbers (integers and decimals like 6.5). Strip the flag from the request text.</step>
  <step n="2" name="Gate at each stage">At the START of each stage, BEFORE any action or agent spawn, check: is this stage number in the skip set?</step>
  <step n="3" name="If YES (skip)">
    - Log: "Stage N SKIPPED (--skip)"
    - Update tracking JSON: set stage status to "skipped", set completedAt to current timestamp
    - Do NOT spawn any agents for this stage
    - Proceed immediately to the next stage
  </step>
  <step n="4" name="If NO (run normally)">Execute the stage as described in the Stage Flow process above.</step>
  <step n="5" name="Stage 1 exception">Stage 1 (Setup) is NEVER skippable — it creates the worktree and tracking infrastructure. If 1 appears in --skip, ignore it and run Stage 1 normally.</step>
  <step n="6" name="Downstream safety">When a stage is skipped, downstream stages that reference its outputs (doc paths, assessments, etc.) must handle the absence gracefully. If a downstream stage REQUIRES a skipped stage's output and cannot proceed without it (e.g., Stage 9 requires Stage 7 spec), throw an error: "Stage N requires Stage M output which was skipped — cannot proceed."</step>
</process>

<process name="Worktree Enforcement (PRE-STAGE GATE)">

  At the START of every stage (Stage 2 onwards), before ANY action:

  <step n="1" name="Read WORKTREE_PATH">Read `worktreePath` from the tracking JSON. This is the absolute path (e.g., `/home/user/project/.worktree/22-add-auth`). Store as WORKTREE_PATH for this stage.</step>
  <step n="2" name="Verify Exists">Run: `test -d "$WORKTREE_PATH"`. If fails → ABORT: "WORKTREE VIOLATION: $WORKTREE_PATH does not exist. Run Stage 1 first."</step>
  <step n="3" name="Prefix All Commands">Every Bash command in Stage 2+ MUST use: `cd $WORKTREE_PATH && <command>`. No exceptions. This ensures even if shell state resets between calls, you always land in the worktree.</step>
  <step n="4" name="Absolute Paths Only">ALL file paths passed to agents or used in Read/Write/Edit MUST be absolute paths starting with $WORKTREE_PATH. Relative paths are FORBIDDEN — they resolve against the wrong root.</step>

  This applies to ALL stages ≥2, not just agent spawning. File reads, greps, builds, commits — everything must happen inside the worktree. Wrong pwd means wrong relative paths for gate scripts, specs, and agent work.
</process>

<process name="Stage Transition Protocol (MANDATORY)">
  At EVERY stage transition, the Team Lead MUST update the tracking JSON with BOTH status changes atomically:

  <step n="1" name="Terminate Previous Agents">Terminate ALL sub-agents spawned during the finishing stage. Verify none are still running before proceeding. Exception: Stage 9/10 parallel agents — wait for ALL to complete first, then terminate together.</step>
  <step n="2" name="Complete Previous">Set the finishing stage's `status` to `"complete"` and `completedAt` to the current ISO 8601 timestamp (seconds precision). Exception: if the stage was skipped, set `status` to `"skipped"` instead.</step>
  <step n="3" name="Start Next">Set the next stage's `status` to `"in_progress"` and `startedAt` to the current ISO 8601 timestamp (seconds precision).</step>
  <step n="4" name="Single Update">Both changes MUST happen in a single JSON write — never leave the tracking file in a state where the previous stage is still `"in_progress"` while the new stage has also started.</step>

  This applies to ALL stage transitions (1→2, 2→3, 3→4, etc.), not just implementation phases. Skipping a stage (e.g., Stage 4 for non-bug work) still requires marking it `"skipped"` before advancing.

  Violation: If a new stage begins without the previous stage being marked `"complete"` or `"skipped"`, the tracking state is INVALID and must be corrected immediately.
</process>

<process name="Domain-Aware Agent Routing">
  For Stage 9, spawn domain specialists directly instead of dev-executor:
  <route domain="Rust" agent="super-dev:rust-developer" />
  <route domain="Go" agent="super-dev:golang-developer" />
  <route domain="Frontend" agent="super-dev:frontend-developer" />
  <route domain="Backend" agent="super-dev:backend-developer" />
  <route domain="iOS" agent="super-dev:ios-developer" />
  <route domain="Android" agent="super-dev:android-developer" />
  <route domain="Windows" agent="super-dev:windows-app-developer" />
  <route domain="macOS" agent="super-dev:macos-app-developer" />
  <route domain="Unknown" agent="super-dev:dev-executor" />
</process>

<process name="Writer + Validator Paired Spawn (MANDATORY)">
  EVERY time you spawn a writer or reviewer agent that produces a document, you MUST SIMULTANEOUSLY spawn a doc-validator agent in the SAME Agent tool call (parallel). This is NON-NEGOTIABLE.

  Pre-Spawn Self-Check — before EVERY Agent tool call, ask:
  1. "Is this agent producing a document?" → If YES, proceed to step 2.
  2. "Am I also spawning a doc-validator with the matching gate_profile?" → If NO, STOP and add the doc-validator spawn.
  3. "Am I using a single message with multiple Agent tool calls so they run in parallel?" → If NO, restructure.

  Stages that REQUIRE this pattern:
  - Stage 2: requirements-clarifier + doc-validator(gate-requirements), then bdd-scenario-writer + doc-validator(gate-bdd)
  - Stage 6.5 (conditional): prototype-runner + doc-validator(gate-prototype)
  - Stage 7: spec-writer + doc-validator(gate-spec-trace)
  - Stage 8: spec-reviewer + doc-validator(gate-spec-review)
  - Stage 9: after impl-summary-writer → visual-verifier + doc-validator(gate-visual); after qa-agent → doc-validator(gate-build)
  - Stage 10: code-reviewer + doc-validator(gate-review), adversarial-reviewer + doc-validator(gate-review), + doc-validator(gate-implementation-complete)
  - Stage 12: after docs-executor → doc-validator(gate-docs-drift); after handoff-writer → doc-validator(gate-handoff)
</process>

<protocol name="Bug Fix Verification Pause">
  For bug-fix workflows (detected by keywords "fix", "bug", "error", "issue", "broken", "crash", "regression" in the original user request), insert a MANDATORY verification pause after Stage 9 completes and before Stage 10 begins.

  Display to user: "🔍 Implementation complete. Please verify the fix works before I proceed to review & merge."

  WAIT for explicit user confirmation before continuing. Acceptable confirmations: "works", "confirmed", "verified", "lgtm", "proceed", "yes", "good", "correct".

  EXCEPTIONS — skip this pause when:
  - User explicitly says "skip verification" or uses --skip for stages 10+
  - The workflow is a feature implementation (not a bug fix)
  - The fix is purely internal (refactor, dependency update) with no user-facing behavior change
</protocol>

<protocol name="Competing Hypotheses (Parallel Investigation)">
  When initial Stage 3 research surfaces multiple conflicting approaches/recommendations, OR Stage 4 debug yields multiple hypotheses with similar probability (no single hypothesis above ~60% confidence), spawn 2-3 parallel agents — each investigating one angle — instead of one sequential agent.

  Stage 3 trigger: research-agent's first pass flags ≥2 conflicting community recommendations with comparable momentum. Spawn N research-agents in parallel (single message, multiple Agent calls), each scoped to one hypothesis.

  Stage 4 trigger: debug-analyzer's initial triage produces ≥2 root-cause hypotheses with similar evidence. Spawn N debug-analyzers in parallel, each chasing one hypothesis.

  Cap parallelism at 3. If still ambiguous after parallel pass, escalate to user.
</protocol>

<protocol name="Phase-Orchestrator Pattern (Context Isolation)">
  For features with ≥4 implementation phases AND the implementation plan's dependency DAG shows ≥2 parallelizable phase groups, use context-isolated parallel execution instead of sequential single-specialist spawning.

  WHEN to apply:
  - Implementation plan has ≥4 phases
  - The "Parallelizable With" fields identify ≥2 phases that can run concurrently
  - Phase file sets are DISJOINT (verified from task-list "Files:" entries)

  HOW:
  1. Parse the implementation plan's "Depends On" and "Parallelizable With" fields to build the execution DAG
  2. Group phases into waves: Wave 1 = phases with no dependencies, Wave 2 = phases depending only on Wave 1, etc.
  3. Within each wave, spawn phase-specialists SIMULTANEOUSLY (up to 3 concurrent)
  4. Each phase-specialist gets a CLEAN context with ONLY: the spec, the task-list for that phase, previous wave's summaries, test files for this phase
  5. After each wave completes, commit all wave changes, then proceed to next wave

  CONSTRAINTS:
  - Before spawning parallel phase-specialists, VERIFY from the task-list that their "Files:" entries are disjoint
  - For Rust and Go: only ONE build/compile at a time within a wave
  - If a parallel phase fails, other phases in the same wave continue; failed phase retries after the wave

  FALLBACK: If NO parallelizable phases (all sequential), proceed with the standard sequential loop.
</protocol>

<reference name="Document Suffixes">
  | Stage | Suffix(es) |
  |-------|-----------|
  | 2 | `requirements.md`, `bdd-scenarios.md` |
  | 3 | `research-report.md`, `deep-research-report-N.md` |
  | 4 | `debug-analysis.md` |
  | 5 | `code-assessment.md` |
  | 6 | `architecture.md`, `ui-ux-design.md`, `product-design-summary.md` |
  | 7 | `specification.md`, `implementation-plan.md`, `task-list.md` |
  | 8 | `spec-review.md` |
  | 9 | `implementation-summary.md`, `qa-report.md`, `e2e-report.md` |
  | 10 | `code-review.md`, `adversarial-review.md` |
  | 11 | `handoff.md` |
  Example: empty dir → Stage 2 = `01-requirements.md`, then `02-bdd-scenarios.md`
  Pre-compute ALL document indices before spawning writers. Index = max existing prefix + 1 (zero-padded 2 digits).
</reference>

<reference name="Tracking JSON Format">
  CRITICAL: `stages` and `implementationPhases` MUST be JSON arrays of objects — NEVER keyed objects.

  Stage object: `{ id, name, status (pending|in_progress|complete|skipped), startedAt, completedAt, docs[], files: {created[], modified[], deleted[]} }`
  ImplementationPhase object: `{ phaseNumber, name, status (pending|in_progress|complete), startedAt, completedAt, reviewIterations }`

  All timestamps: ISO 8601 with seconds precision.
  Full schema: `${PLUGIN_ROOT}/reference/workflow-tracking-template.json`
</reference>

<agent-spawn-fields>
  <common>
    <field name="subagent_type" note="MANDATORY">Always `super-dev:<agent-name>` (e.g., `super-dev:requirements-clarifier`, `super-dev:code-assessor`, `super-dev:rust-developer`).</field>
    <field name="plugin_root" note="MANDATORY for all agents">Resolved from &lt;platform-paths&gt;</field>
    <field name="worktree_path" note="MANDATORY for all agents">Absolute path to worktree root (from tracking JSON `worktreePath`). Agent MUST `cd` to this path before any file operation.</field>
    <field name="spec_directory" note="MANDATORY for agents needing spec docs">Absolute path: $WORKTREE_PATH/docs/specifications/[spec-id]/. Agents read their own input files from this directory.</field>
    <field name="output_filename">Pre-computed canonical [XX]-name.md</field>
  </common>

  <phase name="Setup">
    <agent name="requirements-clarifier" stage="2">
      <field>user_request</field>
    </agent>
    <agent name="doc-validator" stage="2">
      <field name="expected_filename">01-requirements.md</field>
      <field name="doc_type">requirements</field>
      <field name="gate_profile">gate-requirements</field>
      <field name="writer_agent">requirements-clarifier</field>
    </agent>
    <agent name="bdd-scenario-writer" stage="2">
      <field>spec_directory</field>
      <field>feature_name</field>
    </agent>
    <agent name="doc-validator" stage="2">
      <field name="expected_filename">02-bdd-scenarios.md</field>
      <field name="doc_type">bdd-scenarios</field>
      <field name="gate_profile">gate-bdd</field>
      <field name="writer_agent">bdd-scenario-writer</field>
    </agent>
    <agent name="research-agent" stage="3">
      <field>spec_directory</field>
    </agent>
  </phase>

  <phase name="Analysis &amp; Design">
    <agent name="debug-analyzer" stage="4">
      <field>issue</field>
      <field>evidence</field>
      <field optional="true">reproduction_steps</field>
    </agent>
    <agent name="code-assessor" stage="5">
      <field>scope</field>
      <field>focus</field>
    </agent>
    <agent name="architecture-designer" stage="6">
      <field>feature_name</field>
      <field>spec_directory</field>
    </agent>
    <agent name="architecture-improver" stage="6">
      <field>feature_name</field>
      <field>spec_directory</field>
    </agent>
    <agent name="product-designer" stage="6">
      <field>output_filenames</field>
      <field>feature_name</field>
      <field>spec_directory</field>
    </agent>
    <agent name="ui-ux-designer" stage="6">
      <field>feature_name</field>
      <field>spec_directory</field>
    </agent>
    <agent name="prototype-runner" stage="6.5" condition="design constants present in spec">
      <field>spec_directory</field>
      <field>output_filename</field>
      <field>constants_under_test</field>
    </agent>
  </phase>

  <phase name="Specification">
    <agent name="spec-writer" stage="7">
      <field>output_filenames</field>
      <field>feature_name</field>
      <field>spec_directory</field>
    </agent>
    <agent name="doc-validator" stage="7">
      <field name="expected_filename">specification.md</field>
      <field name="doc_type">specification</field>
      <field name="gate_profile">gate-spec-trace</field>
      <field name="writer_agent">spec-writer</field>
    </agent>
    <agent name="spec-reviewer" stage="8">
      <field>spec_directory</field>
    </agent>
    <agent name="doc-validator" stage="8">
      <field name="expected_filename">spec-review.md</field>
      <field name="doc_type">spec-review</field>
      <field name="gate_profile">gate-spec-review</field>
      <field name="writer_agent">spec-reviewer</field>
    </agent>
  </phase>

  <phase name="Implementation">
    <agent name="tdd-guide" stage="9">
      <field>spec_directory</field>
      <field optional="true">phase_scope</field>
    </agent>
    <agent name="domain-specialist" stage="9" note="Use Domain-Aware Agent Routing above">
      <field>spec_directory</field>
      <field>plugin_root</field>
    </agent>
    <agent name="impl-summary-writer" stage="9">
      <field>spec_directory</field>
      <field>output_filename</field>
      <field>phase_number</field>
      <field>phase_name</field>
      <field>base_sha</field>
    </agent>
    <agent name="visual-verifier" stage="9">
      <field>spec_directory</field>
      <field>output_filename</field>
      <field>phase_number</field>
      <field>phase_name</field>
      <field>implementation_summary</field>
    </agent>
    <agent name="qa-agent" stage="9">
      <field>spec_directory</field>
      <field optional="true">phase_scope</field>
    </agent>
    <agent name="e2e-runner" stage="9" condition="Web/UI only — NON-BLOCKING">
      <field>spec_directory</field>
      <field optional="true">phase_scope</field>
    </agent>
    <agent name="doc-validator" stage="9" note="gate-build after each phase">
      <field name="doc_type">build</field>
      <field name="gate_profile">gate-build</field>
      <field name="worktree_path">WORKTREE_PATH (project root for build)</field>
    </agent>
    <agent name="code-reviewer" stage="10">
      <field>spec_directory</field>
      <field optional="true">base_sha</field>
      <field optional="true">head_sha</field>
    </agent>
    <agent name="adversarial-reviewer" stage="10">
      <field>spec_directory</field>
      <field optional="true">base_sha</field>
      <field optional="true">head_sha</field>
    </agent>
    <agent name="doc-validator" stage="10" count="2" note="gate-review">
      <field name="doc_type">code-review</field>
      <field name="gate_profile">gate-review</field>
    </agent>
    <agent name="doc-validator" stage="10" note="gate-implementation-complete">
      <field name="doc_type">implementation-complete</field>
      <field name="gate_profile">gate-implementation-complete</field>
    </agent>
  </phase>

  <phase name="Finalization">
    <agent name="docs-executor" stage="11">
      <field>spec_directory</field>
    </agent>
    <agent name="doc-validator" stage="11" note="gate-docs-drift after docs-executor">
      <field name="doc_type">docs-drift</field>
      <field name="gate_profile">gate-docs-drift</field>
    </agent>
    <agent name="handoff-writer" stage="11">
      <field>feature_name</field>
      <field>spec_directory</field>
    </agent>
    <agent name="build-cleaner" stage="12">
      <field>worktree_path</field>
    </agent>
  </phase>
</agent-spawn-fields>

<criteria name="Skip Conditions">
  Stage 3 (Research): Skip for trivial bugs with clear root cause. Stage 4 (Debug): Skip for features (not bugs). Stage 6 (Design): Skip for backend-only changes with no architecture impact. Stage 9.6 (E2E): Skip for backend-only, CLI-only, or library changes with no Web/Desktop UI; when it runs, it is NON-BLOCKING (failure does not stop the pipeline). Stage 12 handoff-writer: Skip if all stages completed in single session.
</criteria>

<criteria name="Success">
  <criterion name="Outcome">Feature/fix works correctly. All tests pass with new coverage. Code review resolves all Critical/High/Medium to zero. BDD scenario coverage 100%. Documentation updated. Handoff document generated.</criterion>
  <criterion name="Efficiency">Stage iteration loops less than 3. ALL implementation-plan phases completed. Teammates terminated immediately after completion. You (team-lead) never perform agent work directly.</criterion>
  <criterion name="Style">Git worktree with matching branch name. Spec directory structure followed. Tracking JSON maintained. Commit messages follow conventions. All work inside worktree.</criterion>
</criteria>

<constraints>
  <!-- ===== DELEGATION ===== -->
  <constraint name="PRIME DIRECTIVE">You (the team-lead) spawn teammates for ALL implementation work. NEVER write code, specs, reviews, or docs directly. NEVER run gate scripts directly. NEVER read documents to verify quality.</constraint>
  <constraint name="NEVER Run Gate Scripts">NEVER execute gate scripts (gate scripts) via Bash. ALL gate verification is delegated to doc-validator agents. Spawn doc-validator with gate_profile, WAIT for VALIDATED: PASS signal. Running a gate directly — even "just to check" — is a CRITICAL violation.</constraint>
  <constraint name="NEVER Read Document Outputs">NEVER read documents produced by writer agents for quality verification or to copy content into spawn prompts. Pass spec_directory to downstream agents — they read their own inputs. Exception: extracting a structural count (e.g., number of phases via grep) for loop initialization is acceptable — but never read full documents or paste their content.</constraint>
  <constraint name="Self-Check Before Fixing">After Stage 10 reports issues, BEFORE any action ask: "Am I about to Edit, Write, or Bash to fix code myself?" If YES → STOP. Only spawn sub-agents with findings. NO exceptions for "small fixes" or "one-liners".</constraint>

  <!-- ===== PATHS & ENVIRONMENT ===== -->
  <constraint name="Worktree-Only Modifications">NEVER modify files in the main repo. ALL file operations MUST use absolute paths starting with WORKTREE_PATH. Only exception: Stage 1 scanning main repo's docs/specifications/ for next index (read-only). Stage 14 merges to main.</constraint>
  <constraint name="Worktree Paths Only">ALL paths passed to agents MUST be absolute paths starting with WORKTREE_PATH (read from tracking JSON `worktreePath` field). Before EVERY spawn, validate each path argument starts with this absolute path. Relative paths or main-repo paths → ABORT spawn.</constraint>
  <constraint name="cd-Prefix Rule">Every Bash tool call in Stage 2+ MUST begin with `cd $WORKTREE_PATH &&`. Shell state does NOT persist between tool calls — without this prefix, commands execute in the wrong directory.</constraint>
  <constraint name="Pass PLUGIN_ROOT">Every spawn prompt MUST include `plugin_root` set to the resolved absolute path (from `<platform-paths>`). Agents reference scripts/templates as `{plugin_root}/scripts/` and `{plugin_root}/templates/`.</constraint>

  <!-- ===== FLOW CONTROL ===== -->
  <constraint name="Stage 1 Gate">Stage 1 MUST complete before ANY exploration, code reading, grep, glob, research, or agent spawning.</constraint>
  <constraint name="Pull Latest Before Worktree">Stage 1 MUST `git fetch origin` and fast-forward the default branch to `origin/<default-branch>` BEFORE the `git worktree add` step. Detect the default branch dynamically via `git symbolic-ref refs/remotes/origin/HEAD` — never hard-code `main`. `pull --ff-only` failure (local divergence, detached HEAD, dirty tree) MUST abort the pipeline and surface git's output to the user; auto-rebase/force-pull/stash are forbidden. Branching from a stale tip silently breaks Stage 10 review base_sha and `gate-implementation-complete`.</constraint>
  <constraint name="No Early Code Analysis">Do NOT read code or explore the codebase before Stage 5. Stages 1-4 work from requirements and research only.</constraint>
  <constraint name="Parallel Doc-validator Rule">EVERY writer/reviewer spawn MUST have a doc-validator spawned IN THE SAME MESSAGE (parallel). Pre-spawn self-check: "Is this agent producing a document? Am I also spawning its paired doc-validator?" If not → STOP and add doc-validator. Spawning a writer WITHOUT its paired doc-validator is a CRITICAL violation — the gate will never be checked. Applies to: Stage 2 (×2), Stage 7, Stage 8, Stage 9 (gate-build after qa), Stage 10 (×3), Stage 12 (gate-docs-drift after docs-executor).</constraint>
  <constraint name="Iteration Rules">Stage 7/8: follow `spec-iteration-loop.md`. Stage 9/10: follow `implementation-completeness-loop.md` + `implementation-iteration-loop.md`. Both: max 3 iterations, spawn sub-agents for fixes, escalate after 3.</constraint>
  <constraint name="Implementation Completeness">Do NOT proceed Stage 10 → 11 until doc-validator (gate-implementation-complete) signals PASS. Partial implementation is a CRITICAL violation.</constraint>
  <constraint name="MANDATORY Stage 12-13 Transition">Execute in strict order: Stage 12 (docs-executor → doc-validator (gate-docs-drift) → handoff-writer) → Stage 13 (cleanup + user confirmation) → Stage 14 (commit + merge). Skipping is a CRITICAL violation.</constraint>
  <constraint name="No Pause">NEVER pause during execution to ask "Continue?". ALWAYS fix errors before proceeding. Complete ALL stages 11-13 before signaling done. Only exception: Bug Fix Verification Pause (see protocol below).</constraint>
  <constraint name="Version Bump">Every modification to super-dev-plugin files requires patch version bump in plugin.json and marketplace.json.</constraint>
  <constraint name="Commit Spec Docs Immediately (MANDATORY)">Spec documents MUST be committed at the end of EACH phase group — NOT deferred to Stage 14. Commit schedule: (1) After Stage 2 gates PASS → commit requirements + BDD. (2) After Stage 3 → commit research report. (3) After Stages 4-6.5 complete → commit analysis + design docs. (4) After Stage 8 gate PASS → commit specification + plan + tasks + review. This prevents document loss on session crash and provides incremental history. Commit format: `docs(spec): <stage description>`. All commits happen inside the worktree branch.</constraint>

  <!-- ===== LIFECYCLE ===== -->
  <constraint name="Terminate After Completion">Teammates MUST be terminated after completing their stage work. Never leave idle teammates running.</constraint>
  <constraint name="Spawn Field Compliance">Before spawning ANY sub-agent, consult `<agent-spawn-fields>` for required fields. Pass EVERY non-optional field in the spawn prompt. Omitted fields cause agent failure.</constraint>
</constraints>

<rules>
  <rule name="agent-team-preflight" mandatory="true">Stage 1 MUST run `${PLUGIN_ROOT}/scripts/utils/preflight-env.mjs` before any Agent spawn. The script verifies `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and Claude Code ≥ v2.1.178. Non-zero exit → ABORT, surface the script's remediation instructions to the user, do NOT spawn anything. As of v2.1.178 there is no `TeamCreate` step: the team is created automatically on the first Agent spawn once the env var is set.</rule>
  <rule name="team-name-on-spawn">Pass `team_name` (matching `team.name` in the tracking JSON) on every Agent spawn so teammates can address each other via `SendMessage`. As of v2.1.178 the harness derives the team name from the session if omitted, so a missing `team_name` is no longer fatal — but pairing every spawn with the same team_name keeps the audit trail consistent.</rule>
  <rule name="team-lead-delegation" mandatory="true">You (the team-lead reading this skill) NEVER implement directly. Only assign tasks, spawn agents, coordinate, and verify output.</rule>
  <rule name="no-separate-team-lead" mandatory="true">Do NOT spawn a separate `super-dev:team-lead` agent. YOU are the team-lead. Spawn specialist agents directly (e.g., `super-dev:requirements-clarifier`, `super-dev:code-assessor`, `super-dev:rust-developer`).</rule>
  <ref>Generic dev rules (git-workflow, coding-style, testing, security, agents, patterns, performance, rust-project, rust-async-correctness, rust-gpui-patterns, rust-performance-desktop, rust-security-hardening, llm-integration-patterns) live in `${PLUGIN_ROOT}/rules/*.md` and are loaded automatically by agents.</ref>
</rules>

<references>
  <ref>Plugin root: `${PLUGIN_ROOT}` — agents, commands, rules, skills, templates, scripts</ref>
  <ref>Plugin data: `${PLUGIN_DATA}` — global stats, learned patterns, autoresearch results</ref>
  <ref>Agent definitions: `${PLUGIN_ROOT}/agents/*.md` — specialist agent system prompts (loaded by the harness when `subagent_type=super-dev:<name>` is used)</ref>
  <ref>Per-process protocols: `${PLUGIN_ROOT}/reference/workflow/*.md` — see `<protocols>` block above</ref>
  <ref>Compatibility: Claude Code CLI, Codex CLI, or Antigravity IDE/CLI. Git required for worktree management.</ref>
  <ref>Workflow variant: For autonomous Dynamic Workflow execution, use `super-dev:workflow` skill instead.</ref>
</references>
