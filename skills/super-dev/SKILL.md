---
name: super-dev
description: Multi-step development orchestrator for implementing features, fixing bugs, refactoring, optimizing performance, and resolving deprecations
author: Jennings Liu
version: 2.5.9
license: MIT
---

<platform-paths>
  PLUGIN_ROOT:
    claude: ${CLAUDE_PLUGIN_ROOT}
  PLUGIN_DATA:
    claude: ${CLAUDE_PLUGIN_DATA}
  Use whichever value resolved to an actual path (not a literal variable name).
</platform-paths>

<purpose>Team Lead agent team pipeline. The Team Lead orchestrates specialized agent teammates — it NEVER implements directly, only spawns, coordinates, and verifies. Agents execute research, architecture, coding, QA, code review, and documentation stages in parallel where possible.</purpose>

<dispatch mandatory="true">
  **YOU MUST spawn the team-lead agent.** Do NOT implement directly.

  ```
  Agent({
    subagent_type: "super-dev:team-lead",
    prompt: "<the user's full message>"
  })
  ```

  team-lead resolves `${CLAUDE_PLUGIN_ROOT}`, creates worktree, then walks stages 1–13 by spawning specialist agents sequentially. It NEVER implements directly.
</dispatch>

<triggers>Triggers on: "implement", "build", "fix bug", "refactor", "add feature", "develop this", "help me build", "add functionality", "optimize performance", "resolve deprecation", "systematic development". Do NOT trigger on: simple questions, file searches, one-off commands, code explanations, quick edits, non-development tasks.

**Flags** (optional, extracted by team-lead):
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
  <stage n="9" name="Implementation">Sequential TDD sequence per phase: Step 9.1 spawn tdd-guide (write failing tests from req/bdd/spec/plan/tasks, anti-hardcoding enforced) → Step 9.2 spawn domain specialist (make tests pass) → Step 9.3 spawn impl-summary-writer (DOCUMENT) → **Step 9.4 spawn visual-verifier (RENDER ARTIFACT — picks Tier 1 pixel/DOM assertions / Tier 2 render harness / Tier 3 headless screenshot per project type; non-visual phases drop `.non-visual` marker and skip cleanly)** → Step 9.5 spawn qa-agent (run tests, feature-by-feature verification, verify coverage, report) → Step 9.6 spawn e2e-runner (NON-BLOCKING — Web/UI only; failure is logged as a warning but does NOT block the pipeline or trigger iteration). Incremental verification with feature-by-feature commits. Each step MUST complete before the next begins. Gates: doc-validator(gate-visual) after Step 9.4 + doc-validator(gate-build) after Step 9.5 — WAIT for PASS. Loops through ALL implementation-plan phases via Implementation Completeness Loop. See `reference/lessons-learned/spec-29-visual-verification.md#three-disciplines` Discipline B.</stage>
  <stage n="10" name="Code Review">Spawn code-reviewer + adversarial-reviewer + 2x doc-validator (gate-review) + doc-validator (gate-implementation-complete) — 5 parallel. **Reviewer prompts MUST include visual-verifier artifact paths; reviewers MUST `Read` each artifact via the Read tool before issuing verdict — verdicts without artifact inspection are invalid.** Coverage-first review (report EVERY issue including uncertain/low-severity), CONTEST verdict format, community-informed patterns, fresh context mandate (writer/reviewer separation). Gate: gate-review.sh, gate-implementation-complete.sh. On failure: follow Implementation Iteration Loop. **Pivot branch:** if iteration ≥ 2 reveals the spec design is wrong (not the implementation), invoke `reference/workflow/pivot-protocol.md` instead of continuing to iterate.</stage>
  <stage n="11" name="Documentation">Sequential: spawn docs-executor → WAIT for `DOCS_COMPLETE` signal or agent termination → spawn doc-validator (gate-docs-drift) → WAIT for PASS → spawn handoff-writer → WAIT for completion → spawn doc-validator (gate-handoff, conditional — when iteration.loops > 0 OR implementationPhases > 1 OR pivot artifacts present, requires `## AC Coverage Assessment` section listing ACs met as planned / met by alternative mechanism / superseded). Docs-with-code pattern (same commit as code changes), changelog automation from git history, AI-optimized documentation (structured for human + agent consumption). Skip handoff-writer ONLY if all stages completed in a single session (no continuation needed). MANDATORY — do not skip docs-executor. See `reference/lessons-learned/spec-29-visual-verification.md#three-disciplines` Discipline C.</stage>
  <stage n="12" name="Cleanup & Confirmation">Verify all teammates terminated. Spawn build-cleaner agent: intelligent artifact detection based on project type, sensitive data scan (secrets/credentials/API keys — BLOCKING if found), project-type-specific cleanup patterns. Worktree preserved. Then present summary to user for confirmation before merge.</stage>
  <stage n="13" name="Commit and Merge">Git operations: semantic commit format (conventional commits with scope, breaking change markers, AC-ID traceability), PR description auto-generation from specification, pre-merge CI-equivalent checks. Commit spec directory + code, merge to main. Verify completion; worktree preserved for reference.</stage>
</stages>

<protocols>
  Lazy-loaded per-process protocol files. Read each one at its triggering stage — NOT at pipeline start.

  <protocol stage="1" file="reference/workflow/specification-setup.md">Spec index, worktree creation, tracking JSON format. Read at Stage 1 entry.</protocol>
  <protocol stage="1" file="reference/workflow/first-run-config.md">Project stack auto-detect and config write. Read once on first run per project.</protocol>
  <protocol stage="2,3,4,5,6,7,8,9,10,11" file="reference/workflow/document-naming.md">Pre-compute exact filenames before spawning writers. Canonical suffix table. Read before any document-producing spawn.</protocol>
  <protocol stage="2,3,7,8,9,10,11" file="reference/workflow/verification-gates.md">Gate execution and failure handling. Read before first gate of the pipeline.</protocol>
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
  <criterion name="Style">Git worktree with matching branch name. Spec directory structure followed. Tracking JSON maintained. Commit messages follow conventions. All work inside worktree.</criterion>
</criteria>

<constraints>
  <constraint name="NEVER Run Gate Scripts">Team Lead NEVER executes gate scripts (gate-*.sh) via Bash. ALL gate verification is delegated to doc-validator. Spawn doc-validator with gate_profile, WAIT for VALIDATED: PASS signal. Running a gate directly — even "just to check" — is a CRITICAL violation.</constraint>
  <constraint name="NEVER Read Document Outputs">Team Lead NEVER reads documents produced by writer agents for quality verification or to copy content into spawn prompts. Pass spec_directory to downstream agents — they read their own inputs. Exception: extracting a structural count (e.g., number of phases via grep) for loop initialization is acceptable — but never read full documents or paste their content.</constraint>
  <constraint name="Worktree-Only Modifications">NEVER modify files in the main repo. ALL file operations MUST use absolute paths starting with WORKTREE_PATH. Only exception: Stage 1 scanning main repo's docs/specifications/ for next index (read-only). Stage 13 merges to main.</constraint>
  <constraint name="Iteration Rules">Stage 7/8: follow `spec-iteration-loop.md`. Stage 9/10: follow `implementation-completeness-loop.md` + `implementation-iteration-loop.md`. Both: max 3 iterations, spawn sub-agents for fixes, escalate after 3.</constraint>
  <constraint name="Version Bump">Every modification to super-dev-plugin files requires patch version bump in plugin.json and marketplace.json.</constraint>
  <constraint name="Stage 1 Gate">Stage 1 MUST complete before ANY exploration, code reading, grep, glob, research, or agent spawning.</constraint>
  <constraint name="Pull Latest Before Worktree">Stage 1 MUST `git fetch origin` and fast-forward the default branch to `origin/<default-branch>` BEFORE the `git worktree add` step. Detect the default branch dynamically via `git symbolic-ref refs/remotes/origin/HEAD` — never hard-code `main`. `pull --ff-only` failure (local divergence, detached HEAD, dirty tree) MUST abort the pipeline and surface git's output to the user; auto-rebase/force-pull/stash are forbidden. Branching from a stale tip silently breaks Stage 10 review base_sha and `gate-implementation-complete`.</constraint>
  <constraint name="No Early Code Analysis">Do NOT read code or explore the codebase before Stage 5. Stages 1-4 work from requirements and research only.</constraint>
  <constraint name="Parallel Doc-validator Rule">EVERY writer/reviewer spawn MUST have a doc-validator spawned IN THE SAME MESSAGE (parallel). Pre-spawn self-check: "Is this agent producing a document? Am I also spawning its paired doc-validator?" If not → STOP and add doc-validator. Spawning a writer WITHOUT its paired doc-validator is a CRITICAL violation — the gate will never be checked. Applies to: Stage 2 (×2), Stage 7, Stage 8, Stage 9 (gate-build after qa), Stage 10 (×3), Stage 11 (gate-docs-drift after docs-executor).</constraint>
  <constraint name="MANDATORY Stage 11-13 Transition">Execute in strict order: Stage 11 (docs-executor → doc-validator (gate-docs-drift) → handoff-writer) → Stage 12 (cleanup + user confirmation) → Stage 13 (commit + merge). Skipping is a CRITICAL violation.</constraint>
  <ref>Team Lead operational constraints (worktree paths in spawn prompts, cd-prefix, delegation mode, implementation completeness, teammate termination) live in `agents/team-lead.md` — not duplicated here.</ref>
</constraints>

<rules>
  <rule name="agent-team-preflight" mandatory="true">Stage 1 MUST run `${PLUGIN_ROOT}/scripts/preflight-env.sh` before any Agent spawn. The script verifies `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and Claude Code ≥ v2.1.178. Non-zero exit → ABORT, surface the script's remediation instructions to the user, do NOT spawn anything. As of v2.1.178 there is no `TeamCreate` step: the team is created automatically on the first Agent spawn once the env var is set.</rule>
  <rule name="team-name-on-spawn">Pass `team_name` (matching `team.name` in the tracking JSON) on every Agent spawn so teammates can address each other via `SendMessage`. As of v2.1.178 the harness derives the team name from the session if omitted, so a missing `team_name` is no longer fatal — but pairing every spawn with the same team_name keeps the audit trail consistent.</rule>
  <rule name="team-lead-delegation" mandatory="true">Team Lead NEVER implements directly. Only assigns tasks, spawns agents, coordinates, and verifies output.</rule>
  <ref>Generic dev rules (git-workflow, coding-style, testing, security, agents, patterns, performance, rust-project, rust-async-correctness, rust-gpui-patterns, rust-performance-desktop, rust-security-hardening, llm-integration-patterns) live in `${PLUGIN_ROOT}/rules/*.md` and are loaded automatically.</ref>
</rules>

<references>
  <ref>Plugin root: `${PLUGIN_ROOT}` — agents, commands, rules, skills, templates, scripts</ref>
  <ref>Plugin data: `${PLUGIN_DATA}` — global stats, learned patterns, autoresearch results</ref>
  <ref>Per-process protocols: `${PLUGIN_ROOT}/reference/workflow/*.md` — see `<protocols>` block above</ref>
  <ref>Compatibility: Claude Code CLI, Codex CLI, or Antigravity IDE/CLI. Git required for worktree management.</ref>
  <ref>Workflow variant: For autonomous Dynamic Workflow execution, use `super-dev:workflow` instead.</ref>
</references>
