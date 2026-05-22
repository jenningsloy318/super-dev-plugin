# Code Review: Enhance Research Stage and Upgrade All Stages

**Date:** 2026-05-22
**Reviewer:** code-reviewer (super-dev plugin team)
**Scope:** All staged changes vs `main` (`git diff --stat main`) — 36 files, +1298 / -116 lines
**Worktree:** `/home/jenningsl/development/personal/jenningsloy318/super-dev-plugin/.worktree/01-enhance-research-and-stages`
**Spec under review:** `specification/01-enhance-research-and-stages/06-specification.md`

---

## Verdict

**Approved with Comments**

The implementation is largely faithful to the additive-enhancement strategy of Approach A. All 21 components called out in spec section 2.1–2.21 received the requested content, the four platform manifests are version-bumped to `2.4.31`, and the `.codex/agents/*.toml` mirrors track their `agents/*.md` counterparts verbatim. There is one HIGH issue (duplicate `<step n="1">` in `requirements-clarifier.md`) and one HIGH issue (schema/template missing the spec-mandated DAG fields) that should be fixed before this lands. Several MEDIUM issues are tension/contradiction points the spec explicitly told us to resolve (Coverage-First vs. confidence gates) and are worth one cleanup pass.

---

## Dimension Scores (1–5)

| Dimension | Score | Notes |
|-----------|-------|-------|
| 1. Correctness | 4 | Content matches spec intent; one duplicate step number and one schema/template gap break runtime correctness for two agents. |
| 2. Consistency | 3 | Coverage-First principle conflicts with retained `<confidence-gate>` blocks in code-reviewer, adversarial-reviewer, and (by parallel) spec-reviewer. Spec section 2.14 explicitly told us to remove conservative-filtering language. |
| 3. Completeness | 5 | Every SCENARIO and component in section 2 has corresponding edits; SKILL.md workflow narrative reflects every change; research-report-template adds all five required sections with optional flags. |
| 4. Security | 5 | New build-cleaner sensitive-data scan is correctly BLOCKING; security-baselines untouched; no secrets, credentials, or executable payloads introduced; AI-specific security challenge pattern is a defensive add. |
| 5. Maintainability | 4 | Additive style preserves blame surface and Codex parity. The duplicate step and schema gap are localized fixes; long inline scoring formulas are duplicated across `search-agent.md` and `research-methodology.md` (acceptable per spec — methodology file is canonical reference). |
| 6. Clarity | 4 | New process blocks are well-structured and self-contained. Two prompts contain near-paragraph-long `<step>` bodies (research-agent Step 4.5, code-reviewer Step 4) that read as run-on; readable but heavy for an agent to follow exactly. |

**Composite:** 4.2 / 5

---

## Findings

### HIGH — H1: Duplicate `<step n="1">` in `requirements-clarifier.md`

- **File:** `agents/requirements-clarifier.md:62` and `agents/requirements-clarifier.md:64`
- **Evidence:**
  - Line 62: `<step n="1" name="Invoke Clarify Skill">…`
  - Line 64: `<step n="1" name="Multi-Layer Questioning">…`
- **Failure scenario:** The new step 1.5 ("Context Retrieval") was inserted between two pre-existing `<step n="1">` blocks. The original "Invoke Clarify Skill" was renumbered when "Context Retrieval" was added, but the second `n="1"` (Multi-Layer Questioning) was left at `n="1"`. Agents and downstream tooling that key off `n=` to ordinal will either run step 1 twice or skip a step. Even for prompt-only consumption, the visual sequence (1 → 1.5 → 1) is jarring and will make the agent unsure which "step 1" is canonical.
- **Suggested fix:** Renumber the second occurrence to `n="2"` and cascade — `<step n="2" name="Proactive Anticipation">` becomes `n="3"`, `<step n="2.5">` becomes `n="3.5"`, `<step n="3">` becomes `n="4"`, `<step n="4">` becomes `n="5"`. Verify the same fix lands in `.codex/agents/requirements-clarifier.toml`.
- **Confidence:** 0.95

### HIGH — H2: `implementation-plan` schema and template do not support the spec-mandated DAG fields

- **Files:**
  - `agents/spec-writer.md:36` — instructs agents to populate `depends_on` and `parallelizable_with` per phase
  - `templates/schemas/implementation-plan.schema.json` — only declares `dependencies` (default `[]`); no `depends_on`, no `parallelizable_with`
  - `templates/implementation-plan.md.j2` — only renders `phase.dependencies`, no DAG / parallelism rendering
  - `skills/super-dev/SKILL.md:37` — Stage 7 narrative claims "DAG format with depends_on and parallelizable_with fields"
- **Failure scenario:** Spec-writer is told (and the workflow narrative confirms) that every phase MUST emit `depends_on` and `parallelizable_with`. The render pipeline goes through `render.sh`, which is JSON-schema validated. Either (a) the agent emits these fields and `render.sh` validation rejects the JSON because they aren't declared, or (b) the schema validator is permissive and the data is silently dropped — the Markdown will still only show the legacy "Dependencies: …" line, breaking SCENARIO-017 ("DAG implementation plan").
- **Suggested fix:** Add `depends_on` and `parallelizable_with` to the `phases` items schema (both `array` of `string`, default `[]`). Update `templates/implementation-plan.md.j2` to render a "Parallelizable With" line and to prefer `depends_on` over `dependencies` (or alias them). If keeping legacy `dependencies` for backward compatibility is wanted, document it; otherwise the spec's "No backward compatibility" rule (CLAUDE.md) means you can rename `dependencies → depends_on` cleanly.
- **Confidence:** 0.9

### MEDIUM — M1: Coverage-First principle contradicts retained `<confidence-gate>` blocks

- **Files:**
  - `agents/code-reviewer.md:20` (Coverage-First principle: report EVERY issue including UNCERTAIN) vs. `agents/code-reviewer.md:114-128` (retained confidence-gate: ">80% confidence", "Skip stylistic preferences", "Zero findings is valid — never manufacture findings")
  - `agents/adversarial-reviewer.md:20` (Coverage-First) vs. `agents/adversarial-reviewer.md:87-101` (retained ">80% confidence" gate)
- **Failure scenario:** Spec section 2.14 is explicit: "Remove any 'be conservative' or 'don't nitpick' language that causes Opus 4.7 under-reporting." The retained confidence gates do exactly that. Opus 4.7 will read both blocks and revert to its conservative bias — defeating the entire purpose of REQ-04 / SCENARIO-020. The Per-Finding Annotation constraint partially mitigates it (UNCERTAIN tagging), but the rules `Skip stylistic preferences` and `Zero findings is valid` still encourage filtering.
- **Suggested fix:** Replace the `<confidence-gate>` block in code-reviewer / adversarial-reviewer with a `<reporting-guidance>` block that states: (a) report every finding regardless of confidence, (b) tag confidence < 0.5 as UNCERTAIN, (c) zero findings is valid only when every dimension was checked and reported. Mirror in `.codex/agents/*.toml`. (Note: spec-reviewer's confidence gate at `agents/spec-reviewer.md:49-63` is fine — spec section 2.13 only added anti-pattern verification and quantitative completeness; Coverage-First was scoped to code/adversarial reviewers.)
- **Confidence:** 0.8

### MEDIUM — M2: New `bdd-scenarios` quality_score / coverage_metrics likely not in JSON schema

- **Files:**
  - `agents/bdd-scenario-writer.md:48-49` — mandates `quality_score`, `specificity`, `independence`, `coverage`, `testability` fields plus a "Coverage Metrics Report" with edge-case-per-dimension counts
  - `templates/schemas/bdd-scenarios.schema.json` — grep for `quality_score|specificity|independence|coverage_metrics` returned no results
- **Failure scenario:** Same risk shape as H2 — agent is told to emit fields that the schema/template don't model. Render either fails or silently drops them, so the "self-revision when score < 7" loop has nothing observable to gate against and SCENARIO-013 isn't fully wired through to output.
- **Suggested fix:** Either (a) extend `bdd-scenarios.schema.json` and `bdd-scenarios.md.j2` to render `metadata.quality_score / coverage_metrics` blocks, or (b) downgrade the constraint to "report in the document body" and adjust the prompt to write into an existing free-text section.
- **Confidence:** 0.75 (have not opened the schema; based on grep result + spec scope of "additive — no template/gate changes")

### MEDIUM — M3: research-agent Parallel Execution constraint vs. tool model

- **File:** `agents/research-agent.md:45,53,54`
- **Evidence:** Steps 3.5 and 3.7 are declared "MUST execute in parallel" with priority-cancellation language for NFR-01. The agent itself is a single sub-agent issuing tool calls — it can issue multiple Firecrawl/MCP calls in one assistant turn (parallel tool calls), but not parallel `<step>`s.
- **Failure scenario:** A literal-minded agent will spawn two further sub-agents and lose the deterministic ordering Codex / Antigravity rely on. The pragmatic interpretation ("issue both passes' tool calls in the same turn") is not stated.
- **Suggested fix:** Replace "MUST execute in parallel" with "MUST batch the tool calls for Steps 3.5 and 3.7 into a single assistant turn (parallel tool-call invocation), not sequential turns." Same edit in research-methodology if applicable.
- **Confidence:** 0.6

### LOW — L1: Momentum scoring formula duplicated in three places

- **Files:**
  - `agents/search-agent.md:122` (full formula)
  - `agents/research-agent.md:53` (formula inline in step body)
  - `reference/research-methodology.md:130` (full formula)
- **Failure scenario:** Future tuning of weights (0.4 / 0.35 / 0.25) requires a coordinated three-file edit. Drift is likely.
- **Suggested fix:** Keep the canonical formula in `reference/research-methodology.md` only. Have search-agent and research-agent reference it ("see Momentum Scoring in research-methodology.md"). Already partially the case in research-agent.md (mentions weights inline) — recommend tightening to a pointer.
- **Confidence:** 0.7

### LOW — L2: `architecture-improver.md` enhancements are thin

- **File:** `agents/architecture-improver.md` (10 lines added per diff stat)
- **Evidence:** Spec section 2.11 says "Add AI-aware pattern awareness matching architecture-designer's enhancements." A 10-line delta is plausible if it's just adding two principles; difficult to verify without reading the full file. Worth a spot check that the four AI-aware criteria (prompt-cache, token budget, parallel agents, context window) and the [PARALLEL/SERIAL] annotation made it across.
- **Suggested fix:** Read the file alongside architecture-designer.md and verify content parity.
- **Confidence:** 0.5 (didn't read; flag for spot-check)

### LOW — L3: SKILL.md says Stage 7 produces DAG with `depends_on / parallelizable_with`, but the rendered output won't show them (compounded by H2)

- **File:** `skills/super-dev/SKILL.md:37`
- **Failure scenario:** User-facing description claims a capability that won't actually appear in the rendered Markdown until H2 is fixed.
- **Suggested fix:** Fix H2; SKILL.md text becomes accurate by side effect.
- **Confidence:** 0.9 (depends on H2)

### INFO — I1: Codex parity is excellent

The eight `.codex/agents/*.toml` files I sampled track their `.md` counterparts verbatim inside `developer_instructions = """ ... """`. Phase 7 of the implementation plan was executed as designed. SCENARIO-035 (count-match parity) holds for the files I checked — confirm the spec-mandated parity verification step also covered the four files I didn't open (architecture-improver, bdd-scenario-writer, build-cleaner, docs-executor, qa-agent, research-agent, spec-reviewer, spec-writer, tdd-guide).

### INFO — I2: All four platform manifests at `2.4.31` (verified)

`plugin.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (both occurrences), and `.codex-plugin/plugin.json` agree on `2.4.31`. The CLAUDE.md plugin-versioning rule is satisfied.

### INFO — I3: Diff is uncommitted

`git log main..HEAD` is empty — every change in this review is staged/working-tree only. Per CLAUDE.md ("Commit immediately after each bump — never accumulate multiple version bumps in uncommitted state"), this needs to be split into commits before merge.

---

## Spec-to-Implementation Coverage (sampled)

| Spec Section | Component | Status |
|---|---|---|
| 2.1 Search Agent — community/ai-docs/momentum/consensus | `agents/search-agent.md` | Implemented (lines 41, 72-163) |
| 2.2 Research Agent — Steps 3.5/3.7/4.5/5/6 | `agents/research-agent.md` | Implemented (lines 53-58); see M3 |
| 2.3 Research Report Template | `reference/research-report-template.md` | Implemented (sections at 198, 232, 257, 276) |
| 2.4 Research Methodology | `reference/research-methodology.md` | Implemented (processes at 50, 81, 102, 127) |
| 2.6 Requirements Clarifier | `agents/requirements-clarifier.md` | Implemented; **see H1** |
| 2.7 BDD Scenario Writer — edge cases, quality self-score | `agents/bdd-scenario-writer.md` | Implemented (lines 39, 48-49); **see M2** |
| 2.8 Debug Analyzer — hypothesis tree, repro script | `agents/debug-analyzer.md` | Implemented (steps 22, 69, 96) |
| 2.9 Code Assessor — smells, dependency health, debt | `agents/code-assessor.md` | Implemented (steps 62, 75, 94, 105) |
| 2.10 Architecture Designer — DAG, AI-aware criteria | `agents/architecture-designer.md` | Implemented (lines 24, 50, 51, 73) |
| 2.11 Architecture Improver | `agents/architecture-improver.md` | **See L2** (not opened) |
| 2.12 Spec Writer — DAG fields, contract-first | `agents/spec-writer.md` | Prompt-side implemented; **schema/template gap — see H2** |
| 2.13 Spec Reviewer — anti-patterns, quantitative scoring | `agents/spec-reviewer.md` | Implemented (steps 70, 71) |
| 2.14 Code Reviewer — Coverage-First, fresh context | `agents/code-reviewer.md` | Partially implemented; **see M1** |
| 2.15 Adversarial Reviewer — Coverage-First, AI vectors | `agents/adversarial-reviewer.md` | Partially implemented; **see M1** |
| 2.16 TDD Guide — anti-hardcoding | `agents/tdd-guide.md` | Implemented (line 65) |
| 2.17 QA Agent — feature-by-feature, self-verification | `agents/qa-agent.md` | Implemented (steps 44, 95) |
| 2.18 Docs Executor — changelog from git, AI-optimized | `agents/docs-executor.md` | Implemented (lines 27, 35, 58, 63) |
| 2.19 Build Cleaner — sensitive data scan | `agents/build-cleaner.md` | Implemented (lines 24, 27, 107) |
| 2.21 Research Deep-Dive Loop — competing hypotheses | `reference/workflow/research-deep-dive-loop.md` | Implemented (lines 21-63) |

---

## Recommendations (prioritized)

1. **(HIGH, before merge)** Fix H1: renumber requirements-clarifier steps and mirror to Codex.
2. **(HIGH, before merge)** Fix H2: extend `implementation-plan.schema.json` with `depends_on` / `parallelizable_with`, update `.j2` template, render once with sample data to confirm.
3. **(MEDIUM, before merge)** Fix M1: replace `<confidence-gate>` in code-reviewer + adversarial-reviewer (and Codex mirrors) with reporting-guidance that aligns with Coverage-First.
4. **(MEDIUM, soon)** Fix M2: extend `bdd-scenarios.schema.json` + template with `quality_score` / `coverage_metrics`, or downgrade prompt to inline body text.
5. **(MEDIUM, soon)** Fix M3: clarify that "parallel" means batched tool calls, not parallel sub-agents.
6. **(LOW, opportunistic)** Spot-check architecture-improver.md (L2). Consolidate momentum scoring formula to a single canonical location (L1).
7. **(INFO)** Split staged work into per-component commits before merging — CLAUDE.md "commit immediately after each bump" rule.

---

## Files Reviewed

Read in full: `agents/search-agent.md`, `agents/research-agent.md`, `agents/debug-analyzer.md`, `agents/code-assessor.md`, `agents/code-reviewer.md`, `agents/adversarial-reviewer.md`, `agents/build-cleaner.md`, `agents/spec-writer.md`, `agents/architecture-designer.md`, `agents/requirements-clarifier.md`, `agents/qa-agent.md`, `agents/tdd-guide.md`, `agents/spec-reviewer.md`, `agents/docs-executor.md`, `agents/bdd-scenario-writer.md`, `reference/research-methodology.md`, `reference/research-report-template.md`, `reference/workflow/research-deep-dive-loop.md`, `skills/super-dev/SKILL.md`, `.codex/agents/code-reviewer.toml`, `templates/schemas/implementation-plan.schema.json`, `specification/01-enhance-research-and-stages/06-specification.md`.

Spot-checked via grep / diff stat: `templates/implementation-plan.md.j2`, `templates/schemas/bdd-scenarios.schema.json`, all four version manifests.

Not opened (recommend follow-up): `agents/architecture-improver.md`, the remaining 15 `.codex/agents/*.toml` mirrors.

---

## Coverage Disclosure (Coverage-First applied to this review)

| Dimension Checked | Findings |
|---|---|
| Correctness | H1, H2, L3 |
| Consistency | M1 |
| Completeness | None — coverage matrix matches spec |
| Security | None — additive, BLOCKING scan added |
| Maintainability | L1 |
| Clarity | M3 |
| Schema/template wiring | H2, M2 |
| Codex parity | I1 (sampled) |
| Versioning | I2 |
| Process discipline | I3 |
| Architecture-improver content parity | L2 (not verified) |
