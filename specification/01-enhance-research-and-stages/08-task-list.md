# Task List: Enhance Research Stage and Upgrade All Stages

**Date:** 2026-05-22
**Format:** T{phase}.{seq}
**Total Tasks:** 34

---

## Phase 1: Foundation

### T1.1 — Update research-report-template.md with new sections

**File:** `reference/research-report-template.md`
**Changes:**
- Add "Community Discoveries" section with Community Pulse subsection (table: ID, Insight, Source, Date, Momentum, Consensus)
- Add "New Technologies and Approaches" section (table: Technology, First Release, Maturity, Innovation Potential, Relevance, Source)
- Add "AI Workflow Patterns" section (table: Pattern, Category, Source, Applicability)
- Add "Internal Improvement Suggestions" section (list: IMP-NNN items)
- Add "Innovation/Momentum" row to Options Comparison matrix
- Update Gate Compliance Notes with new ID formats and scoring rules

**Acceptance Criteria:**
- [ ] All 5 new sections present in correct location (after Implementation Considerations, before Contradictions Found)
- [ ] Tables have correct column headers per specification
- [ ] Gate Compliance Notes updated with COM-NNN, IMP-NNN format rules
- [ ] Momentum and Innovation Potential formulas documented in rule blocks
- [ ] New sections marked as optional (omit when empty)
- [ ] Template still renders correctly via render.sh

**Parallelizable:** No (must complete before T1.2, T1.3)

---

### T1.2 — Update research-methodology.md with new processes

**File:** `reference/research-methodology.md`
**Changes:**
- Add "Community Source Discovery" process
- Add "AI Documentation Traversal" process
- Add "Innovation Discovery" process
- Add "Momentum Scoring" process with full formula

**Acceptance Criteria:**
- [ ] All 4 new processes present
- [ ] Community Source Discovery includes quality thresholds (10+ upvotes, 5+ reactions, 10+ points)
- [ ] AI Documentation Traversal lists all providers and search topics
- [ ] Innovation Discovery includes filtering criteria (12-month, active dev, community traction)
- [ ] Momentum Scoring includes complete formula with weight definitions

**Parallelizable:** Yes (with T1.3, after T1.1)

---

### T1.3 — Enhance search-agent.md with new modes

**File:** `agents/search-agent.md`
**Changes:**
- Add `community` mode with site-filtered search targets and quality thresholds
- Add `ai-docs` mode with provider matrix and search topics
- Add momentum scoring algorithm
- Add emerging consensus detection (3+ sources within 6 months)
- Add innovation discovery guidance
- Add cross-domain search guidance

**Acceptance Criteria:**
- [ ] `community` mode documented with all 6 platform targets (Reddit, HN, GitHub Discussions, Dev.to, X/Twitter, Stack Overflow)
- [ ] `ai-docs` mode documented with all 4 provider groups (Anthropic, OpenAI, Google, Frameworks)
- [ ] Momentum formula present with engagement (0.4), recency (0.35), authority (0.25) weights
- [ ] Emerging consensus logic: 3+ independent sources, 6-month window
- [ ] Quality thresholds per platform documented
- [ ] Follows existing XML structure pattern

**Parallelizable:** Yes (with T1.2, after T1.1)

---

## Phase 2: Core Research Agent

### T2.1 — Enhance research-agent.md with new passes

**File:** `agents/research-agent.md`
**Changes:**
- Add Step 3.5: Community Discovery Pass
- Add Step 3.7: AI Documentation Traversal
- Add Step 4.5: Innovation Discovery
- Enhance Step 5: Innovation/Momentum scoring, emerging consensus
- Enhance Step 6: Internal Improvement Suggestions
- Add parallel execution note (Steps 3.5/3.7 concurrent)
- Add graceful degradation constraint

**Acceptance Criteria:**
- [ ] Steps 3.5, 3.7, 4.5 present with correct numbering
- [ ] Step 3.5 references search-agent `community` mode
- [ ] Step 3.7 references search-agent `ai-docs` mode
- [ ] Step 4.5 includes cross-domain search and innovation scoring
- [ ] Step 5 adds Innovation/Momentum to comparison matrix
- [ ] Step 6 adds self-improvement check for plugin workflow
- [ ] Parallel execution note for latency compliance (NFR-01)
- [ ] Graceful degradation constraint for unreachable sources (NFR-07)

**Parallelizable:** No (must complete before T2.2, T2.3)

---

### T2.2 — Update research-deep-dive-loop.md

**File:** `reference/workflow/research-deep-dive-loop.md`
**Changes:**
- Add competing hypotheses variant section
- Add community deep-dive option
- Add synthesis step for multi-agent findings

**Acceptance Criteria:**
- [ ] Competing hypotheses mode described (2-3 agents, different angles)
- [ ] Synthesis step (agreement/disagreement/gaps analysis)
- [ ] Community deep-dive option for unresolved signals
- [ ] Noted as optional (team-lead decides when to use)

**Parallelizable:** Yes (with T2.3, after T2.1)

---

### T2.3 — Enhance team-lead.md (Stages 1, 3, 13 + general)

**File:** `agents/team-lead.md`
**Changes:**
- Stage 1: improved auto-detection, config write guidance
- Stage 3: community/AI-doc passes, competing hypotheses note
- Stage 13: semantic commits, PR auto-generation, pre-merge checks
- General: effort level recommendations per stage
- Post-workflow: Internal Improvement Suggestions recognition (AC-30)

**Acceptance Criteria:**
- [ ] Stage 1 mentions auto-detection of language/framework/test-runner/CI
- [ ] Stage 3 mentions community + AI-doc search passes
- [ ] Stage 3 notes competing hypotheses as optional for complex topics
- [ ] Stage 13 includes semantic commit format guidance
- [ ] Effort levels documented: research/design=xhigh, impl=xhigh, review=high, docs/cleanup=medium
- [ ] Post-workflow section: check for IMP-NNN items, present to user
- [ ] Changes are minimal/surgical given file's 332-line complexity

**Parallelizable:** Yes (with T2.2, after T2.1)

---

## Phase 3: Analysis Agents

### T3.1 — Enhance requirements-clarifier.md

**File:** `agents/requirements-clarifier.md`
**Changes:**
- Add principle: "Codebase-Grounded Requirements"
- Add step 1.5: "Context Retrieval"
- Enhance ambiguity detection with categorization

**Acceptance Criteria:**
- [ ] New principle in `<principles>` block
- [ ] Step 1.5 present between existing steps 1 and 2
- [ ] Ambiguity categories listed: Scope, Behavior, Data, Integration, Performance
- [ ] Context retrieval searches for similar features, naming conventions, module boundaries

**Parallelizable:** Yes (with T3.2, T3.3, T3.4)

---

### T3.2 — Enhance bdd-scenario-writer.md

**File:** `agents/bdd-scenario-writer.md`
**Changes:**
- Add step 2.5: "Edge Case Generation"
- Add constraint: "Quality Self-Score"

**Acceptance Criteria:**
- [ ] Step 2.5 present with edge case categories (null/empty, boundaries, concurrent, timeouts, permissions, overflow, invalid transitions)
- [ ] Quality Self-Score constraint: 1-10 scale, 4 dimensions (specificity, independence, coverage, testability)
- [ ] Score < 7 triggers self-revision
- [ ] Score reported in output

**Parallelizable:** Yes (with T3.1, T3.3, T3.4)

---

### T3.3 — Enhance debug-analyzer.md

**File:** `agents/debug-analyzer.md`
**Changes:**
- Add principle: "Chain-of-Thought Traces"
- Enhance hypothesis generation: tree structure with probabilities
- Add step 5.5: "Automated Reproduction Script"
- Enhance reproduction strategy: add community search (#9)
- Add gotcha: competing hypotheses note

**Acceptance Criteria:**
- [ ] New principle about step-by-step reasoning traces
- [ ] Hypothesis tree structure described (not flat list), probability estimates sum to 100%
- [ ] Step 5.5 generates standalone reproduction script/test
- [ ] Reproduction strategy item 9: community search for error messages
- [ ] Gotcha about team-lead spawning parallel instances for complex bugs

**Parallelizable:** Yes (with T3.1, T3.2, T3.4)

---

### T3.4 — Enhance code-assessor.md

**File:** `agents/code-assessor.md`
**Changes:**
- Add principle: "Subagent Exploration"
- Add step 2.5: "Architecture Smell Detection"
- Enhance dependency analysis with community signals
- Add step 4.5: "Pattern Library Extraction"
- Enhance technical debt quantification

**Acceptance Criteria:**
- [ ] Subagent Exploration principle describes spawning per-dimension subagents
- [ ] Step 2.5 lists 5 smell types (God Class, Feature Envy, Shotgun Surgery, Divergent Change, Inappropriate Intimacy) with detection criteria
- [ ] Dependency health scoring: last commit, CVEs, stars trend, downloads, maintenance status → Healthy/Warning/Critical
- [ ] Step 4.5 identifies 3-5 canonical patterns with file:line examples
- [ ] Technical debt: severity, effort hours, blast radius, priority (Now/Soon/Eventually/Never)

**Parallelizable:** Yes (with T3.1, T3.2, T3.3)

---

## Phase 4: Design & Spec Agents

### T4.1 — Enhance architecture-designer.md

**File:** `agents/architecture-designer.md`
**Changes:**
- Add principle: "Task Graph Thinking"
- Enhance interface design for parallel implementation
- Add AI-aware evaluation criteria
- Add constraint: "Parallelism Annotation"

**Acceptance Criteria:**
- [ ] Task Graph Thinking principle describes DAG structure
- [ ] Interface design step mentions enabling parallel implementation
- [ ] AI-aware criteria: prompt caching, token budget, parallel execution, context sustainability
- [ ] Parallelism Annotation constraint: [PARALLEL: A, B, C] vs [SERIAL: D → E → F]

**Parallelizable:** No (must complete before T4.2)

---

### T4.2 — Enhance architecture-improver.md

**File:** `agents/architecture-improver.md`
**Changes:**
- Add principle: "AI-Aware Improvement"
- Enhance evaluation criteria to match architecture-designer
- Add context engineering awareness

**Acceptance Criteria:**
- [ ] AI-Aware Improvement principle covers prompt caching, token efficiency, parallel execution
- [ ] Evaluation criteria aligned with architecture-designer's additions
- [ ] Context engineering patterns mentioned: just-in-time retrieval, structured notes, sub-agents

**Parallelizable:** Yes (with T4.3, after T4.1)

---

### T4.3 — Enhance spec-writer.md

**File:** `agents/spec-writer.md`
**Changes:**
- Enhance implementation plan: DAG format with `depends_on` and `parallelizable_with`
- Enhance specification format: AI-consumable guidance
- Add constraint: "Contract-First"

**Acceptance Criteria:**
- [ ] Implementation plan described as dependency graph with `depends_on` arrays
- [ ] `parallelizable_with` field documented
- [ ] AI-consumable format: XML tags, machine-parseable AC IDs, SCENARIO-ID references
- [ ] Long context at TOP/queries at BOTTOM guidance
- [ ] Contract-First constraint: explicit I/O type signatures for every module interface

**Parallelizable:** Yes (with T4.2, after T4.1)

---

### T4.4 — Enhance spec-reviewer.md

**File:** `agents/spec-reviewer.md`
**Changes:**
- Add step 3.5: "Anti-Pattern Verification"
- Enhance completeness check with quantitative percentage
- Enhance grounding check with numeric score

**Acceptance Criteria:**
- [ ] Step 3.5 checks for: YAGNI violations, premature optimization, untestable requirements, missing error paths, gold-plating
- [ ] Completeness percentage: (ACs addressed / total) × 100. < 100% = rejection
- [ ] Grounding score: (verified_references / total) × 100. < 90% = HIGH finding

**Parallelizable:** After T4.3

---

## Phase 5: Review Agents

### T5.1 — Enhance code-reviewer.md

**File:** `agents/code-reviewer.md`
**Changes:**
- Add principle: "Coverage-First (Anthropic Opus 4.7)"
- Add constraint: "Fresh Context Mandate"
- Enhance dimension reviews with per-finding annotations
- Remove any under-reporting language

**Acceptance Criteria:**
- [ ] Coverage-First principle: report EVERY issue, goal is coverage not filtering
- [ ] Fresh Context constraint: never review code you generated
- [ ] Per-finding: severity, confidence 0.0-1.0, file:line, failure scenario, suggested fix
- [ ] Confidence < 0.5 tagged UNCERTAIN
- [ ] No "be conservative"/"don't nitpick" language present

**Parallelizable:** Yes (with T5.2, T5.3, T5.4)

---

### T5.2 — Enhance adversarial-reviewer.md

**File:** `agents/adversarial-reviewer.md`
**Changes:**
- Add principle: "Coverage-First"
- Enhance attack vectors with AI-specific patterns
- Add constraint: "Fresh Context"

**Acceptance Criteria:**
- [ ] Coverage-First principle present
- [ ] AI-specific attack patterns: prompt injection, token exhaustion, context overflow, data leakage, non-deterministic security paths
- [ ] Fresh Context constraint present
- [ ] Existing persona structure preserved (Skeptic, Architect, Minimalist)

**Parallelizable:** Yes (with T5.1, T5.3, T5.4)

---

### T5.3 — Enhance tdd-guide.md

**File:** `agents/tdd-guide.md`
**Changes:**
- Add constraint: "Anti-Hardcoding (MANDATORY)"
- Add principle: "Feature-Complete Verification"
- Enhance process with test ordering guidance

**Acceptance Criteria:**
- [ ] Anti-Hardcoding constraint: no hardcoded values, implement actual logic
- [ ] Feature-Complete principle: passing tests = completion signal, not code commit
- [ ] Test ordering: simplest constraining test → boundaries → error cases
- [ ] Note: never write all tests before any implementation

**Parallelizable:** Yes (with T5.1, T5.2, T5.4)

---

### T5.4 — Enhance qa-agent.md

**File:** `agents/qa-agent.md`
**Changes:**
- Add step 2.5: "Feature-by-Feature Verification"
- Add constraint: "Self-Verification"
- Add Playwright MCP enhancement for Web/UI

**Acceptance Criteria:**
- [ ] Step 2.5: verify happy path, edge cases, error handling per feature. Per-feature pass/fail.
- [ ] Self-Verification: execute tests before reporting, not just code inspection
- [ ] Playwright note: when available, use for UI verification (navigate, interact, screenshot)

**Parallelizable:** Yes (with T5.1, T5.2, T5.3)

---

## Phase 6: Finalization Agents

### T6.1 — Enhance docs-executor.md

**File:** `agents/docs-executor.md`
**Changes:**
- Add principle: "AI-Optimized Documentation"
- Add step 1.5: "Changelog from Git"
- Enhance API docs extraction from types
- Add constraint: "Handoff as Memory"

**Acceptance Criteria:**
- [ ] AI-Optimized principle: structured metadata, machine-readable cross-references, consistent hierarchy
- [ ] Step 1.5: parse git log/diff, conventional commit classification (feat/fix/refactor/docs), breaking changes
- [ ] API docs from type definitions guidance
- [ ] Handoff as Memory: memory-compatible frontmatter (name, description, type)

**Parallelizable:** Yes (with T6.2)

---

### T6.2 — Enhance build-cleaner.md

**File:** `agents/build-cleaner.md`
**Changes:**
- Add step 1.5: "Sensitive Data Scan"
- Enhance artifact detection
- Add step 5.5: "End-of-Session State"

**Acceptance Criteria:**
- [ ] Step 1.5: pattern-match for secrets (.env values, API keys, credentials, private keys, JWTs, connection strings). Finding = BLOCKING.
- [ ] Intelligent artifact detection: orphaned generated files, large binaries, unexpected node_modules/target/, duplicates, empty dirs
- [ ] Step 5.5: update workflow-tracking.json with final status, completed items, remaining items

**Parallelizable:** Yes (with T6.1)

---

### T6.3 — Update skills/super-dev/SKILL.md

**File:** `skills/super-dev/SKILL.md`
**Changes:**
- Update Stage 3 description (community, AI-docs, innovation, momentum)
- Update other stage descriptions with brief capability mentions

**Acceptance Criteria:**
- [ ] Stage 3 mentions: community search, AI documentation traversal, innovation discovery, momentum scoring
- [ ] Stage 2 mentions: edge case generation, quality scoring
- [ ] Stage 4 mentions: hypothesis trees, chain-of-thought
- [ ] Stage 5 mentions: architecture smells, dependency health, pattern extraction
- [ ] Stage 6 mentions: DAG format, parallelism annotation, AI-aware patterns
- [ ] Stage 10 mentions: coverage-first, confidence-scored findings
- [ ] No structural changes to skill file

**Parallelizable:** After T6.1 and T6.2

---

## Phase 7: Codex Parity

### T7.1 — Mirror P0 agents to .codex/agents/*.toml

**Files:** `.codex/agents/research-agent.toml`, `.codex/agents/search-agent.toml`, `.codex/agents/team-lead.toml`
**Changes:** Translate all Phase 1-2 enhancements to TOML format

**Acceptance Criteria:**
- [ ] research-agent.toml has Steps 3.5, 3.7, 4.5 and enhanced Steps 5, 6
- [ ] search-agent.toml has `community` and `ai-docs` modes, momentum scoring, consensus detection
- [ ] team-lead.toml has Stage 1/3/13 updates, effort levels, post-workflow IMP check
- [ ] Principle/step/constraint counts match .md versions

**Parallelizable:** Yes (all T7.x tasks are independent)

---

### T7.2 — Mirror Phase 3 agents to .codex/agents/*.toml

**Files:** `.codex/agents/requirements-clarifier.toml`, `.codex/agents/bdd-scenario-writer.toml`, `.codex/agents/debug-analyzer.toml`, `.codex/agents/code-assessor.toml`
**Changes:** Translate all Phase 3 enhancements to TOML format

**Acceptance Criteria:**
- [ ] requirements-clarifier.toml has new principle and step 1.5
- [ ] bdd-scenario-writer.toml has step 2.5 and Quality Self-Score constraint
- [ ] debug-analyzer.toml has new principle, enhanced hypothesis tree, step 5.5
- [ ] code-assessor.toml has new principle, steps 2.5 and 4.5, enhanced dependencies
- [ ] All counts match .md versions

**Parallelizable:** Yes (with T7.1, T7.3, T7.4, T7.5)

---

### T7.3 — Mirror Phase 4 agents to .codex/agents/*.toml

**Files:** `.codex/agents/architecture-designer.toml`, `.codex/agents/architecture-improver.toml`, `.codex/agents/spec-writer.toml`, `.codex/agents/spec-reviewer.toml`
**Changes:** Translate all Phase 4 enhancements to TOML format

**Acceptance Criteria:**
- [ ] architecture-designer.toml has Task Graph Thinking, Parallelism Annotation, AI-aware criteria
- [ ] architecture-improver.toml has AI-Aware Improvement principle
- [ ] spec-writer.toml has DAG format, Contract-First constraint
- [ ] spec-reviewer.toml has step 3.5, quantitative completeness, grounding score
- [ ] All counts match .md versions

**Parallelizable:** Yes (with T7.1, T7.2, T7.4, T7.5)

---

### T7.4 — Mirror Phase 5 agents to .codex/agents/*.toml

**Files:** `.codex/agents/code-reviewer.toml`, `.codex/agents/adversarial-reviewer.toml`, `.codex/agents/tdd-guide.toml`, `.codex/agents/qa-agent.toml`
**Changes:** Translate all Phase 5 enhancements to TOML format

**Acceptance Criteria:**
- [ ] code-reviewer.toml has Coverage-First principle, Fresh Context constraint, per-finding annotations
- [ ] adversarial-reviewer.toml has Coverage-First, AI-specific attacks, Fresh Context
- [ ] tdd-guide.toml has Anti-Hardcoding, Feature-Complete, test ordering
- [ ] qa-agent.toml has step 2.5, Self-Verification, Playwright note
- [ ] All counts match .md versions
- [ ] No "be conservative" language in code-reviewer.toml

**Parallelizable:** Yes (with T7.1, T7.2, T7.3, T7.5)

---

### T7.5 — Mirror Phase 6 agents + remaining to .codex/agents/*.toml

**Files:** `.codex/agents/docs-executor.toml`, `.codex/agents/build-cleaner.toml`, `.codex/agents/e2e-runner.toml`, `.codex/agents/handoff-writer.toml`, `.codex/agents/product-designer.toml`
**Changes:** Translate Phase 6 enhancements + any minor updates to remaining agents

**Acceptance Criteria:**
- [ ] docs-executor.toml has AI-Optimized principle, step 1.5, Handoff as Memory
- [ ] build-cleaner.toml has step 1.5, enhanced artifacts, step 5.5
- [ ] e2e-runner.toml updated if any minor changes were made
- [ ] handoff-writer.toml updated if any minor changes were made
- [ ] product-designer.toml updated if any minor changes were made
- [ ] All counts match .md versions

**Parallelizable:** Yes (with T7.1, T7.2, T7.3, T7.4)

---

### T7.6 — Parity verification

**Files:** All .codex/agents/*.toml vs agents/*.md
**Changes:** Verification pass (no file modifications)

**Acceptance Criteria:**
- [ ] Every modified .md agent has corresponding .toml with matching principle count
- [ ] Every modified .md agent has corresponding .toml with matching step count
- [ ] Every modified .md agent has corresponding .toml with matching constraint count
- [ ] New modes (community, ai-docs) represented in search-agent.toml
- [ ] Platform-specific differences documented (if any)

**Parallelizable:** After T7.1-T7.5 complete

---

## Summary

| Phase | Tasks | Parallelizable Tasks | Serial Tasks |
|-------|-------|---------------------|--------------|
| 1 | T1.1, T1.2, T1.3 | T1.2 + T1.3 | T1.1 first |
| 2 | T2.1, T2.2, T2.3 | T2.2 + T2.3 | T2.1 first |
| 3 | T3.1, T3.2, T3.3, T3.4 | All 4 parallel | — |
| 4 | T4.1, T4.2, T4.3, T4.4 | T4.2 + T4.3 | T4.1 first, T4.4 last |
| 5 | T5.1, T5.2, T5.3, T5.4 | All 4 parallel | — |
| 6 | T6.1, T6.2, T6.3 | T6.1 + T6.2 | T6.3 last |
| 7 | T7.1-T7.6 | T7.1-T7.5 parallel | T7.6 last |
| **Total** | **34** | | |

### Dependency Graph

```
T1.1 ──→ T1.2 ──┐
     └──→ T1.3 ──┤
                  ├──→ T2.1 ──→ T2.2 ──┐
                  │          └──→ T2.3 ──┤
                  │                       ├──→ T3.1 ──┐
                  │                       ├──→ T3.2 ──┤
                  │                       ├──→ T3.3 ──┤
                  │                       ├──→ T3.4 ──┤
                  │                       │           ├──→ T4.1 ──→ T4.2 ──┐
                  │                       │           │          └──→ T4.3 ──┤
                  │                       │           │                       ├──→ T4.4 ──┐
                  │                       │           │                       │            ├──→ T5.1 ──┐
                  │                       │           │                       │            ├──→ T5.2 ──┤
                  │                       │           │                       │            ├──→ T5.3 ──┤
                  │                       │           │                       │            ├──→ T5.4 ──┤
                  │                       │           │                       │            │           ├──→ T6.1 ──┐
                  │                       │           │                       │            │           ├──→ T6.2 ──┤
                  │                       │           │                       │            │           │           ├──→ T6.3
                  │                       │           │                       │            │           │           │
                  │                       │           │                       │            │           │           ├──→ T7.1-T7.5 (parallel)
                  │                       │           │                       │            │           │           │           │
                  │                       │           │                       │            │           │           │           └──→ T7.6
```
