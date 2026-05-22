# Implementation Plan: Enhance Research Stage and Upgrade All Stages

**Date:** 2026-05-22
**Phases:** 7 (sequential with internal parallelism)
**Total Files:** ~41 modified
**Total Lines Added:** ~735-930 (estimated)

---

## Phase 1: Foundation (Templates + Search Agent)

**Dependencies:** None (starting point)
**Estimated Complexity:** High (foundational — all subsequent phases depend on this)

### Files to Modify

#### 1.1 reference/research-report-template.md

**Specific Changes:**
- Add "Community Discoveries" section with Community Pulse subsection AFTER "Implementation Considerations" and BEFORE "Contradictions Found"
  - Table: ID (COM-NNN), Insight, Source, Date, Momentum (0-1), Consensus flag
  - Community Pulse: active discussions, pain points, novel solutions
  - Momentum formula rule block
- Add "New Technologies and Approaches" section
  - Table: Technology, First Release, Maturity, Innovation Potential (0-1), Relevance, Source
  - Innovation potential formula rule block
  - Only include if innovation_potential > 0.4
- Add "AI Workflow Patterns" section
  - Table: Pattern, Category (Prompt Engineering/Agent Coordination/Tool Use/Context Management), Source, Applicability
- Add "Internal Improvement Suggestions" section
  - List items: IMP-NNN, technique, stage improved, impact (High/Medium/Low), implementation sketch
  - Fallback: "No internal improvement opportunities identified."
- Add "Innovation/Momentum" row to existing Options Comparison matrix
- Update Gate Compliance Notes with new rules (COM-NNN format, IMP-NNN format, numeric score ranges, optional section handling)

#### 1.2 reference/research-methodology.md

**Specific Changes:**
- Add `<process name="Community Source Discovery">` — site-filtered searches, quality thresholds, momentum scoring, consensus detection, NFR-02 freshness enforcement
- Add `<process name="AI Documentation Traversal">` — provider-by-provider search, pattern extraction, applicability assessment
- Add `<process name="Innovation Discovery">` — recent technology search, cross-domain exploration, filtering criteria, innovation potential scoring
- Add `<process name="Momentum Scoring">` — full formula with engagement/recency/authority weights and threshold definitions

#### 1.3 agents/search-agent.md

**Specific Changes:**
- Add `community` mode to modes list with description of site-filtered search behavior and quality thresholds
- Add `ai-docs` mode to modes list with provider matrix (Anthropic, OpenAI, Google, Frameworks) and search topics
- Add momentum scoring subsection within authority/scoring section: formula, weight definitions, threshold values
- Add emerging consensus detection logic: 3+ independent sources within 6 months converging on same recommendation
- Add innovation discovery mode guidance for < 12-month technology searches
- Add cross-domain search mode guidance for adjacent ecosystem exploration

---

## Phase 2: Core Research Agent

**Dependencies:** Phase 1 complete (research-agent references template sections and search modes)
**Estimated Complexity:** High (largest single agent change)

### Files to Modify

#### 2.1 agents/research-agent.md

**Specific Changes:**
- Add Step 3.5 "Community Discovery Pass" — invoke search-agent `community` mode, apply momentum scoring, populate Community Discoveries template section
- Add Step 3.7 "AI Documentation Traversal" — invoke search-agent `ai-docs` mode, extract workflow patterns, populate AI Workflow Patterns template section
- Add Step 4.5 "Innovation Discovery" — search for technologies < 12 months, cross-domain patterns, score innovation potential, populate New Technologies section
- Enhance Step 5 "Synthesize" — add Innovation/Momentum to comparison matrix, add emerging consensus detection pass, label cross-domain findings with origin domain
- Enhance Step 6 "Flag Issues" — add self-improvement check: "Does this technique improve the super-dev workflow itself?" If yes → populate Internal Improvement Suggestions section
- Add parallel execution note: Steps 3.5 and 3.7 can run concurrently (NFR-01 compliance)
- Add graceful degradation constraint: if community/AI sources unreachable, proceed with available sources, note in Limitations section

#### 2.2 reference/workflow/research-deep-dive-loop.md

**Specific Changes:**
- Add "Competing Hypotheses Variant" section: when topic is complex/contentious, team-lead may spawn 2-3 research-agent instances with different angles (performance, DX, innovation)
- Add synthesis step: compare reports for agreement/disagreement/gaps, final report takes strongest findings
- Add community deep-dive option: when community signals are unresolved after first pass, focused re-search on specific community platforms

#### 2.3 agents/team-lead.md (Stage 3 + general updates)

**Specific Changes:**
- Stage 1 section: add note about improved auto-detection (detect language, framework, test runner, CI from filesystem indicators, write to workflow-tracking.json)
- Stage 3 section: update to mention community + AI-doc search passes, note competing hypotheses mode for complex topics
- Add general constraint: effort level recommendations per stage (research/design: xhigh, implementation: xhigh, review: high, docs/cleanup: medium)
- Add post-workflow section: recognize "Internal Improvement Suggestions" from research report, present to user after workflow completion (AC-30)
- Stage 13 section: add semantic commit format guidance, PR description auto-generation from spec, pre-merge CI-equivalent checks, breaking change markers, AC-ID traceability

---

## Phase 3: Analysis Agents (Parallelizable)

**Dependencies:** Phase 2 complete (team-lead context established)
**Estimated Complexity:** Medium
**Parallelizable:** All 4 files can be modified independently

### Files to Modify

#### 3.1 agents/requirements-clarifier.md

**Specific Changes:**
- Add principle: "Codebase-Grounded Requirements" — search for similar features before generating ACs
- Add step 1.5: "Context Retrieval" — search codebase for similar features/patterns, identify naming conventions, module boundaries, test patterns
- Enhance ambiguity detection: add systematic categorization (Scope, Behavior, Data, Integration, Performance)

#### 3.2 agents/bdd-scenario-writer.md

**Specific Changes:**
- Add step 2.5: "Edge Case Generation" — systematically generate edge cases after happy-path scenarios (null/empty inputs, boundary values, concurrent access, timeouts, permission boundaries, data overflow, invalid state transitions)
- Add constraint: "Quality Self-Score" — self-assess 1-10 against specificity, independence, coverage breadth, testability. Score < 7 triggers self-revision. Report score in output.

#### 3.3 agents/debug-analyzer.md

**Specific Changes:**
- Add principle: "Chain-of-Thought Traces" — explicit step-by-step reasoning traces, logical chain from observation to conclusion
- Enhance Step 4 (Multi-Hypothesis): restructure from flat list to tree with sub-hypotheses and probability estimates summing to 100% per level
- Add step 5.5: "Automated Reproduction Script" — generate standalone reproduction script that deterministically triggers the bug
- Enhance Step 1 (Reproduction Strategy): add item "9. Community search — search GitHub Issues and Stack Overflow for identical error messages/symptoms"
- Add gotcha: for complex bugs, note team-lead may spawn parallel debug-analyzer instances (competing hypotheses)

#### 3.4 agents/code-assessor.md

**Specific Changes:**
- Add principle: "Subagent Exploration" — for large codebases, spawn exploration subagents for each assessment dimension, synthesize summaries
- Add step 2.5: "Architecture Smell Detection" — check for God Class, Feature Envy, Shotgun Surgery, Divergent Change, Inappropriate Intimacy with file:line evidence
- Enhance Step 3 (Dependencies): add community signals dimension (last commit date, open CVEs, GitHub stars trend, npm/crates downloads, maintenance status). Score: Healthy/Warning/Critical
- Add step 4.5: "Pattern Library Extraction" — identify 3-5 canonical patterns (naming, error handling, state management, testing, file organization) with file:line examples
- Enhance Step 5 (Options): add structured technical debt inventory (severity, effort hours, blast radius, priority: Now/Soon/Eventually/Never)

---

## Phase 4: Design & Spec Agents

**Dependencies:** Phase 3 complete (code-assessor pattern library informs architecture)
**Estimated Complexity:** Medium
**Internal order:** architecture-designer → architecture-improver → spec-writer → spec-reviewer (serial)

### Files to Modify

#### 4.1 agents/architecture-designer.md

**Specific Changes:**
- Add principle: "Task Graph Thinking" — structure implementation plans as DAGs, identify parallel vs serial tasks
- Enhance Step 3 (Interface Design): add guidance that interfaces should ENABLE parallel implementation, mark parallelizable modules
- Enhance Step 4 (Generate Options): add AI-aware evaluation criteria (prompt caching friendliness, token budget efficiency, parallel agent execution potential, context window sustainability)
- Add constraint: "Parallelism Annotation" — architecture document MUST annotate [PARALLEL: A, B, C] vs [SERIAL: D → E → F]

#### 4.2 agents/architecture-improver.md

**Specific Changes:**
- Add principle: "AI-Aware Improvement" — consider prompt caching, token efficiency, parallel execution potential when suggesting improvements
- Enhance evaluation criteria to match architecture-designer's AI-aware additions
- Add context engineering awareness: just-in-time context retrieval, structured note-taking, sub-agent architectures

#### 4.3 agents/spec-writer.md

**Specific Changes:**
- Enhance Step 3 (Implementation Plan): structure as dependency graph (DAG) with `depends_on` and `parallelizable_with` fields per phase
- Enhance Step 2 (Specification): add AI-consumable format guidance (XML tags, machine-parseable AC IDs, SCENARIO-ID references, long context at TOP/queries at BOTTOM)
- Add constraint: "Contract-First" — every module interface MUST have explicit I/O type signatures

#### 4.4 agents/spec-reviewer.md

**Specific Changes:**
- Add step 3.5: "Anti-Pattern Verification" — check for YAGNI violations, premature optimization, untestable requirements, missing error paths, gold-plating
- Enhance completeness check: quantitative percentage (ACs addressed / total × 100). < 100% = automatic rejection
- Enhance grounding check: numeric score (verified_references / total × 100). < 90% = HIGH finding

---

## Phase 5: Review Agents (Parallelizable)

**Dependencies:** Phase 4 complete
**Estimated Complexity:** Medium
**Parallelizable:** All 4 files can be modified independently

### Files to Modify

#### 5.1 agents/code-reviewer.md

**Specific Changes:**
- Add principle: "Coverage-First (Anthropic Opus 4.7)" — report EVERY issue including uncertain/low-severity ones. Goal is coverage, not filtering. Downstream filter ranks.
- Add constraint: "Fresh Context Mandate" — never review code you generated. Writer/reviewer separation.
- Enhance Step 4 (Dimension Reviews): add per-finding annotation requirement (severity, confidence 0.0-1.0, file:line, failure scenario, suggested fix). Confidence < 0.5 tagged UNCERTAIN.
- Remove any "be conservative"/"don't nitpick"/"only report high-severity" language

#### 5.2 agents/adversarial-reviewer.md

**Specific Changes:**
- Add principle: "Coverage-First" — report every finding including uncertain ones
- Enhance attack vectors: add AI-specific patterns (prompt injection in user-facing inputs, token budget exhaustion, context window overflow, sensitive data leakage, non-deterministic security-critical paths)
- Add constraint: "Fresh Context" — adversarial review must operate in clean context
- Update security vulnerability detection references

#### 5.3 agents/tdd-guide.md

**Specific Changes:**
- Add constraint: "Anti-Hardcoding (MANDATORY)" — implement actual logic, never hardcoded returns. Test passing from hardcoded value = meaningless test.
- Add principle: "Feature-Complete Verification" — completion signal is passing tests, not code commit
- Enhance process: test ordering guidance (simplest constraining test first → boundaries → error cases). Never write all tests before any implementation.

#### 5.4 agents/qa-agent.md

**Specific Changes:**
- Add step 2.5: "Feature-by-Feature Verification" — for each feature: (a) happy path end-to-end, (b) edge cases from BDD, (c) error handling. Per-feature pass/fail status.
- Add constraint: "Self-Verification" — execute tests before reporting, never report from code inspection alone
- Add enhancement for Web/UI: Playwright MCP for browser automation when available

---

## Phase 6: Finalization Agents

**Dependencies:** Phase 5 complete
**Estimated Complexity:** Medium

### Files to Modify

#### 6.1 agents/docs-executor.md

**Specific Changes:**
- Add principle: "AI-Optimized Documentation" — structured metadata, machine-readable cross-references, consistent heading hierarchy for human + AI consumption
- Add step 1.5: "Changelog from Git" — parse git log/diff, classify by conventional commit type (feat/fix/refactor/docs), include breaking change markers
- Enhance API docs: extract from type definitions and interface signatures, not manual writing
- Add constraint: "Handoff as Memory" — format handoff with memory-compatible frontmatter (name, description, type fields)

#### 6.2 agents/build-cleaner.md

**Specific Changes:**
- Add step 1.5: "Sensitive Data Scan" — pattern-match for .env with values, API keys, credentials, private keys, tokens (AWS keys, JWTs, connection strings). Finding = BLOCKING.
- Enhance cleanup: intelligent artifact detection (orphaned generated files in source dirs, large binaries, unexpected node_modules/target/, duplicate files, empty directories)
- Add step 5.5: "End-of-Session State" — update workflow-tracking.json with final status, what completed, what remains

#### 6.3 skills/super-dev/SKILL.md

**Specific Changes:**
- Update Stage 3 description to mention community search passes, AI documentation traversal, innovation discovery, momentum scoring
- Update other stage descriptions with brief mentions of new capabilities (edge case generation, hypothesis trees, smell detection, DAG format, coverage-first review, changelog automation, sensitive data scan)
- No structural changes to the skill file — only wording updates within existing stage descriptions

---

## Phase 7: Codex Parity

**Dependencies:** Phases 1-6 ALL complete (TOML mirrors must reflect final .md content)
**Estimated Complexity:** Medium (mechanical translation, high volume)

### Files to Modify

#### 7.1 .codex/agents/*.toml (20 files)

Translate all Phase 1-6 changes to TOML format using established translation rules:

| # | File | Mirrors |
|---|------|---------|
| 1 | .codex/agents/research-agent.toml | agents/research-agent.md |
| 2 | .codex/agents/search-agent.toml | agents/search-agent.md |
| 3 | .codex/agents/team-lead.toml | agents/team-lead.md |
| 4 | .codex/agents/requirements-clarifier.toml | agents/requirements-clarifier.md |
| 5 | .codex/agents/bdd-scenario-writer.toml | agents/bdd-scenario-writer.md |
| 6 | .codex/agents/debug-analyzer.toml | agents/debug-analyzer.md |
| 7 | .codex/agents/code-assessor.toml | agents/code-assessor.md |
| 8 | .codex/agents/architecture-designer.toml | agents/architecture-designer.md |
| 9 | .codex/agents/architecture-improver.toml | agents/architecture-improver.md |
| 10 | .codex/agents/spec-writer.toml | agents/spec-writer.md |
| 11 | .codex/agents/spec-reviewer.toml | agents/spec-reviewer.md |
| 12 | .codex/agents/code-reviewer.toml | agents/code-reviewer.md |
| 13 | .codex/agents/adversarial-reviewer.toml | agents/adversarial-reviewer.md |
| 14 | .codex/agents/docs-executor.toml | agents/docs-executor.md |
| 15 | .codex/agents/build-cleaner.toml | agents/build-cleaner.md |
| 16 | .codex/agents/tdd-guide.toml | agents/tdd-guide.md |
| 17 | .codex/agents/qa-agent.toml | agents/qa-agent.md |
| 18 | .codex/agents/e2e-runner.toml | agents/e2e-runner.md |
| 19 | .codex/agents/handoff-writer.toml | agents/handoff-writer.md |
| 20 | .codex/agents/product-designer.toml | agents/product-designer.md |

**Translation rules:**
- `<principle name="X">Y</principle>` → `[[principles]]` with `name` and `description`
- `<step n="N" name="X">Y</step>` → `[[process.steps]]` with `number`, `name`, `description`
- `<constraint name="X">Y</constraint>` → `[[constraints]]` with `name` and `rule`
- `<gotcha>X</gotcha>` → `[[gotchas]]` with `description`

#### 7.2 Parity Verification

After all TOML updates:
- Verify principle count matches between .md and .toml per agent
- Verify process step count matches
- Verify constraint count matches
- Verify new modes/sections are represented
- Document any platform-specific differences

---

## Phase Summary

| Phase | Files | Parallel? | Depends On | Complexity |
|-------|-------|-----------|------------|------------|
| 1 | 3 | No (serial: template → methodology → search-agent) | None | High |
| 2 | 3 | No (serial: research-agent → loop → team-lead) | Phase 1 | High |
| 3 | 4 | Yes (all independent) | Phase 2 | Medium |
| 4 | 4 | No (serial: arch-designer → improver → spec-writer → spec-reviewer) | Phase 3 | Medium |
| 5 | 4 | Yes (all independent) | Phase 4 | Medium |
| 6 | 3 | Partially (docs + build parallel, then SKILL.md) | Phase 5 | Medium |
| 7 | 20+ | Yes (TOML files are independent) | Phases 1-6 | Medium |

```
Phase 1 ──→ Phase 2 ──→ Phase 3 (×4 parallel) ──→ Phase 4 ──→ Phase 5 (×4 parallel) ──→ Phase 6 ──→ Phase 7 (×20 parallel)
  3 files      3 files        4 files                 4 files       4 files                  3 files      ~21 files
```
