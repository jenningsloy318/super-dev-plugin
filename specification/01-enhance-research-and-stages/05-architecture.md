# Architecture Improvement Design: Enhance Research & Upgrade All Stages

**Date:** 2026-05-22
**Type:** Improvement to existing system (not greenfield)
**Scope:** All 13 stages of super-dev workflow

---

## 1. Improvement Strategy

### Approach: Deepen Existing Modules

This is an enhancement of existing agent prompts, templates, and reference files — not a structural rewrite. The stage numbering, directory structure, gate scripts, and workflow mechanics remain unchanged. All improvements are additive prompt content within established XML-tagged agent formats.

### Design Principles

1. **Additive only** — New sections/steps added to agents and templates; nothing removed (NFR-04 backward compatibility)
2. **Pattern consistency** — Every agent enhancement follows the same structural pattern (see Section 2)
3. **Minimal coupling** — New capabilities (community search, AI-doc search) are expressed as new modes/steps within existing agents, not new agents
4. **Template-first** — Template changes land before agent changes (agents reference template sections)
5. **Parallel-safe** — New search passes are designed for concurrent execution (NFR-01 latency constraint)

### Change Classification

| Change Type | Example | Risk Level |
|-------------|---------|------------|
| New process steps | Add community search step to research-agent | Low |
| New template sections | Add "Community Discoveries" section | Low (additive) |
| New search modes | Add `community` and `ai-docs` modes to search-agent | Low |
| New constraints/principles | Add coverage-first prompting to reviewers | Low |
| Methodology additions | Add momentum scoring to research-methodology | Low |
| Team-lead orchestration notes | Note about effort levels per stage | Medium (complex file) |

---

## 2. Agent Enhancement Pattern

Every agent modification follows this consistent structural pattern. This ensures predictable changes across all 19-20 agents.

### Enhancement Template

For each agent requiring modification, changes fall into exactly these categories (applied where applicable):

```
┌─────────────────────────────────────────────────────────┐
│ 1. PRINCIPLES (0-2 new)                                 │
│    New guiding principles from research findings        │
│    Placement: inside existing <principles> block        │
├─────────────────────────────────────────────────────────┤
│ 2. PROCESS STEPS (1-4 new/modified)                     │
│    New steps or substeps within existing <process>      │
│    Placement: as new <step> elements or additions to    │
│    existing step content                                │
├─────────────────────────────────────────────────────────┤
│ 3. CONSTRAINTS (0-2 new)                                │
│    New operational constraints from best practices      │
│    Placement: inside existing <constraints> block       │
├─────────────────────────────────────────────────────────┤
│ 4. GOTCHAS (0-2 new)                                    │
│    New failure modes to watch for                       │
│    Placement: inside existing <gotchas> block           │
├─────────────────────────────────────────────────────────┤
│ 5. CONFIDENCE/QUALITY GATES (0-1 modified)              │
│    Adjustments to quality thresholds or gate criteria   │
│    Placement: within existing gate blocks               │
└─────────────────────────────────────────────────────────┘
```

### Enhancement Rules

- **No new XML top-level blocks** — Everything fits within existing structural elements
- **Step numbering preserved** — New steps use fractional numbering (e.g., 2.5) or extend existing step content rather than renumbering
- **Principle names are unique** — No duplication with existing principles
- **Constraint names follow pattern** — `Name (CATEGORY)` format where CATEGORY indicates the source (e.g., "Coverage-First (Anthropic Opus 4.7)")

---

## 3. Research Agent Architecture

### 3.1 Multi-Pass, Multi-Source Research Design

The research-agent currently has 6 process steps (Context → Firecrawl → Supplementary → Version Awareness → Synthesize → Flag Issues). The enhancement adds 4 new passes between the existing steps, designed for parallel execution.

```
CURRENT FLOW (sequential):
  Step 1: Context & Planning
  Step 2: Firecrawl MCP Search
  Step 3: Supplementary Searches
  Step 4: Version Awareness
  Step 5: Synthesize & Present Options
  Step 6: Flag Issues

ENHANCED FLOW (with parallel expansion):
  Step 1:   Context & Planning (unchanged)
  Step 2:   Firecrawl MCP Search (unchanged — primary discovery)
  Step 3:   Supplementary Searches (unchanged — existing tools)
  Step 3.5: Community Discovery Pass (NEW — parallel with Step 4)
            └── Reddit, HN, GitHub Discussions, Dev.to, X/Twitter
            └── Site-filtered Firecrawl searches
            └── Momentum scoring (engagement × recency × authority)
  Step 3.7: AI Documentation Traversal (NEW — parallel with Step 3.5)
            └── Anthropic docs/engineering/research
            └── OpenAI platform/blog/cookbook
            └── Google AI/Vertex/DeepMind
            └── Framework docs (LangChain, CrewAI, DSPy, Instructor)
  Step 4:   Version Awareness (unchanged)
  Step 4.5: Innovation Discovery (NEW — after version awareness)
            └── Search for technologies < 12 months old
            └── Cross-domain pattern search (adjacent ecosystems)
            └── Innovation potential scoring
  Step 5:   Synthesize & Present Options (ENHANCED)
            └── Add Innovation/Momentum row to comparison matrix
            └── Add Emerging Consensus detection (3+ sources within 6mo)
  Step 6:   Flag Issues (ENHANCED)
            └── Add "Internal Improvement Suggestions" output
            └── Flag discoveries that improve the plugin workflow itself
```

### 3.2 Community Search Architecture

New step 3.5 uses search-agent's new `community` mode:

```
COMMUNITY DISCOVERY PASS:
  Input: Research topic + technology stack from Step 1
  
  Searches (parallel via Firecrawl site filters):
    1. site:reddit.com/r/programming OR r/ExperiencedDevs OR r/{stack}
    2. site:news.ycombinator.com {topic} {year}
    3. site:github.com/*/discussions {topic}
    4. site:dev.to {topic} {year}
    5. X/Twitter via Exa social mode: {topic} experts
    6. site:stackoverflow.com [tag:{tech}] {topic}
  
  Filtering (NFR-03):
    - Reddit: 10+ upvotes minimum
    - GitHub Issues: 5+ reactions minimum
    - HN: 10+ points minimum
    - Exclude: < 100 words, duplicate content, obvious spam
  
  Scoring — Momentum Metric:
    momentum = (engagement_normalized × 0.4) + (recency_score × 0.35) + (authority × 0.25)
    
    engagement_normalized: upvotes/reactions scaled 0-1 within source type
    recency_score: < 3mo = 1.0, 3-6mo = 0.8, 6-12mo = 0.5, 12-18mo = 0.3
    authority: verified_maintainer = 1.0, recognized_expert = 0.9, active_contributor = 0.7, general = 0.5
  
  Output: Community Discoveries section with:
    - Source link, publication date, momentum score
    - Key insight extracted
    - Emerging Consensus flag (when 3+ sources converge within 6mo)
```

### 3.3 AI Documentation Traversal Architecture

New step 3.7 uses search-agent's new `ai-docs` mode:

```
AI DOCUMENTATION TRAVERSAL:
  Input: Current research topic + workflow improvement angle
  
  Source Matrix:
  ┌─────────────┬────────────────────────────────────────────────────┐
  │ Provider    │ Search Targets                                     │
  ├─────────────┼────────────────────────────────────────────────────┤
  │ Anthropic   │ docs.anthropic.com, anthropic.com/engineering,     │
  │             │ anthropic.com/research, code.claude.com/docs       │
  ├─────────────┼────────────────────────────────────────────────────┤
  │ OpenAI      │ platform.openai.com, openai.com/blog,              │
  │             │ cookbook.openai.com                                 │
  ├─────────────┼────────────────────────────────────────────────────┤
  │ Google      │ ai.google.dev, cloud.google.com/vertex-ai,         │
  │             │ deepmind.google/research                           │
  ├─────────────┼────────────────────────────────────────────────────┤
  │ Frameworks  │ LangChain/LangGraph docs, CrewAI docs,             │
  │             │ AutoGen docs, DSPy docs, Instructor docs           │
  └─────────────┴────────────────────────────────────────────────────┘
  
  Search Topics (per provider):
    - Prompt engineering patterns
    - Agent orchestration / coordination
    - Tool use optimization
    - Context window management
    - Multi-agent patterns
    - Structured output techniques
  
  Output: AI Workflow Patterns section with:
    - Pattern name, source, applicability
    - Prompt engineering discoveries
    - Agent coordination insights
    - Context management strategies
```

### 3.4 Innovation Discovery Architecture

New step 4.5 searches for recent innovations:

```
INNOVATION DISCOVERY:
  Input: Technology stack + problem domain from Step 1
  
  Search Strategy:
    1. Direct: "{topic} new approach 2025 2026"
    2. Alternatives: "{current_tech} alternative new 2025"
    3. Cross-domain: "{problem_type} solution {adjacent_domain}"
    4. Emerging: "emerging {topic} technology {year}"
  
  Filtering:
    - First release/announcement within 12 months
    - Active development (commits within 3 months)
    - Community traction (GitHub stars > 100 OR npm weekly > 1000)
  
  Innovation Potential Scoring:
    potential = (community_momentum × 0.3) + (problem_fit × 0.3) + 
               (team_adoption_ease × 0.2) + (maturity_trajectory × 0.2)
  
  Output: New Technologies & Approaches section with:
    - Technology name, first release date, current maturity
    - Why it's relevant to this requirement
    - Adoption risk assessment
    - Innovation potential score
```

### 3.5 Internal Improvement Suggestions

After synthesis, research-agent evaluates findings for plugin-workflow applicability:

```
SELF-IMPROVEMENT CHECK:
  For each discovery, ask:
    "Does this technique improve the super-dev workflow itself?"
  
  If YES → Add to "Internal Improvement Suggestions" section:
    - Technique name
    - Which stage(s) it improves
    - Expected impact (High/Medium/Low)
    - Implementation sketch (1-2 sentences)
  
  Team-lead recognizes this section post-workflow (AC-30)
```

---

## 4. Context Engineering Design

### 4.1 Just-in-Time Context Loading

Agents load context on demand rather than receiving everything upfront. This is already partially implemented (agents read from spec_directory) but the enhancement makes it explicit:

```
CURRENT: Team Lead passes file paths → Agent reads all at start
ENHANCED: Team Lead passes file paths → Agent reads minimum for current step
           → Loads additional files only when step requires them

Applied to:
- research-agent: Reads requirements for Step 1 planning, reads BDD only in Step 5 synthesis
- spec-writer: Reads requirements first, architecture only when generating plan
- code-reviewer: Reads spec for AC list, reads implementation summary only for diff context
```

### 4.2 Subagent Exploration Pattern

For stages that explore large codebases (Stage 5: Code Assessment), use subagents with separate context windows to prevent context pollution:

```
EXPLORATION PATTERN (code-assessor enhanced):
  Main agent: Orchestrates exploration, holds synthesis context
  
  Exploration subagents (spawned for investigation):
    - Architecture subagent: Explores module boundaries, coupling
    - Dependency subagent: Analyzes package manifests, health
    - Pattern subagent: Identifies recurring code patterns
    - Test subagent: Evaluates test coverage and quality
  
  Each subagent:
    - Gets narrow scope (specific directories/aspects)
    - Reports summary (not raw exploration) back to main
    - Operates in clean context window
  
  Main agent synthesizes summaries into assessment report
```

This pattern is expressed as a **note/guidance** within the code-assessor agent's process steps (not as a hard requirement, since subagent spawning depends on the harness capabilities of the invoking session).

### 4.3 Structured Note-Taking

For multi-step stages (Stage 9: Implementation), use structured progress files:

```
PROGRESS TRACKING (already partially implemented via workflow-tracking.json):
  Enhanced with:
  - Per-phase base_sha tracking (already in team-lead)
  - Implementation summary per phase (already via impl-summary-writer)
  - Git as primary state recovery mechanism
  
  No new mechanism needed — existing patterns sufficient.
  Enhancement: Add guidance to team-lead about memory-compatible state files.
```

### 4.4 Aggressive Compaction Guidance

Add notes to team-lead about when to use `/compact`:

```
COMPACTION STRATEGY (guidance for team-lead):
  - Between major stage transitions (2→3, 5→6, 8→9, 10→11)
  - Focus directive: "/compact Focus on [current stage] outputs"
  - Never compact mid-implementation-phase
  - Prefer fresh context + filesystem discovery for new sessions
```

---

## 5. Competing Hypotheses Pattern

### 5.1 Design for Stage 3 (Research)

When the research topic is complex or contentious, the team-lead can optionally spawn multiple research angles:

```
COMPETING HYPOTHESES MODE (Stage 3 — optional):
  Trigger: Team-lead determines topic benefits from multiple perspectives
           (e.g., architectural decisions, technology selection with no clear winner)
  
  Pattern:
    1. Team-lead spawns 2-3 research-agent instances with different angles:
       - Agent A: "Investigate from performance/scalability perspective"
       - Agent B: "Investigate from developer experience/maintainability perspective"  
       - Agent C: "Investigate from cutting-edge/innovation perspective"
    
    2. Each agent produces a research report independently
    
    3. Team-lead (or a synthesis step) compares findings:
       - Where do reports agree? (high confidence)
       - Where do they disagree? (needs deeper investigation)
       - What did one find that others missed? (gaps)
    
    4. Final report synthesizes the strongest findings from all angles

  Implementation:
    - NOT a mandatory mode — only used when team-lead judges it beneficial
    - Expressed as a NOTE in team-lead's Stage 3 section
    - Uses existing deep-research-loop to resolve disagreements
    - Each spawned instance gets different search emphasis (not different topics)
```

### 5.2 Design for Stage 4 (Debug Analysis)

For complex bugs with unclear root cause, spawn competing debug hypotheses:

```
COMPETING HYPOTHESES MODE (Stage 4 — optional):
  Trigger: Bug has multiple plausible root causes after initial analysis
  
  Pattern:
    1. Initial debug-analyzer produces 3-5 hypotheses (already does this)
    2. If confidence is low on top hypothesis OR multiple score similarly:
       Team-lead spawns 2-3 additional debug-analyzer instances
       Each assigned to deeply investigate 1-2 hypotheses
    
    3. Each instance reports: evidence for, evidence against, confidence
    
    4. Team-lead compares: which hypothesis has strongest evidence?
    
  Implementation:
    - Expressed as guidance in research-deep-dive-loop.md (already has iteration cap)
    - debug-analyzer already generates multiple hypotheses — enhancement is about
      occasionally parallelizing the VERIFICATION step
    - NOT a structural change — just a team-lead orchestration note
```

### 5.3 Key Design Decision: Notes, Not Mechanisms

Competing hypotheses is expressed as **orchestration guidance** in team-lead and research-deep-dive-loop, not as a new structural mechanism. The existing TeamCreate/Agent tool infrastructure already supports spawning multiple instances. The enhancement is making team-lead aware this is a valid strategy for specific scenarios.

---

## 6. Per-Stage Design

### Stage 1: Specification Setup

**Enhancement:** Improved auto-detection guidance in team-lead.

```
ADDITIONS TO team-lead.md (Stage 1 section):
  - Note about detecting project type (language, framework, test runner, CI) 
    from file system indicators during setup
  - Guidance to write detected config to workflow-tracking.json
  
ADDITIONS TO team-lead.md (general constraints):
  - Effort level recommendation note per stage:
    Research/Design: xhigh effort (deep analysis)
    Implementation: xhigh effort (complex coding)
    Review: high effort (thorough but not maximalist)
    Documentation/Cleanup: medium effort (straightforward)
```

### Stage 2: Requirements + BDD

**Enhancement to requirements-clarifier.md:**

```
NEW PRINCIPLE:
  <principle name="Codebase-Grounded Requirements">Before generating ACs, 
  search for similar existing features in the codebase to ground requirements 
  in reality — what patterns exist, what naming conventions, what boundaries</principle>

NEW PROCESS STEP (between existing steps):
  <step n="1.5" name="Context Retrieval">Search codebase for similar features/patterns 
  that inform this requirement. Identify: naming conventions, existing module boundaries, 
  test patterns used for similar features. Use findings to ground AC specificity.</step>

ENHANCEMENT TO EXISTING STEP:
  Add to ambiguity detection: "Systematically categorize ambiguities: 
  Scope (what's in/out), Behavior (what happens when), Data (what format/validation), 
  Integration (how connects to existing), Performance (what thresholds)"
```

**Enhancement to bdd-scenario-writer.md:**

```
NEW PROCESS STEP:
  <step n="2.5" name="Edge Case Generation">After drafting happy-path scenarios, 
  systematically generate edge cases: null/empty inputs, boundary values, concurrent 
  access, timeout scenarios, permission boundaries, data overflow, invalid state 
  transitions. Each edge case becomes a scenario if it reveals meaningful behavior.</step>

NEW CONSTRAINT:
  <constraint name="Quality Self-Score">After writing all scenarios, self-assess 
  quality score (1-10) against: specificity, independence, coverage breadth, 
  testability. Report score in output. Score < 7 triggers self-revision.</constraint>
```

### Stage 3: Research

**See Section 3 above for full architecture.** Summary of changes:

- research-agent.md: 4 new process steps (3.5, 3.7, 4.5, enhanced 5/6)
- search-agent.md: 2 new modes (`community`, `ai-docs`), momentum scoring, emerging consensus detection
- research-report-template.md: 5 new sections (see Section 7)
- research-methodology.md: 4 new processes (community, AI-docs, innovation, momentum)

### Stage 4: Debug Analysis

**Enhancement to debug-analyzer.md:**

```
NEW PRINCIPLE:
  <principle name="Chain-of-Thought Traces">Use explicit step-by-step reasoning 
  traces when verifying hypotheses. Document the logical chain from observation 
  to conclusion — makes the debugging reproducible by others.</principle>

ENHANCEMENT TO STEP 4 (Multi-Hypothesis Generation):
  Add: "Structure hypotheses as a TREE, not a flat list. Top-level hypotheses 
  may have sub-hypotheses (e.g., 'data corruption' → 'write race' OR 'encoding 
  error' OR 'truncation'). Assign probability estimates (sum to 100% at each 
  level). Update probabilities as evidence accumulates."

NEW STEP 5.5 (after hypothesis verification):
  <step n="5.5" name="Automated Reproduction Script">If bug is confirmed 
  reproducible, generate a standalone reproduction script (test file or CLI 
  command) that deterministically triggers the bug. This serves as the regression 
  test foundation.</step>

ENHANCEMENT TO STEP 1 (Reproduction Strategy):
  Add to strategy list: "9. Community search — search for identical error 
  messages or symptoms in GitHub Issues and Stack Overflow for known solutions"
```

### Stage 5: Code Assessment

**Enhancement to code-assessor.md:**

```
NEW PRINCIPLE:
  <principle name="Subagent Exploration">For large codebases, prefer spawning 
  exploration subagents (separate context windows) for each assessment dimension. 
  Each subagent investigates one aspect and reports a summary. Synthesize summaries 
  in main context for the final report.</principle>

NEW PROCESS STEP:
  <step n="2.5" name="Architecture Smell Detection">Check for established 
  architecture smells: God Class (>500 lines, >10 methods doing unrelated things), 
  Feature Envy (methods using more data from other modules than their own), 
  Shotgun Surgery (one change requires edits in 5+ files), Divergent Change 
  (one file changed for unrelated reasons), Inappropriate Intimacy (modules 
  exposing internal state). Report with file:line evidence.</step>

ENHANCEMENT TO STEP 3 (Dependencies):
  Add: "Assess dependency health via community signals: last commit date 
  (> 6mo without commits = warning), open CVE count, GitHub stars trend 
  (declining = concern), npm/crates weekly downloads, maintenance status 
  (deprecated/unmaintained flags). Score each dependency: Healthy/Warning/Critical."

NEW PROCESS STEP:
  <step n="4.5" name="Pattern Library Extraction">Identify 3-5 canonical patterns 
  from the codebase that downstream agents should follow: naming conventions, 
  error handling approach, state management pattern, testing approach, file 
  organization pattern. Document each with file:line example. This becomes the 
  'follow these patterns' reference for Stage 9.</step>

ENHANCEMENT TO STEP 5 (Better Options):
  Add: "Quantify technical debt as structured inventory: each item gets severity 
  (Critical/High/Medium/Low), estimated effort (hours), blast radius (files affected), 
  and recommended priority (Now/Soon/Eventually/Never)."
```

### Stage 6: Design / Architecture

**Enhancement to architecture-designer.md:**

```
NEW PRINCIPLE:
  <principle name="Task Graph Thinking">Structure implementation plans as dependency 
  graphs (DAGs), not flat lists. Identify which tasks can run in parallel 
  (different files/modules) vs. which have serial dependencies. This enables 
  Stage 9 parallel execution.</principle>

ENHANCEMENT TO STEP 3 (Interface Design):
  Add: "Design interfaces that ENABLE parallel implementation. If two modules 
  can be implemented independently (given stable interfaces), mark them as 
  parallelizable in the architecture document. Team-lead uses this to spawn 
  concurrent implementation agents in Stage 9."

ENHANCEMENT TO STEP 4 (Generate Options):
  Add to evaluation criteria: "AI-Aware Considerations: prompt caching friendliness 
  (stable system prompts), token budget efficiency (compact representations), 
  parallel agent execution potential (independent modules), context window 
  sustainability (not exceeding effective prompt length)."

NEW CONSTRAINT:
  <constraint name="Parallelism Annotation">Architecture document MUST annotate 
  which modules/phases can be implemented in parallel (no dependencies between 
  them) vs. which require serial execution. Use notation: [PARALLEL: A, B, C] 
  and [SERIAL: D → E → F].</constraint>
```

### Stage 7: Specification Writing

**Enhancement to spec-writer.md:**

```
ENHANCEMENT TO STEP 3 (Create Implementation Plan):
  Add: "Structure the implementation plan as a dependency graph (DAG). Each phase 
  lists its dependencies (which other phases must complete first). Phases with no 
  mutual dependencies are marked PARALLELIZABLE. The JSON schema's phase objects 
  gain a `depends_on` array field (phase numbers) and a `parallelizable_with` 
  array field. Team-lead uses this to optimize Stage 9 execution order."

ENHANCEMENT TO STEP 2 (Create Technical Specification):
  Add: "Write specs optimized for AI consumption: use XML tags to delineate 
  sections, include machine-parseable acceptance criteria IDs, reference BDD 
  scenarios by SCENARIO-ID. Place long reference context at the TOP, actionable 
  instructions at the BOTTOM (per Anthropic guidance: 'queries at end improve 
  response quality by up to 30%')."

NEW CONSTRAINT:
  <constraint name="Contract-First">Every module interface MUST have explicit 
  input/output type signatures in the specification. These serve as compile-time 
  checkable contracts during implementation.</constraint>
```

### Stage 8: Specification Review

**Enhancement to spec-reviewer.md:**

```
NEW PROCESS STEP:
  <step n="3.5" name="Anti-Pattern Verification">Verify spec does NOT introduce: 
  (a) unnecessary abstractions (YAGNI violations), (b) premature optimization, 
  (c) untestable requirements (no observable behavior), (d) missing error paths 
  for failure modes mentioned in requirements, (e) gold-plating beyond stated 
  requirements. Each violation becomes a finding.</step>

ENHANCEMENT TO EXISTING COVERAGE CHECK:
  Add: "Generate quantitative completeness percentage: 
  (ACs addressed / total ACs) × 100. Report as 'Spec Completeness: XX%'. 
  Completeness < 100% is an automatic REJECTION."

ENHANCEMENT TO GROUNDING CHECK:
  Add: "Calculate numeric grounding score: (verified_references / total_references) × 100. 
  Every file path, API, and pattern referenced in the spec must be verified against 
  the actual codebase. Grounding < 90% is a HIGH finding."
```

### Stage 9: Implementation (TDD)

**Enhancement to tdd-guide.md:**

```
NEW CONSTRAINT:
  <constraint name="Anti-Hardcoding (MANDATORY)">Write general-purpose solutions 
  using standard tools. Do NOT hard-code values or create solutions that only work 
  for specific test inputs. Implement the actual logic. If a test passes ONLY 
  because of a hardcoded return value, the test is meaningless.</constraint>

NEW PRINCIPLE:
  <principle name="Feature-Complete Verification">Only mark a feature complete 
  after end-to-end verification confirms it works — not just after code is written. 
  The feedback loop (test passes) is the completion signal, not the commit.</principle>

ENHANCEMENT TO PROCESS:
  Add: "Order tests for maximum feedback: start with the simplest test that forces 
  the core logic, then add boundary conditions, then error cases. Each passing test 
  constrains the solution further. Never write all tests before any implementation."
```

**Enhancement to qa-agent.md:**

```
NEW PROCESS STEP:
  <step n="2.5" name="Feature-by-Feature Verification">For each implemented feature: 
  (a) verify the happy path works end-to-end, (b) verify edge cases from BDD scenarios, 
  (c) verify error handling produces correct behavior. Only mark feature complete 
  after ALL verification passes. Report per-feature pass/fail status.</step>

NEW CONSTRAINT:
  <constraint name="Self-Verification">Agent MUST run its own verification 
  (execute tests, compare outputs) before reporting results. Never report 
  based on code inspection alone — the tests must actually execute.</constraint>

ENHANCEMENT (for Web/UI):
  Add: "When Playwright MCP is available, use browser automation for UI verification: 
  navigate to feature, interact with elements, capture screenshots, verify visual 
  correctness. This complements unit/integration tests with actual user-flow validation."
```

### Stage 10: Code Review

**Enhancement to code-reviewer.md:**

```
NEW PRINCIPLE:
  <principle name="Coverage-First (Anthropic Opus 4.7)">Report EVERY issue found, 
  including ones you are uncertain about or consider low-severity. Your goal is 
  COVERAGE: it is better to surface a finding that later gets filtered than to 
  silently drop a real bug. Downstream filtering will rank them — your job is 
  to find them.</principle>

NEW CONSTRAINT:
  <constraint name="Fresh Context Mandate">This reviewer MUST operate in a clean 
  context — never review code you generated. Writer/reviewer separation ensures 
  unbiased evaluation. If you have seen the implementation code during generation, 
  you are the WRONG reviewer.</constraint>

ENHANCEMENT TO STEP 4 (Dimension Reviews):
  Add per-finding annotation: "Each finding MUST include: severity (Critical/High/
  Medium/Low/Info), confidence (0.0-1.0 — how certain you are this is a real issue), 
  file:line reference, failure scenario (input → state → bad outcome), and suggested 
  fix. Confidence < 0.5 findings are still reported but tagged as UNCERTAIN."

REMOVE from prompt (if present):
  Remove any language like "be conservative", "don't nitpick", "only report 
  high-severity" — Opus 4.7 follows such instructions too literally, causing 
  under-reporting.
```

**Enhancement to adversarial-reviewer.md:**

```
NEW PRINCIPLE:
  <principle name="Coverage-First">Report every finding including uncertain ones. 
  Your goal is coverage, not precision. Downstream filtering handles ranking.</principle>

ENHANCEMENT TO EXISTING ATTACK VECTORS:
  Add AI-specific attack patterns: "Check for: (a) prompt injection in user-facing 
  inputs that could manipulate downstream AI processing, (b) token budget exhaustion 
  via unbounded input, (c) context window overflow from large payloads, (d) sensitive 
  data leakage through AI-generated outputs, (e) non-deterministic behavior in 
  security-critical paths."

NEW CONSTRAINT:
  <constraint name="Fresh Context">Adversarial review MUST operate in clean context. 
  Never review code you participated in generating.</constraint>
```

### Stage 11: Documentation

**Enhancement to docs-executor.md:**

```
NEW PRINCIPLE:
  <principle name="AI-Optimized Documentation">Generate documentation that is 
  parseable by both humans AND future AI agents: use structured metadata headers, 
  include machine-readable cross-references, organize with consistent heading 
  hierarchy. Future agents bootstrapping from this documentation should find 
  what they need within 1-2 searches.</principle>

NEW PROCESS STEP:
  <step n="1.5" name="Changelog from Git">Generate changelog entries from git log 
  and diff analysis — do not require manual changelog writing. Parse commit messages 
  (conventional commit format) to auto-classify: feat/fix/refactor/docs. Include 
  breaking change markers.</step>

ENHANCEMENT TO EXISTING PROCESS:
  Add: "For API documentation: extract docs from type definitions and interface 
  signatures rather than requiring manual JSDoc/docstring writing. Types ARE the 
  documentation for shape and contracts."

NEW CONSTRAINT:
  <constraint name="Handoff as Memory">Format handoff documents as memory-compatible 
  files: include frontmatter with name, description, and type fields. This enables 
  the next session to bootstrap instantly from the handoff without re-reading all 
  source files.</constraint>
```

### Stage 12: Cleanup & Confirmation

**Enhancement to build-cleaner.md:**

```
NEW PROCESS STEP:
  <step n="1.5" name="Sensitive Data Scan">Before cleanup, scan worktree for 
  accidentally committed secrets: .env files with values, API keys in source, 
  credentials in config, private keys, tokens. Use pattern matching for common 
  secret formats (AWS keys, JWT tokens, connection strings). Any finding is 
  BLOCKING — cannot proceed until removed.</step>

ENHANCEMENT TO EXISTING CLEANUP:
  Add: "Intelligent artifact detection beyond fixed patterns: check for orphaned 
  generated files (build outputs in source directories), large binary files 
  accidentally tracked, node_modules or target/ in unexpected locations, 
  duplicate files, empty directories."

NEW PROCESS STEP:
  <step n="5.5" name="End-of-Session State">Update workflow-tracking.json with 
  final status. Record what was completed and what (if anything) remains. Format 
  as an 'end-of-session update' suitable for the next session to bootstrap from.</step>
```

### Stage 13: Commit and Merge

**Enhancement to team-lead.md (Stage 13 section):**

```
ENHANCEMENT TO COMMIT PROCESS:
  Add: "Use conventional commit format: type(scope): description. Include: 
  - Summary from specification executive summary
  - Test plan reference (link to BDD scenarios)  
  - Breaking change markers if applicable
  - Issue/requirement traceability (AC-IDs addressed)
  
  Auto-generate PR description from specification document when pushing 
  (summary, test plan, requirements addressed)."

ENHANCEMENT TO PRE-MERGE:
  Add: "Run CI-equivalent checks locally before merge: build, test, lint, 
  type-check. All must pass. Use existing gate-build mechanism for final 
  verification."
```

---

## 7. Template Changes

### 7.1 research-report-template.md — New Sections

Add these sections AFTER the existing "Implementation Considerations" section and BEFORE "Contradictions Found":

```xml
<section title="Community Discoveries">
  <paragraph>Insights from developer communities, forums, and social platforms 
  (AC-05). Sources must meet quality thresholds (NFR-03).</paragraph>
  
  <subsection title="Community Pulse (AC-28)">
    <paragraph>What developers are actively discussing, pain points reported, 
    and novel solutions gaining traction related to this research topic:</paragraph>
    <list type="unordered">
      <item>[Active discussion topic — source, date, engagement metrics]</item>
    </list>
  </subsection>
  
  <table>
    <row header="true">
      <cell>ID</cell>
      <cell>Insight</cell>
      <cell>Source</cell>
      <cell>Date</cell>
      <cell>Momentum</cell>
      <cell>Consensus?</cell>
    </row>
    <row>
      <cell>COM-001</cell>
      <cell>[key insight extracted]</cell>
      <cell>[source + URL]</cell>
      <cell>[date]</cell>
      <cell>[score 0-1]</cell>
      <cell>[Yes (3+ sources)/No]</cell>
    </row>
  </table>
  
  <rule>Momentum scoring: engagement (0.4) × recency (0.35) × authority (0.25). 
  Emerging Consensus: flagged when 3+ independent sources converge on same 
  recommendation within 6 months (AC-27).</rule>
</section>

<section title="New Technologies and Approaches">
  <paragraph>Technologies or patterns less than 12 months old relevant to this 
  requirement (AC-03). Includes cross-domain innovations (AC-04).</paragraph>
  
  <table>
    <row header="true">
      <cell>Technology</cell>
      <cell>First Release</cell>
      <cell>Maturity</cell>
      <cell>Innovation Potential</cell>
      <cell>Relevance</cell>
      <cell>Source</cell>
    </row>
    <row>
      <cell>[name]</cell>
      <cell>[date]</cell>
      <cell>[Early/Growing/Established]</cell>
      <cell>[score 0-1]</cell>
      <cell>[why relevant to this requirement]</cell>
      <cell>SRC-NNN</cell>
    </row>
  </table>
  
  <rule>Innovation potential: community_momentum (0.3) + problem_fit (0.3) + 
  adoption_ease (0.2) + maturity_trajectory (0.2). Only include if 
  innovation_potential > 0.4.</rule>
</section>

<section title="AI Workflow Patterns">
  <paragraph>Patterns from AI company documentation applicable to this 
  implementation (AC-11). Covers prompt engineering, agent orchestration, 
  tool use, and context management.</paragraph>
  
  <table>
    <row header="true">
      <cell>Pattern</cell>
      <cell>Category</cell>
      <cell>Source</cell>
      <cell>Applicability</cell>
    </row>
    <row>
      <cell>[pattern name]</cell>
      <cell>[Prompt Engineering/Agent Coordination/Tool Use/Context Management]</cell>
      <cell>[AI company + URL]</cell>
      <cell>[how it applies to this requirement]</cell>
    </row>
  </table>
</section>

<section title="Internal Improvement Suggestions">
  <paragraph>Discoveries that could improve the super-dev plugin workflow itself 
  (AC-29). Flagged for post-workflow review by team-lead (AC-30).</paragraph>
  
  <list type="unordered">
    <item name="IMP-001">[technique] — Stage [N] improvement — Impact: [High/Medium/Low] — [1-2 sentence implementation sketch]</item>
  </list>
  
  <paragraph>[If none: "No internal improvement opportunities identified."]</paragraph>
</section>
```

### 7.2 Options Comparison Enhancement

Add "Innovation/Momentum" row to the existing comparison matrix:

```xml
<!-- Add after existing "Project Fit" row -->
<row><cell>Innovation/Momentum</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell><cell>[score 1-5]</cell></row>
```

### 7.3 Gate Compliance Notes Update

Add to the existing Gate Compliance Notes:

```
9. Community Discovery IDs MUST use format: `COM-NNN`
10. Internal Improvement IDs MUST use format: `IMP-NNN`
11. Momentum scores MUST be numeric (0.0-1.0)
12. Innovation Potential scores MUST be numeric (0.0-1.0)
13. Emerging Consensus flag MUST be "Yes (N sources)" or "No"
14. New sections (Community Discoveries, New Technologies, AI Workflow Patterns, 
    Internal Improvement Suggestions) are OPTIONAL — include only when research 
    yields relevant findings. Empty sections should be omitted entirely.
```

### 7.4 research-methodology.md — New Processes

Add after existing processes:

```xml
<process name="Community Source Discovery">
  Search developer communities with site-filtered Firecrawl queries. Apply quality 
  thresholds: Reddit 10+ upvotes, GitHub Issues 5+ reactions, HN 10+ points. 
  Score with momentum metric. Flag emerging consensus (3+ independent sources 
  within 6 months converging on same recommendation). Sources > 18 months require 
  cross-reference with newer source (NFR-02).
</process>

<process name="AI Documentation Traversal">
  Systematically search AI company documentation for applicable patterns. Target: 
  Anthropic (prompt engineering, agent orchestration, context management), OpenAI 
  (function calling, structured output, agent patterns), Google (agent frameworks, 
  grounding). Also check LangChain, CrewAI, DSPy, Instructor for orchestration 
  patterns. Record: pattern name, source URL, applicability to current requirement.
</process>

<process name="Innovation Discovery">
  Search for technologies less than 12 months old relevant to the requirement. 
  Include cross-domain search (adjacent ecosystem innovations). Filter: active 
  development (commits within 3 months), community traction (GitHub stars > 100 
  OR package weekly downloads > 1000). Score innovation potential and include 
  only if score > 0.4.
</process>

<process name="Momentum Scoring">
  Composite metric for community source quality:
  momentum = engagement_normalized (0.4) + recency_score (0.35) + authority (0.25)
  
  Engagement: scaled 0-1 within source type (upvotes/reactions)
  Recency: < 3mo = 1.0, 3-6mo = 0.8, 6-12mo = 0.5, 12-18mo = 0.3, > 18mo = 0.0
  Authority: verified_maintainer = 1.0, recognized_expert = 0.9, 
             active_contributor = 0.7, general_user = 0.5
</process>
```

---

## 8. Codex Parity Strategy

### 8.1 Translation Approach

All `.codex/agents/*.toml` files are TOML-format mirrors of `agents/*.md`. The translation follows established patterns:

| Markdown Element | TOML Equivalent |
|------------------|-----------------|
| `<principle name="X">Y</principle>` | `[[principles]]` table with `name` and `description` |
| `<step n="N" name="X">Y</step>` | `[[process.steps]]` with `number`, `name`, `description` |
| `<constraint name="X">Y</constraint>` | `[[constraints]]` with `name` and `rule` |
| `<gotcha>X</gotcha>` | `[[gotchas]]` with `description` |

### 8.2 Execution Order

Codex mirrors are updated AFTER all `.md` changes are finalized (Phase 5 in the dependency map). This prevents double-work if `.md` content is revised during implementation.

### 8.3 Parity Verification

After all `.codex` updates, verify parity by comparing key counts:
- Number of principles matches
- Number of process steps matches
- Number of constraints matches
- New sections/modes are represented

This is a manual verification step (not automated) as TOML format differences make exact diff comparison impractical.

---

## 9. Migration Path

### Phase 1: Foundation (Must be done first — others depend on this)

```
Order: research-report-template.md → research-methodology.md → search-agent.md
Reason: research-agent references template sections by name, and uses search-agent modes
Can be done in: Single implementation phase
Dependencies: None
```

### Phase 2: Core Stage 3 Enhancement (After Phase 1)

```
Order: research-agent.md → research-deep-dive-loop.md → team-lead.md (Stage 3 notes)
Reason: research-agent uses new template sections and search modes from Phase 1
Can be done in: Single implementation phase
Dependencies: Phase 1 complete
```

### Phase 3: Stage 2 + 4 + 5 Agents (Independent of each other, after Phase 2)

```
Parallelizable:
  - requirements-clarifier.md (independent)
  - bdd-scenario-writer.md (independent)
  - debug-analyzer.md (independent)
  - code-assessor.md (independent)
Dependencies: Phase 2 complete (for team-lead context), but agents themselves are independent
```

### Phase 4: Stage 6 + 7 + 8 Agents (After Phase 3 for code-assessor patterns)

```
Order: architecture-designer.md → spec-writer.md → spec-reviewer.md
Reason: spec-writer references architecture-designer's DAG format
Can be done in: Single phase (serial within phase)
Dependencies: Phase 3 complete
```

### Phase 5: Stage 9 + 10 Agents (Independent of each other)

```
Parallelizable:
  - tdd-guide.md (independent)
  - qa-agent.md (independent)
  - code-reviewer.md (independent)
  - adversarial-reviewer.md (independent)
Dependencies: Phase 4 complete
```

### Phase 6: Stage 11 + 12 + 13 (After Phase 5)

```
Order: docs-executor.md → build-cleaner.md → team-lead.md (Stage 13 notes)
Can be done in: Single implementation phase
Dependencies: Phase 5 complete
```

### Phase 7: Codex Parity + Skills (After ALL agent .md changes)

```
Order: All .codex/agents/*.toml mirrors → skills/super-dev/SKILL.md
Reason: TOML mirrors must reflect final .md content
Can be done in: Single implementation phase (mechanical translation)
Dependencies: Phases 1-6 complete
```

### Summary

```
Phase 1 ──→ Phase 2 ──→ Phase 3 (parallel agents) ──→ Phase 4 ──→ Phase 5 (parallel) ──→ Phase 6 ──→ Phase 7
   3 files      3 files        4 files                   3 files       4 files              3 files      ~21 files
```

Total: 7 sequential phases, ~41 files modified.

---

## 10. Evaluation Matrix

### Approach A: Additive Enhancement (SELECTED)

Add new steps/sections/modes to existing agents. No structural changes.

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Risk | 5 | Additive-only changes cannot break existing behavior |
| Effort | 4 | Well-bounded modifications, no new mechanisms |
| Backward Compat | 5 | NFR-04 compliant — new sections are optional/additive |
| Consistency | 4 | Same XML structure pattern across all agents |
| Testability | 4 | Each phase independently verifiable via gates |
| Reversibility | 5 | Any addition can be removed without cascade |

### Approach B: Agent Restructure with Shared Base

Create a shared base template with common enhancements, inherit per-agent.

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Risk | 2 | Shared base creates coupling — change affects all |
| Effort | 3 | High upfront cost for abstraction infrastructure |
| Backward Compat | 3 | Structural change may break gate parsing |
| Consistency | 5 | Guaranteed consistency via inheritance |
| Testability | 3 | Shared base harder to test in isolation |
| Reversibility | 2 | Entangled — can't remove one agent's enhancement |

### Approach C: Configuration-Driven Enhancement

Move enhancements to external config files that agents load at runtime.

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Risk | 3 | Config parsing adds failure modes |
| Effort | 2 | New mechanism (config loader) required |
| Backward Compat | 4 | Old agents work without config |
| Consistency | 3 | Config drift between agents possible |
| Testability | 3 | Config + agent interaction harder to verify |
| Reversibility | 4 | Delete config to revert |

### Decision: Approach A

Additive enhancement wins on risk, effort, backward compatibility, and reversibility. The consistency trade-off (4 vs 5) is acceptable given the well-defined Enhancement Pattern (Section 2) that enforces structural uniformity across all modifications. Approach B's shared base introduces coupling inappropriate for a system where each agent has distinct behavior. Approach C adds unnecessary indirection for what are fundamentally prompt content changes.

---

## Appendix: File Change Summary

| File | Change Type | Lines Added (est.) | Phase |
|------|-------------|-------------------|-------|
| reference/research-report-template.md | New sections | ~80-100 | 1 |
| reference/research-methodology.md | New processes | ~50-70 | 1 |
| agents/search-agent.md | New modes, scoring | ~40-50 | 1 |
| agents/research-agent.md | New steps | ~60-80 | 2 |
| reference/workflow/research-deep-dive-loop.md | Competing hypotheses note | ~10 | 2 |
| agents/team-lead.md | Stage notes, effort guidance | ~20-30 | 2 |
| agents/requirements-clarifier.md | New principle, step, enhancement | ~10-15 | 3 |
| agents/bdd-scenario-writer.md | New step, constraint | ~15-20 | 3 |
| agents/debug-analyzer.md | New principle, steps, enhancements | ~20-25 | 3 |
| agents/code-assessor.md | New principle, steps, enhancements | ~25-30 | 3 |
| agents/architecture-designer.md | New principle, constraint, enhancements | ~15-20 | 4 |
| agents/spec-writer.md | Enhancements, constraint | ~15-20 | 4 |
| agents/spec-reviewer.md | New step, enhancements | ~10 | 4 |
| agents/tdd-guide.md | New constraint, principle, enhancement | ~10-15 | 5 |
| agents/qa-agent.md | New step, constraint, enhancement | ~10-15 | 5 |
| agents/code-reviewer.md | New principle, constraint, enhancements | ~15 | 5 |
| agents/adversarial-reviewer.md | New principle, enhancements, constraint | ~10-15 | 5 |
| agents/docs-executor.md | New principle, step, constraint | ~15-20 | 6 |
| agents/build-cleaner.md | New steps, enhancement | ~10-15 | 6 |
| .codex/agents/*.toml (20 files) | Mirror translations | ~280-350 | 7 |
| skills/super-dev/SKILL.md | Stage description updates | ~10-20 | 7 |
| **TOTAL** | | **~735-930** | |
