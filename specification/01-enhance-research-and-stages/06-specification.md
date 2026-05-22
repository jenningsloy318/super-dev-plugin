# Technical Specification: Enhance Research Stage and Upgrade All Stages

**Date:** 2026-05-22
**Status:** Draft
**Traces:** REQ-01 through REQ-05, NFR-01 through NFR-07

---

## 1. Overview and Goals

### 1.1 Purpose

Transform the super-dev plugin from a structured-but-static workflow into a continuously-improving system that integrates the latest discoveries in AI-driven software development. The enhancement has two dimensions:

1. **Research Stage (Stage 3) Upgrade** — Expand research beyond codebase exploration to include community signals, AI company documentation, innovation discovery, and cross-domain patterns.
2. **All-Stage Best Practice Upgrade** — Audit and enhance every stage (1-13) with cutting-edge AI-assisted development practices.

### 1.2 Goals

- Research agent discovers industry best practices, community consensus, and emerging technologies for every task
- AI company documentation (Anthropic, OpenAI, Google) is systematically traversed for workflow patterns
- All 13 stages incorporate latest AI-agent development techniques
- Community signals are scored with momentum metrics and emerging consensus detection
- Discoveries that improve the plugin itself are flagged for continuous improvement
- Platform parity between Claude Code (agents/*.md) and Codex CLI (.codex/agents/*.toml) is maintained

### 1.3 Design Strategy

All changes are **additive modifications** to existing agent prompts, templates, and reference files. No structural rewrites, no new agent files, no stage renumbering, no gate script modifications. The architecture document's Approach A (Additive Enhancement) is the selected strategy.

---

## 2. Component Design

### 2.1 Search Agent Enhancement (search-agent.md)

**Satisfies:** SCENARIO-002, SCENARIO-004, SCENARIO-007-010, SCENARIO-024, SCENARIO-025, SCENARIO-026

#### New Mode: `community`

Site-filtered searches targeting developer community platforms:
- Reddit: `site:reddit.com/r/programming OR r/ExperiencedDevs OR r/{stack-subreddit}`
- HackerNews: `site:news.ycombinator.com {topic} {year}`
- GitHub Discussions: `site:github.com/*/discussions {topic}`
- Dev.to: `site:dev.to {topic} {year}`
- X/Twitter: Exa social mode with expert filters
- Stack Overflow: `site:stackoverflow.com [tag:{tech}] {topic}`

Quality thresholds (NFR-03):
- Reddit: 10+ upvotes
- GitHub Issues: 5+ reactions
- HackerNews: 10+ points
- Content: 100+ words, no duplicates, no spam

#### New Mode: `ai-docs`

Targeted searches of AI company documentation:

| Provider | Targets |
|----------|---------|
| Anthropic | docs.anthropic.com, anthropic.com/engineering, anthropic.com/research, code.claude.com/docs |
| OpenAI | platform.openai.com, openai.com/blog, cookbook.openai.com |
| Google | ai.google.dev, cloud.google.com/vertex-ai, deepmind.google/research |
| Frameworks | LangChain/LangGraph, CrewAI, AutoGen, DSPy, Instructor |

Search topics per provider: prompt engineering, agent orchestration, tool use, context management, multi-agent patterns, structured output.

#### Momentum Scoring Algorithm

```
momentum = (engagement_normalized × 0.4) + (recency_score × 0.35) + (authority × 0.25)

engagement_normalized: scaled 0-1 within source type
recency_score: < 3mo = 1.0, 3-6mo = 0.8, 6-12mo = 0.5, 12-18mo = 0.3, > 18mo = 0.0
authority: verified_maintainer = 1.0, recognized_expert = 0.9, active_contributor = 0.7, general = 0.5
```

#### Emerging Consensus Detection

When 3+ independent sources converge on the same recommendation within a 6-month window, flag as "Emerging Consensus" with source count and confidence.

---

### 2.2 Research Agent Enhancement (research-agent.md)

**Satisfies:** SCENARIO-001 through SCENARIO-006, SCENARIO-011, SCENARIO-026, SCENARIO-027, SCENARIO-028, SCENARIO-030, SCENARIO-031

#### Enhanced Process Flow

The existing 6-step process gains 4 new parallel passes:

```
Step 1:   Context & Planning (unchanged)
Step 2:   Firecrawl MCP Search (unchanged)
Step 3:   Supplementary Searches (unchanged)
Step 3.5: Community Discovery Pass (NEW — parallel with Step 4)
Step 3.7: AI Documentation Traversal (NEW — parallel with Step 3.5)
Step 4:   Version Awareness (unchanged)
Step 4.5: Innovation Discovery (NEW)
Step 5:   Synthesize & Present Options (ENHANCED — adds innovation/momentum scoring)
Step 6:   Flag Issues (ENHANCED — adds Internal Improvement Suggestions)
```

Steps 3.5 and 3.7 execute in parallel to satisfy NFR-01 (latency constraint of max 150% baseline).

#### Community Discovery Pass (Step 3.5)

Uses search-agent `community` mode. Produces the "Community Discoveries" and "Community Pulse" template sections. Applies momentum scoring and emerging consensus detection.

#### AI Documentation Traversal (Step 3.7)

Uses search-agent `ai-docs` mode. Produces the "AI Workflow Patterns" template section with: prompt engineering discoveries, agent coordination patterns, tool-use optimizations, context management strategies.

#### Innovation Discovery (Step 4.5)

Search strategies:
1. Direct: `"{topic} new approach 2025 2026"`
2. Alternatives: `"{current_tech} alternative new 2025"`
3. Cross-domain: `"{problem_type} solution {adjacent_domain}"`
4. Emerging: `"emerging {topic} technology {year}"`

Filtering: first release within 12 months, active development (commits within 3 months), community traction (stars > 100 OR downloads > 1000).

Innovation potential scoring:
```
potential = (community_momentum × 0.3) + (problem_fit × 0.3) + (adoption_ease × 0.2) + (maturity_trajectory × 0.2)
```

#### Enhanced Synthesis (Step 5)

- Add "Innovation/Momentum" dimension to options comparison matrix (SCENARIO-006)
- Detect and flag emerging consensus across all retrieved signals (SCENARIO-026)
- Cross-domain findings labeled with origin domain (SCENARIO-004)

#### Internal Improvement Suggestions (Step 6 enhancement)

For each discovery, evaluate: "Does this technique improve the super-dev workflow itself?" If yes, add to "Internal Improvement Suggestions" section with: technique name, affected stage(s), estimated impact, implementation sketch (SCENARIO-028).

---

### 2.3 Research Report Template (research-report-template.md)

**Satisfies:** SCENARIO-003, SCENARIO-005, SCENARIO-011, SCENARIO-027, SCENARIO-028

Five new sections added AFTER "Implementation Considerations" and BEFORE "Contradictions Found":

1. **Community Discoveries** (AC-05) — Table with: ID, Insight, Source, Date, Momentum score, Consensus flag
   - **Community Pulse** subsection (AC-28) — Active discussions, pain points, novel solutions
2. **New Technologies and Approaches** (AC-03) — Table with: Technology, First Release, Maturity, Innovation Potential, Relevance, Source
3. **AI Workflow Patterns** (AC-11) — Table with: Pattern, Category, Source, Applicability
4. **Internal Improvement Suggestions** (AC-29) — List with: IMP-NNN ID, technique, stage improved, impact level, sketch

Additional template modifications:
- Add "Innovation/Momentum" row to Options Comparison matrix (AC-06)
- Update Gate Compliance Notes with new ID formats (COM-NNN, IMP-NNN) and scoring rules

All new sections are **optional** — include only when research yields relevant findings. Empty sections are omitted entirely (NFR-04 backward compatibility).

---

### 2.4 Research Methodology (research-methodology.md)

**Satisfies:** SCENARIO-002, SCENARIO-007-010, SCENARIO-024, SCENARIO-025, SCENARIO-026

Four new processes added:

1. **Community Source Discovery** — Site-filtered searches, quality thresholds, momentum scoring, consensus detection, source freshness enforcement (NFR-02)
2. **AI Documentation Traversal** — Systematic provider-by-provider search, pattern extraction, applicability assessment
3. **Innovation Discovery** — Recent technology search, cross-domain exploration, innovation potential scoring
4. **Momentum Scoring** — Formula definition with engagement/recency/authority weights

---

### 2.5 Team Lead Enhancement (team-lead.md)

**Satisfies:** SCENARIO-012, SCENARIO-029, SCENARIO-035

Modifications:
- **Stage 1:** Add improved auto-detection guidance (detect language, framework, test runner, CI from filesystem)
- **Stage 3:** Add note about competing hypotheses mode for complex/contentious research topics
- **Stage 13:** Add semantic commit format, PR description automation from spec, pre-merge CI-equivalent checks
- **Post-workflow:** Recognize "Internal Improvement Suggestions" from research report and present to user (AC-30)
- **General constraint:** Effort level recommendations per stage (research/design: xhigh, implementation: xhigh, review: high, docs/cleanup: medium)
- **Competing hypotheses guidance:** Optional mode to spawn 2-3 research agents with different perspectives for complex topics

---

### 2.6 Requirements Clarifier Enhancement (requirements-clarifier.md)

**Satisfies:** SCENARIO-013

- New principle: "Codebase-Grounded Requirements" — search for similar features before generating ACs
- New step 1.5: "Context Retrieval" — identify naming conventions, module boundaries, test patterns
- Enhanced ambiguity detection: systematic categorization (Scope, Behavior, Data, Integration, Performance)

---

### 2.7 BDD Scenario Writer Enhancement (bdd-scenario-writer.md)

**Satisfies:** SCENARIO-013

- New step 2.5: "Edge Case Generation" — null/empty inputs, boundary values, concurrent access, timeouts, permissions, overflow, invalid state transitions
- New constraint: "Quality Self-Score" — self-assess 1-10 against specificity, independence, coverage, testability. Score < 7 triggers self-revision.

---

### 2.8 Debug Analyzer Enhancement (debug-analyzer.md)

**Satisfies:** SCENARIO-014

- New principle: "Chain-of-Thought Traces" — explicit step-by-step reasoning documentation
- Enhanced hypothesis generation: tree structure (not flat list) with probability estimates summing to 100% per level
- New step 5.5: "Automated Reproduction Script" — generate standalone script that triggers bug deterministically
- Enhanced reproduction strategy: add community search for identical error messages/symptoms
- Competing hypotheses note: for complex bugs, team-lead may spawn parallel debug-analyzer instances

---

### 2.9 Code Assessor Enhancement (code-assessor.md)

**Satisfies:** SCENARIO-015

- New principle: "Subagent Exploration" — spawn exploration subagents for large codebases
- New step 2.5: "Architecture Smell Detection" — God Class, Feature Envy, Shotgun Surgery, Divergent Change, Inappropriate Intimacy with file:line evidence
- Enhanced dependency analysis: community signals (last commit, CVEs, stars trend, downloads, maintenance status). Score: Healthy/Warning/Critical
- New step 4.5: "Pattern Library Extraction" — identify 3-5 canonical patterns for downstream stages
- Enhanced technical debt: structured inventory with severity, effort hours, blast radius, priority

---

### 2.10 Architecture Designer Enhancement (architecture-designer.md)

**Satisfies:** SCENARIO-016

- New principle: "Task Graph Thinking" — structure implementation plans as DAGs enabling parallel execution
- Enhanced interface design: explicitly mark parallelizable modules (those implementable independently given stable interfaces)
- Enhanced evaluation criteria: AI-aware considerations (prompt caching friendliness, token budget efficiency, parallel agent execution potential, context window sustainability)
- New constraint: "Parallelism Annotation" — architecture document MUST annotate [PARALLEL: A, B, C] vs [SERIAL: D → E → F]

---

### 2.11 Architecture Improver Enhancement (architecture-improver.md)

**Satisfies:** SCENARIO-016

- Add AI-aware pattern awareness matching architecture-designer's enhancements
- Ensure improvement suggestions consider parallel execution potential and context engineering

---

### 2.12 Spec Writer Enhancement (spec-writer.md)

**Satisfies:** SCENARIO-017

- Enhanced implementation plan: structure as dependency graph (DAG) with `depends_on` and `parallelizable_with` fields per phase
- Enhanced specification format: XML tags for AI consumption, machine-parseable AC IDs, BDD SCENARIO-ID references, long context at TOP/queries at BOTTOM
- New constraint: "Contract-First" — every module interface MUST have explicit I/O type signatures

---

### 2.13 Spec Reviewer Enhancement (spec-reviewer.md)

**Satisfies:** SCENARIO-018

- New step 3.5: "Anti-Pattern Verification" — check for YAGNI violations, premature optimization, untestable requirements, missing error paths, gold-plating
- Enhanced completeness: quantitative percentage (ACs addressed / total ACs × 100). < 100% = automatic rejection
- Enhanced grounding: numeric score (verified_references / total_references × 100). < 90% = HIGH finding

---

### 2.14 Code Reviewer Enhancement (code-reviewer.md)

**Satisfies:** SCENARIO-020

- New principle: "Coverage-First (Anthropic Opus 4.7)" — report EVERY issue including uncertain/low-severity. Goal is coverage, not filtering
- New constraint: "Fresh Context Mandate" — never review code you generated; writer/reviewer separation required
- Enhanced dimension reviews: per-finding annotation (severity, confidence 0.0-1.0, file:line, failure scenario, suggested fix)
- Remove any "be conservative" or "don't nitpick" language that causes Opus 4.7 under-reporting

---

### 2.15 Adversarial Reviewer Enhancement (adversarial-reviewer.md)

**Satisfies:** SCENARIO-020

- New principle: "Coverage-First" — same as code-reviewer
- Enhanced attack vectors: AI-specific patterns (prompt injection, token budget exhaustion, context window overflow, sensitive data leakage, non-deterministic security-critical paths)
- New constraint: "Fresh Context" — adversarial review must operate in clean context

---

### 2.16 TDD Guide Enhancement (tdd-guide.md)

**Satisfies:** SCENARIO-019

- New constraint: "Anti-Hardcoding (MANDATORY)" — implement actual logic, never hardcoded return values
- New principle: "Feature-Complete Verification" — completion signal is passing tests, not code commit
- Enhanced process: test ordering for maximum feedback (simplest constraining test first, then boundaries, then errors)

---

### 2.17 QA Agent Enhancement (qa-agent.md)

**Satisfies:** SCENARIO-019

- New step 2.5: "Feature-by-Feature Verification" — verify happy path, edge cases, error handling per feature
- New constraint: "Self-Verification" — execute tests before reporting, never report from code inspection alone
- Enhancement: Playwright MCP for UI verification when available

---

### 2.18 Docs Executor Enhancement (docs-executor.md)

**Satisfies:** SCENARIO-021

- New principle: "AI-Optimized Documentation" — structured for both human and AI agent consumption
- New step 1.5: "Changelog from Git" — auto-generate from git log/diff, parse conventional commits
- Enhanced API docs: extract from type definitions rather than manual writing
- New constraint: "Handoff as Memory" — format handoff with memory-compatible frontmatter

---

### 2.19 Build Cleaner Enhancement (build-cleaner.md)

**Satisfies:** SCENARIO-022

- New step 1.5: "Sensitive Data Scan" — pattern-match for .env values, API keys, credentials, private keys, tokens. Any finding is BLOCKING
- Enhanced cleanup: intelligent artifact detection (orphaned generated files, large binaries, unexpected node_modules/target/)
- New step 5.5: "End-of-Session State" — update workflow-tracking.json with final status

---

### 2.20 Team Lead Stage 13 Enhancement

**Satisfies:** SCENARIO-023

- Enhanced commit process: conventional commit format, spec summary, test plan reference, breaking change markers, AC-ID traceability
- Enhanced pre-merge: CI-equivalent local checks (build, test, lint, type-check)
- PR description auto-generation from specification

---

### 2.21 Research Deep-Dive Loop (research-deep-dive-loop.md)

**Satisfies:** SCENARIO-004, SCENARIO-014

- Add competing hypotheses variant: when team-lead judges topic benefits from multiple perspectives, spawn 2-3 research agents with different angles
- Add community deep-dive option: when community signals are unresolved, focused community re-search

---

## 3. Testing Strategy

### 3.1 Gate Validation (Primary Mechanism)

The existing gate scripts (unchanged per scope) validate agent outputs. New template sections are validated through:
- Gate-research-report validates presence of required sections when content exists
- New sections being optional (NFR-04) means missing sections don't trigger gate failures
- ID format validation (COM-NNN, IMP-NNN) is enforced by template structure

### 3.2 Platform Parity Verification

After Phase 7 (Codex parity), manual verification:
- Count matching: principles, steps, constraints per agent
- Content equivalence: ensure TOML descriptions match .md content semantically
- SCENARIO-035 satisfied by this verification step

### 3.3 Backward Compatibility Validation

- Research reports with new sections must still parse correctly by architecture-designer, spec-writer, code-assessor
- Validation: generate a sample report with all new sections, verify downstream agents can extract their required information (SCENARIO-030, SCENARIO-031)

### 3.4 Integration Testing (Per-Phase)

Each implementation phase is independently verifiable:
- Phase 1: Template renders correctly with render.sh; search modes execute without error
- Phase 2: Research agent produces report with new sections populated
- Phase 3-6: Each enhanced agent produces output meeting its gate requirements
- Phase 7: Codex agents produce equivalent outputs

---

## 4. Error Handling and Graceful Degradation

### 4.1 Unreachable Community Sources (SCENARIO-030, NFR-07)

When community sources return errors or are unreachable:
1. Research agent proceeds with available sources
2. "Limitations" section in report notes which sources were unavailable
3. Workflow is NOT blocked — community sections are optional
4. If ALL sources unreachable, "Community Discoveries" section is omitted entirely

### 4.2 No New Technologies Found (SCENARIO-031)

When no technologies < 12 months old are found for a mature domain:
1. "New Technologies & Approaches" section states "No emerging alternatives identified"
2. Report still includes current best practices with maturity assessment
3. Scoring proceeds with available options only

### 4.3 AI Documentation Unreachable/Moved (SCENARIO-032)

When AI company docs return 404 or redirect:
1. Agent attempts alternate known documentation paths
2. Notes gaps in "AI Workflow Patterns" section
3. Does NOT fabricate or hallucinate documentation content
4. Falls back to cached/known patterns if available

### 4.4 Search Latency Threshold (SCENARIO-033, NFR-01)

When research duration approaches 150% baseline:
1. Parallel execution enforced for remaining searches
2. Low-priority searches cancelled if timeout imminent
3. Report notes which searches were time-limited
4. Priority order: primary (Step 2) > supplementary (Step 3) > community (Step 3.5) > AI docs (Step 3.7) > innovation (Step 4.5)

### 4.5 Source Freshness (SCENARIO-034, NFR-02)

Sources with publication date > 18 months:
1. Must NOT be cited without cross-referencing a newer source
2. If no newer corroborating source exists, finding marked "unverified - stale source"
3. Recency score reflects staleness (score 0.0 for > 18mo per momentum formula)

---

## 5. Platform Parity Approach (SCENARIO-035, NFR-05)

### 5.1 Translation Rules

| Markdown (agents/*.md) | TOML (.codex/agents/*.toml) |
|---|---|
| `<principle name="X">Y</principle>` | `[[principles]]` table: `name = "X"`, `description = "Y"` |
| `<step n="N" name="X">Y</step>` | `[[process.steps]]`: `number = "N"`, `name = "X"`, `description = "Y"` |
| `<constraint name="X">Y</constraint>` | `[[constraints]]`: `name = "X"`, `rule = "Y"` |
| `<gotcha>X</gotcha>` | `[[gotchas]]`: `description = "X"` |

### 5.2 Execution Strategy

1. ALL agent .md changes finalized first (Phases 1-6)
2. TOML mirrors created in a single phase (Phase 7) to prevent double-work
3. Parity verified by count-matching (principles, steps, constraints per agent)

### 5.3 Affected Files (20 .codex mirrors)

Every modified agent has a corresponding .codex/agents/{name}.toml that must receive equivalent content. See implementation plan Phase 7 for complete list.

---

## 6. BDD Scenario Satisfaction Map

| Scenario | Component | How Satisfied |
|----------|-----------|---------------|
| SCENARIO-001 | research-agent Step 2 + templates | Industry best practices in existing search, enhanced with structured section |
| SCENARIO-002 | search-agent `community` mode + research-agent Step 3.5 | Dedicated community search passes |
| SCENARIO-003 | research-report-template "New Technologies" section + research-agent Step 4.5 | Technologies < 12mo with maturity assessment |
| SCENARIO-004 | research-agent Step 4.5 cross-domain search | Adjacent ecosystem search with labeled origin |
| SCENARIO-005 | research-report-template "Community Discoveries" section | Source links, recency scores, sorted by relevance |
| SCENARIO-006 | research-agent Step 5 enhanced scoring | Innovation/Momentum dimension in comparison matrix |
| SCENARIO-007 | search-agent `ai-docs` mode (Anthropic) | Site-filtered Anthropic doc searches |
| SCENARIO-008 | search-agent `ai-docs` mode (OpenAI) | Site-filtered OpenAI doc searches |
| SCENARIO-009 | search-agent `ai-docs` mode (Google) | Site-filtered Google doc searches |
| SCENARIO-010 | search-agent `ai-docs` mode (Frameworks) | LangChain, CrewAI, AutoGen, DSPy searches |
| SCENARIO-011 | research-report-template "AI Workflow Patterns" section | Pattern/Category/Source/Applicability table |
| SCENARIO-012 | team-lead Stage 1 enhancement | Improved auto-detection, config write guidance |
| SCENARIO-013 | requirements-clarifier + bdd-scenario-writer enhancements | Context retrieval, edge cases, quality scoring |
| SCENARIO-014 | debug-analyzer enhancement | Chain-of-thought, hypothesis trees, reproduction scripts |
| SCENARIO-015 | code-assessor enhancement | Smell detection, dependency health, debt quantification |
| SCENARIO-016 | architecture-designer enhancement | AI-aware patterns, DAG format, parallelism annotation |
| SCENARIO-017 | spec-writer enhancement | DAG implementation plan, AI-consumable format, contracts |
| SCENARIO-018 | spec-reviewer enhancement | Anti-pattern check, completeness %, grounding score |
| SCENARIO-019 | tdd-guide + qa-agent enhancements | Anti-hardcoding, feature-complete verification |
| SCENARIO-020 | code-reviewer + adversarial-reviewer enhancements | Coverage-first, confidence scoring, fresh context |
| SCENARIO-021 | docs-executor enhancement | AI-optimized docs, changelog automation, memory handoff |
| SCENARIO-022 | build-cleaner enhancement | Sensitive data scan, intelligent artifacts, session state |
| SCENARIO-023 | team-lead Stage 13 enhancement | Semantic commits, PR automation, pre-merge checks |
| SCENARIO-024 | search-agent `community` mode | All 6 community platforms with site filters |
| SCENARIO-025 | search-agent momentum scoring | Composite engagement + recency + authority metric |
| SCENARIO-026 | search-agent emerging consensus + research-agent Step 5 | 3+ source convergence detection |
| SCENARIO-027 | research-report-template Community Pulse subsection | Active discussions, pain points, traction |
| SCENARIO-028 | research-agent Step 6 + research-report-template | Internal Improvement Suggestions section |
| SCENARIO-029 | team-lead post-workflow check | Present IMP suggestions to user after completion |
| SCENARIO-030 | research-agent graceful degradation | Proceed with available sources, note gaps |
| SCENARIO-031 | research-agent Step 4.5 fallback | "No emerging alternatives identified" fallback |
| SCENARIO-032 | search-agent ai-docs error handling | Alternate paths, gap noting, no hallucination |
| SCENARIO-033 | research-agent parallel execution + priority | Parallel enforcement, low-priority cancellation |
| SCENARIO-034 | momentum scoring recency component | > 18mo = 0.0 score, cross-reference requirement |
| SCENARIO-035 | Phase 7 Codex parity + verification | Count-match verification of all mirrors |

---

## 7. Constraints and Non-Functional Compliance

| NFR | How Satisfied |
|-----|---------------|
| NFR-01: Search Latency | Steps 3.5 and 3.7 execute in parallel; priority-based cancellation on timeout |
| NFR-02: Source Freshness | Momentum scoring gives 0.0 to > 18mo; must cross-reference to cite stale sources |
| NFR-03: Signal-to-Noise | Quality thresholds per platform (10+ upvotes, 5+ reactions, 10+ points, 100+ words) |
| NFR-04: Backward Compat | All new sections are additive and optional; existing consumers unaffected |
| NFR-05: Platform Parity | Phase 7 mirrors all changes; count-match verification |
| NFR-06: Idempotency | Deterministic scoring formula; consistent filtering thresholds; same inputs → same rankings |
| NFR-07: Graceful Degradation | Optional sections omitted when sources unavailable; "Limitations" section notes gaps |
