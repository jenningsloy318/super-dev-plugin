# Code Assessment: Full Enhancement of Super-Dev Plugin

**Date:** 2026-05-22
**Scope:** All files requiring modification for the "Enhance Research and Upgrade All Stages" feature
**Focus:** Current state vs. needed state for every affected file

---

## 1. File Inventory

### Agent Files (agents/*.md) — 38 files, 3218 total lines

| File | Lines | Needs Modification | Priority |
|------|-------|-------------------|----------|
| research-agent.md | 83 | YES — Major | P0 |
| search-agent.md | 75 | YES — Major | P0 |
| team-lead.md | 332 | YES — Moderate | P0 |
| requirements-clarifier.md | 94 | YES — Moderate | P1 |
| bdd-scenario-writer.md | 70 | YES — Moderate | P1 |
| debug-analyzer.md | 99 | YES — Moderate | P1 |
| code-assessor.md | 80 | YES — Moderate | P1 |
| architecture-designer.md | 93 | YES — Moderate | P1 |
| architecture-improver.md | 117 | YES — Minor | P2 |
| spec-writer.md | 69 | YES — Moderate | P1 |
| spec-reviewer.md | 86 | YES — Minor | P2 |
| code-reviewer.md | 92 | YES — Moderate | P1 |
| adversarial-reviewer.md | 89 | YES — Moderate | P1 |
| docs-executor.md | 78 | YES — Minor | P2 |
| build-cleaner.md | 112 | YES — Minor | P2 |
| handoff-writer.md | 68 | YES — Minor | P3 |
| tdd-guide.md | 60 | YES — Minor | P2 |
| qa-agent.md | 80 | YES — Minor | P2 |
| e2e-runner.md | 110 | YES — Minor | P3 |
| dev-executor.md | 58 | NO | — |
| impl-summary-writer.md | 63 | NO | — |
| investigator.md | 62 | NO | — |
| doc-updater.md | 49 | NO | — |
| doc-validator.md | 66 | NO | — |
| planner.md | 47 | NO | — |
| refactor-cleaner.md | 50 | NO | — |
| security-reviewer.md | 104 | NO | — |
| build-error-resolver.md | 40 | NO | — |
| product-designer.md | 69 | YES — Minor | P3 |
| ui-ux-designer.md | 78 | NO | — |
| frontend-developer.md | 97 | NO | — |
| backend-developer.md | 86 | NO | — |
| golang-developer.md | 91 | NO | — |
| rust-developer.md | 80 | NO | — |
| ios-developer.md | 69 | NO | — |
| android-developer.md | 80 | NO | — |
| macos-app-developer.md | 72 | NO | — |
| windows-app-developer.md | 70 | NO | — |

### Reference Files — 29 files, 3805 total lines

| File | Lines | Needs Modification | Priority |
|------|-------|-------------------|----------|
| research-report-template.md | 261 | YES — Major | P0 |
| research-methodology.md | 74 | YES — Major | P0 |
| workflow/research-deep-dive-loop.md | 19 | YES — Minor | P2 |
| architecture-patterns.md | 99 | YES — Minor | P2 |
| debugging-patterns.md | 68 | YES — Minor | P3 |
| code-assessment-template.md | 291 | YES — Minor | P2 |
| All other reference files | ~3000 | NO | — |

### Skills — 1 file primary

| File | Lines | Needs Modification | Priority |
|------|-------|-------------------|----------|
| skills/super-dev/SKILL.md | 144 | YES — Moderate | P1 |

### Codex Agents (.codex/agents/*.toml) — 38 files (mirrors of agents/*.md)

All 19-20 modified agent files need corresponding .codex mirror updates (Priority matches the agent file).

### Scripts — 17 files

| File | Needs Modification | Priority |
|------|-------------------|----------|
| scripts/README.md | YES — Minor (document new search capabilities) | P3 |
| scripts/gates/*.sh (13 files) | NO (out of scope per requirements) | — |
| scripts/render.sh | NO | — |
| scripts/setup-codex-agents.sh | NO | — |
| scripts/usage-tracker.sh | NO | — |

---

## 2. Per-Agent Assessment

### 2.1 research-agent.md (P0 — MAJOR CHANGES)

**Current State (83 lines):**
- Has Firecrawl-first principle, supplementary tools, deep research mode
- Searches code, docs, academic, web, social
- Produces structured report with options comparison
- Has issues/ambiguities flagging

**Needed Enhancements (from Research Report + Requirements):**
1. **Community Search Passes (AC-02, AC-25):** Add dedicated community search steps targeting Reddit, X/Twitter, GitHub Discussions, HackerNews, Dev.to with site-filtered queries
2. **New Technologies Section (AC-03):** Add explicit step to search for technologies < 12 months old
3. **Cross-Domain Patterns (AC-04):** Add step to search beyond immediate stack
4. **AI Company Documentation Traversal (AC-07-10):** Add dedicated passes for Anthropic, OpenAI, Google, and framework docs
5. **Innovation Potential Weighting (AC-06):** Add to scoring algorithm
6. **Competing Hypotheses Pattern:** Spawn multiple research angles (from research report Section 6.3)
7. **Community Discoveries Section (AC-05):** Reference new template section
8. **AI Workflow Patterns Section (AC-11):** Reference new template section
9. **Internal Improvement Suggestions (AC-29):** Add step to flag plugin-improving discoveries
10. **Momentum Scoring (AC-26):** Add engagement + recency + authority scoring
11. **Emerging Consensus Detection (AC-27):** Add 3+ source convergence detection

**Estimated New Content:** ~60-80 additional lines (steps, constraints, process additions)

---

### 2.2 search-agent.md (P0 — MAJOR CHANGES)

**Current State (75 lines):**
- Has query expansion, multi-source retrieval, re-ranking
- Has modes: code, docs, academic, web, social, github, all
- Has authority scoring weights

**Needed Enhancements:**
1. **Dedicated Community Search Modes (AC-25):** Add `community` mode with site-filtered searches for Reddit, X/Twitter, GitHub Discussions, HackerNews, Dev.to, Stack Overflow
2. **AI Documentation Mode (AC-07-10):** Add `ai-docs` mode targeting Anthropic, OpenAI, Google, LangChain, CrewAI, DSPy docs
3. **Momentum Scoring (AC-26):** Add composite momentum metric (engagement + recency + authority)
4. **Emerging Consensus Detection (AC-27):** Add convergence detection logic (3+ sources within 6 months)
5. **Innovation Discovery Mode:** Search for recent (< 12 month) alternatives
6. **Cross-Domain Search Mode (AC-04):** Search adjacent ecosystems

**Estimated New Content:** ~40-50 additional lines

---

### 2.3 team-lead.md (P0 — MODERATE CHANGES)

**Current State (332 lines):**
- Full orchestration workflow, stage flow, agent spawn fields
- Domain-aware routing, doc-validator pairing, iteration loops
- Per-phase commit, build queue

**Needed Enhancements:**
1. **Adaptive Thinking Routing (Research Report 5.2, 5.5):** Add note about effort level recommendations per stage
2. **Internal Improvement Recognition (AC-30):** After workflow completion, check research report for "Internal Improvement Suggestions" and present to user
3. **Stage 3 Enhancement:** Update Stage 3 description to mention community + AI-doc search passes, competing hypotheses
4. **Competing Hypotheses Mode:** Optional mode in Stage 3/4 to spawn multiple research angles
5. **Memory Tool Integration (Research Report 5.1):** Note about memory-compatible state files
6. **Stage 1 Enhancement (AC-12):** Update setup description with improved auto-detection

**Estimated New Content:** ~20-30 additional lines (concentrated in stage flow and constraints)

---

### 2.4 requirements-clarifier.md (P1)

**Current State (94 lines):**
- Interview pattern already exists (Six Forcing Questions, Recommended-Answer Pattern)
- Uses clarify skill, multi-layer questioning
- Produces JSON via render.sh

**Needed Enhancements (AC-13):**
1. **Structured Ambiguity Detection Prompting:** Already has some ("Flag ambiguous criteria") but needs explicit ambiguity detection step with systematic categorization
2. **Automated AC Generation Patterns:** Add AI-assisted AC generation from user descriptions (pattern from research: "interview the user using structured questions about technical implementation, edge cases, and tradeoffs")
3. **Context Retrieval Before BDD:** Add step to retrieve similar features from codebase before generating requirements (grounds them in reality)

**Estimated New Content:** ~10-15 additional lines (the interview pattern is largely already there)

---

### 2.5 bdd-scenario-writer.md (P1)

**Current State (70 lines):**
- Has quality validation (Q1-Q10, D1-D8 gates)
- Generates scenarios from ACs with traceability
- Uses render.sh pipeline

**Needed Enhancements (AC-13):**
1. **Quality Scoring Self-Assessment:** Add explicit numeric scoring step where agent rates each scenario against quality dimensions and reports aggregate score
2. **Missing Edge Case Detection:** Add systematic edge case generation step (null inputs, boundary values, concurrent access, timeout scenarios)
3. **Coverage Heat Map:** Generate coverage visualization showing AC-to-scenario density

**Estimated New Content:** ~15-20 additional lines

---

### 2.6 debug-analyzer.md (P1)

**Current State (99 lines):**
- Already has multi-hypothesis generation (3-5 ranked), one-variable-at-a-time
- Has reproduction strategy (8 approaches), falsifiable predictions
- Feedback loop first principle

**Needed Enhancements (AC-15):**
1. **Chain-of-Thought Debugging Methodology:** Add explicit `<thinking>` tags usage for step-by-step reasoning traces
2. **Hypothesis Tree with Confidence Scores:** Enhance from flat list to tree structure with branching sub-hypotheses and probability estimates
3. **Automated Reproduction Synthesis:** Add step to generate automated reproduction scripts (not just identify strategy)
4. **Git Bisect Integration:** Promote from mention to explicit process step with automation guidance
5. **Competing Hypotheses Debate (Research Report 6.4):** Note about spawning multiple debug agents for complex bugs

**Estimated New Content:** ~20-25 additional lines

---

### 2.7 code-assessor.md (P1)

**Current State (80 lines):**
- Has architecture evaluation, code standards, dependencies, framework patterns
- Has confidence gate (>80%)
- Has search strategy section

**Needed Enhancements (AC-16):**
1. **Architecture Smell Detection:** Add explicit smell catalog (God Class, Feature Envy, Shotgun Surgery, Divergent Change, etc.) with detection heuristics
2. **Dependency Health Scoring:** Add community signals dimension (GitHub stars, last commit date, open CVEs, npm downloads/week, maintenance status)
3. **Technical Debt Quantification:** Add structured debt inventory with severity levels and estimated effort hours
4. **Pattern Library Extraction (Research Report 6.5):** Add step to identify 3-5 canonical patterns from codebase for downstream stages
5. **Subagent Architecture for Exploration (Research Report 6.5):** Note about using separate context windows for each aspect

**Estimated New Content:** ~25-30 additional lines

---

### 2.8 architecture-designer.md (P1)

**Current State (93 lines):**
- Has module decomposition, interface design, ADRs, evaluation matrix
- Has YAGNI, boring architecture first, interface-first principles
- Has language-specific requirements

**Needed Enhancements (AC-17):**
1. **AI-Aware Architecture Patterns:** Add consideration for prompt caching, token budget planning, parallel agent execution optimization
2. **Context Engineering Patterns:** Add patterns for just-in-time context retrieval, structured note-taking, sub-agent architectures
3. **Task DAG Format (Research Report 6.7):** Add implementation plan as dependency graph (not just list) to enable parallel execution in Stage 9
4. **Interface-First for Parallel Implementation (Research Report 6.6):** Strengthen interface-first principle with explicit parallel-enabling guidance

**Estimated New Content:** ~15-20 additional lines

---

### 2.9 spec-writer.md (P1)

**Current State (69 lines):**
- Produces 3 documents: specification, implementation plan, task list
- Has cross-referencing, sequential write rule
- Uses render.sh pipeline

**Needed Enhancements (AC-18):**
1. **AI-Consumable Format:** Add guidance for XML-tagged sections, machine-parseable ACs, BDD scenario references by ID (some already exists)
2. **Task Graph (DAG) Format:** Structure implementation plan as dependency graph with parallelizable phases identified
3. **Complexity-Tuned Granularity:** Add task complexity classification that adjusts plan granularity
4. **Contract-First Specifications:** Add emphasis on defining I/O contracts and interface signatures

**Estimated New Content:** ~15-20 additional lines

---

### 2.10 spec-reviewer.md (P2)

**Current State (86 lines):**
- Already has 8 review dimensions (Completeness, Consistency, Feasibility, Testability, Traceability, Grounding, Complexity, Ambiguity)
- Has confidence gate, coverage matrix
- Already checks against actual codebase (D6 Grounding)

**Needed Enhancements (AC-19):**
1. **Automated Completeness Checking:** Already largely present; add quantitative completeness percentage
2. **Grounding Score Calculation:** Add numeric grounding score (verified/total references)
3. **Anti-Patterns Verification (Research Report 6.8):** Add check that spec doesn't introduce unnecessary abstractions, premature optimization, or untestable requirements

**Estimated New Content:** ~10 additional lines (already well-structured)

---

### 2.11 code-reviewer.md (P1)

**Current State (92 lines):**
- Has confidence gate, dimension reviews, specification-first approach
- Has rendering pipeline, BDD scenario coverage check
- Has AI code slop removal

**Needed Enhancements (AC-21):**
1. **Coverage-First Prompting (Research Report 6.10):** Add explicit "report everything including uncertain findings" guidance — model may under-report if told to be conservative
2. **Confidence-Scored Findings:** Add per-finding confidence level (already has confidence gate but not per-finding)
3. **Writer/Reviewer Separation Enforcement:** Add note that reviewer must have clean context (not biased by writing the code)
4. **Multi-Domain Parallel Review (Research Report 6.10):** Note about distinct review lenses per reviewer

**Estimated New Content:** ~15 additional lines

---

### 2.12 adversarial-reviewer.md (P1)

**Current State (89 lines):**
- Has 3 personas (Skeptic, Architect, Minimalist)
- Has destructive action gate, confidence gate
- Has rendering pipeline

**Needed Enhancements (AC-21):**
1. **Coverage-First Pattern:** Add "surface every finding, filter later" guidance
2. **Updated Attack Vectors:** Add AI-specific attack patterns (prompt injection in user-facing inputs, token budget exhaustion, context window overflow)
3. **Security Vulnerability Detection Updates:** Reference latest vulnerability databases and patterns
4. **Fresh Context Mandate:** Explicit note about clean context requirement

**Estimated New Content:** ~10-15 additional lines

---

### 2.13 docs-executor.md (P2)

**Current State (78 lines):**
- Updates all spec directory documents after review
- Has process for gate compliance (gate-docs-drift)
- Handles workflow tracking JSON

**Needed Enhancements (AC-22):**
1. **AI-Optimized Documentation:** Add guidance for structured metadata, example usage, cross-references parseable by future AI agents
2. **Changelog Automation:** Add step to generate changelog from git log/diff analysis
3. **API Documentation from Types:** Add step to extract docs from type definitions
4. **Handoff as Memory-Compatible (Research Report 6.11):** Format handoff for memory-tool compatibility

**Estimated New Content:** ~15-20 additional lines

---

### 2.14 build-cleaner.md (P2)

**Current State (112 lines):**
- Has project-type detection
- Has cleanup patterns per type
- Has verification

**Needed Enhancements (AC-23):**
1. **Intelligent Artifact Detection:** Add heuristic-based artifact detection beyond fixed patterns
2. **Sensitive Data Verification:** Add explicit secret/credential scanning step
3. **Project-Type-Specific Patterns Enhancement:** Ensure comprehensive coverage

**Estimated New Content:** ~10-15 additional lines

---

### 2.15 tdd-guide.md (P2)

**Current State (60 lines):**
- Writes failing tests from requirements, BDD, spec
- Red-green-refactor cycle

**Needed Enhancements (AC-20):**
1. **Anti-Hardcoding Prompt:** Add explicit guidance against hardcoded values in tests
2. **Incremental Implementation Strategies:** Add test ordering for maximum feedback loops
3. **Quality Gates per Test:** Add pass/fail gate before moving to next test

**Estimated New Content:** ~10-15 additional lines

---

### 2.16 qa-agent.md (P2)

**Current State (80 lines):**
- Runs tests, verifies coverage
- Reports results

**Needed Enhancements (AC-20):**
1. **Verification Tools Integration:** Add browser automation (Playwright MCP) for UI testing
2. **Feature-by-Feature Verification:** Verify end-to-end before marking complete
3. **Self-Verification Mandate:** Agent verifies its own work

**Estimated New Content:** ~10-15 additional lines

---

## 3. Template/Reference Assessment

### 3.1 research-report-template.md (P0 — MAJOR)

**Current State (261 lines):**
- Has: metadata, executive summary, search methodology, source inventory, options comparison, deprecation warnings, best practices, anti-patterns, implementation considerations, contradictions, issues/ambiguities, references

**Needed New Sections:**
1. **"Community Discoveries" section (AC-05)** — With source links, recency scores, sorted by relevance
2. **"Community Pulse" subsection (AC-28)** — Active discussions, pain points, novel solutions
3. **"New Technologies & Approaches" section (AC-03)** — Technologies < 12 months with maturity assessment
4. **"AI Workflow Patterns" section (AC-11)** — Prompt engineering, agent coordination, tool-use, context management
5. **"Internal Improvement Suggestions" section (AC-29)** — Plugin workflow improvements with impact assessment
6. **"Emerging Consensus" notation (AC-27)** — Flag in Community Discoveries for 3+ source convergence
7. **Innovation Potential dimension in Options Comparison (AC-06)** — Add "Innovation/Momentum" row to comparison matrix

**Estimated New Content:** ~80-100 additional lines across 5-7 new sections

---

### 3.2 research-methodology.md (P0 — MAJOR)

**Current State (74 lines):**
- Has: establish context, research areas, execute searches, version awareness, synthesize

**Needed New Processes:**
1. **Community Search Process** — Dedicated process for community source discovery
2. **AI Documentation Traversal Process** — Systematic AI company docs search
3. **Cross-Domain Search Process** — Adjacent ecosystem exploration
4. **Momentum Scoring Algorithm** — Engagement + recency + authority formula
5. **Emerging Consensus Detection** — 3+ source convergence rule
6. **Innovation Discovery Process** — Finding < 12-month technologies
7. **Internal Improvement Flagging** — Self-referencing discovery process

**Estimated New Content:** ~50-70 additional lines

---

### 3.3 workflow/research-deep-dive-loop.md (P2)

**Current State (19 lines):**
- Basic loop: trigger → extract → spawn → review → loop/exit

**Needed Enhancement:**
- Add competing hypotheses variant (multiple research agents with different angles)
- Add community deep-dive option for unresolved community signals

**Estimated New Content:** ~10 additional lines

---

### 3.4 architecture-patterns.md (P2)

**Current State (99 lines):**
- Established architectural patterns

**Needed Enhancement:**
- Add AI-aware architecture patterns section (prompt caching, token planning, parallel agent execution)

**Estimated New Content:** ~15-20 additional lines

---

## 4. Infrastructure Assessment

### 4.1 Skills

**skills/super-dev/SKILL.md (P1):**
- Stage 3 description needs updating to reflect community + AI-doc search passes
- Stage descriptions for 1-13 may need minor wording updates to reflect new capabilities
- No structural changes needed — workflow stages remain the same

**Estimated Changes:** ~10-20 lines of updates within existing stage descriptions

### 4.2 Scripts

**No new scripts required** per requirements scope ("Adding new MCP server dependencies" is out of scope). All new search capabilities leverage existing Firecrawl MCP with site-filters and existing supplementary scripts.

**scripts/README.md** needs update to document new search modes available via search-agent.

### 4.3 Gate Scripts (scripts/gates/)

**Out of scope** per requirements: "Modifying gate scripts — only the agents that produce gated documents change." No gate modifications needed.

---

## 5. Codex Parity Gaps

All 19-20 agents marked for modification have corresponding `.codex/agents/*.toml` files that MUST be updated in parallel (per NFR-05).

**Files requiring .codex mirror updates:**

| Agent (.md) | Codex Mirror (.toml) | Priority |
|-------------|---------------------|----------|
| research-agent.md | research-agent.toml | P0 |
| search-agent.md | search-agent.toml | P0 |
| team-lead.md | team-lead.toml | P0 |
| requirements-clarifier.md | requirements-clarifier.toml | P1 |
| bdd-scenario-writer.md | bdd-scenario-writer.toml | P1 |
| debug-analyzer.md | debug-analyzer.toml | P1 |
| code-assessor.md | code-assessor.toml | P1 |
| architecture-designer.md | architecture-designer.toml | P1 |
| spec-writer.md | spec-writer.toml | P1 |
| code-reviewer.md | code-reviewer.toml | P1 |
| adversarial-reviewer.md | adversarial-reviewer.toml | P1 |
| spec-reviewer.md | spec-reviewer.toml | P2 |
| architecture-improver.md | architecture-improver.toml | P2 |
| docs-executor.md | docs-executor.toml | P2 |
| build-cleaner.md | build-cleaner.toml | P2 |
| tdd-guide.md | tdd-guide.toml | P2 |
| qa-agent.md | qa-agent.toml | P2 |
| e2e-runner.md | e2e-runner.toml | P3 |
| handoff-writer.md | handoff-writer.toml | P3 |
| product-designer.md | product-designer.toml | P3 |

**Total: 20 .codex mirror files requiring updates**

---

## 6. Dependency Map

### Phase 1: Foundation (Must be done first)
```
research-report-template.md ──┐
                               ├── research-agent.md depends on template structure
research-methodology.md  ──────┘
search-agent.md ───── research-agent.md depends on search modes
```

### Phase 2: Core Stage Agents (After Phase 1)
```
team-lead.md (depends on knowing new research-agent capabilities)
requirements-clarifier.md (independent)
bdd-scenario-writer.md (independent)
```

### Phase 3: Analysis & Design Agents (After Phase 2)
```
debug-analyzer.md (independent)
code-assessor.md (independent)
architecture-designer.md (independent)
spec-writer.md (depends on architecture-designer producing DAG format)
```

### Phase 4: Review & Finalization Agents (After Phase 3)
```
spec-reviewer.md (depends on spec-writer format)
code-reviewer.md (independent)
adversarial-reviewer.md (independent)
docs-executor.md (independent)
build-cleaner.md (independent)
tdd-guide.md (independent)
qa-agent.md (independent)
```

### Phase 5: Codex Parity + Skills (After all agent .md changes)
```
.codex/agents/*.toml (mirrors Phase 1-4 changes)
skills/super-dev/SKILL.md (updated stage descriptions)
reference/workflow/research-deep-dive-loop.md (minor update)
```

### Key Constraint
- **research-report-template.md MUST be updated before research-agent.md** (agent references template sections)
- **search-agent.md modes MUST be defined before research-agent.md references them**
- **All agent .md changes MUST precede .codex mirror updates**
- **All changes complete before skills/super-dev/SKILL.md final update**

---

## 7. Risk Areas

### High Risk
1. **research-agent.md + research-report-template.md coupling** — The agent references specific template sections. If template sections are renamed or restructured, the agent's process steps break. Both must be updated atomically.
2. **team-lead.md complexity** — At 332 lines, it's the largest and most complex file. Changes to stage flow descriptions affect the entire orchestration. Must be surgical.
3. **Codex TOML format differences** — .codex agents use TOML format which has different syntax than markdown. Every enhancement must be translated accurately. Risk of drift.

### Medium Risk
4. **Gate script expectations** — Even though gates are out of scope, gate scripts parse template output. New sections in research-report-template.md must not break downstream parsing by architecture-designer and spec-writer.
5. **Context window limits** — Adding content to agents increases prompt size. Large agents (team-lead at 332, architecture-improver at 117, e2e-runner at 110) are already substantial. Must avoid pushing past effective prompt length limits.
6. **Backward compatibility of research reports** — NFR-04 requires existing consumers (architecture-designer, spec-writer, code-assessor) to still parse reports. New sections must be additive only.

### Low Risk
7. **Domain specialist agents unchanged** — The language-specific developers (rust, go, frontend, backend, etc.) don't need changes, reducing blast radius.
8. **Gate scripts unchanged** — Explicit out-of-scope reduces risk of breaking gate validation.

---

## 8. Estimated Scope

### Summary Metrics

| Category | Files to Modify | New Lines (est.) | Complexity |
|----------|----------------|-----------------|------------|
| Agent .md files | 19-20 | ~280-350 | Medium-High |
| Reference files | 4 | ~155-200 | Medium |
| Skills | 1 | ~10-20 | Low |
| .codex mirrors | 20 | ~280-350 (mirrors) | Medium |
| Scripts/Docs | 1 | ~10 | Low |
| **TOTAL** | **~45-46 files** | **~735-930 lines added** | **Medium-High** |

### Work Breakdown

| Phase | Files | Estimated Effort |
|-------|-------|-----------------|
| Phase 1: Foundation (template + methodology + search-agent) | 3 | High — foundational, others depend on this |
| Phase 2: Core Agents (research-agent + team-lead + req-clarifier + bdd-writer) | 4 | High — research-agent is the largest single change |
| Phase 3: Analysis & Design (debug + assessor + architect + spec-writer) | 4 | Medium |
| Phase 4: Review & Finalization (spec-reviewer + code-reviewer + adversarial + docs + build-cleaner + tdd + qa) | 7 | Medium — mostly smaller additions |
| Phase 5: Codex Parity + Skills | 21 | Medium — mechanical translation |
| **TOTAL** | **~39-46** | **Substantial but well-bounded** |

### Key Observations

1. **No new files needed** — All changes are modifications to existing files (per requirements: "only modifying existing ones")
2. **No structural changes** — Stage numbering unchanged, directory structure unchanged, gate scripts unchanged
3. **Additive-only template changes** — New sections added, nothing removed (NFR-04 compliance)
4. **Largest single change:** research-agent.md (~60-80 new lines) and research-report-template.md (~80-100 new lines)
5. **Mechanical mirror phase:** Codex TOML updates are high-count but low-complexity (translation of already-finalized .md content)
6. **Existing patterns preserved:** All agents already use XML-based prompt structure, security baselines, render pipelines — enhancements follow same patterns
