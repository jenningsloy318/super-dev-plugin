# BDD Scenarios: Enhance Research Stage and Upgrade All Stages

## REQ-01: Research Stage Enhancement

### SCENARIO-001: Research agent discovers industry best practices
**Traces: AC-01**

```gherkin
Given a research task for implementing a new feature
When the research agent performs its search
Then the research report MUST contain a section on industry best practices
And the report MUST include approaches beyond existing code patterns
And each best practice MUST include a source URL and publication date
```

### SCENARIO-002: Research agent searches community sources
**Traces: AC-02**

```gherkin
Given a research task is initiated
When the research agent performs community search passes
Then it MUST search Reddit developer subreddits relevant to the stack
And it MUST search X/Twitter developer threads from recognized experts
And it MUST search GitHub Discussions and Issues on relevant repositories
And it MUST search HackerNews for substantive technical discussion
And each source MUST be attributed with URL and retrieval date
```

### SCENARIO-003: Research report includes new technologies section
**Traces: AC-03**

```gherkin
Given a research agent produces a research report
When the report is written
Then it MUST include a "New Technologies & Approaches" section
And each technology listed MUST be less than 12 months old
And each entry MUST explain how it could solve the requirement more effectively
And each entry MUST include maturity assessment and adoption risk
```

### SCENARIO-004: Research agent searches cross-domain patterns
**Traces: AC-04**

```gherkin
Given a research task for a specific technology stack
When the research agent searches for solutions
Then it MUST search beyond the immediate technology stack
And it MUST identify cross-domain patterns from adjacent ecosystems
And it MUST include unconventional approaches that apply to the problem
And cross-domain findings MUST be clearly labeled with their origin domain
```

### SCENARIO-005: Research report includes community discoveries section
**Traces: AC-05**

```gherkin
Given a research report is being generated
When the report template is rendered
Then it MUST include a "Community Discoveries" section
And each discovery MUST include a source link
And each discovery MUST include a recency score (days since publication)
And discoveries MUST be sorted by relevance then recency
```

### SCENARIO-006: Innovation potential weighting in research scoring
**Traces: AC-06**

```gherkin
Given the research agent scores multiple solution options
When comparing a newer approach with strong community momentum against an older stable option
Then the scoring algorithm MUST weight "innovation potential" alongside maturity
And a newer approach MUST NOT be automatically dismissed solely due to lower maturity
And the scoring MUST include a "momentum" dimension measuring community adoption velocity
```

---

## REQ-02: AI Company Documentation Traversal

### SCENARIO-007: Search Anthropic documentation
**Traces: AC-07**

```gherkin
Given a research task related to AI agent workflows or prompt engineering
When the research agent performs AI documentation searches
Then it MUST search docs.anthropic.com for relevant guidance
And it MUST search anthropic.com/engineering for engineering blog posts
And it MUST search anthropic.com/research for research papers
And findings MUST cover: prompt engineering, agent orchestration, tool use patterns, context window management
```

### SCENARIO-008: Search OpenAI documentation
**Traces: AC-08**

```gherkin
Given a research task related to AI agent design patterns
When the research agent performs AI documentation searches
Then it MUST search platform.openai.com for API and design pattern guidance
And it MUST search openai.com/blog for relevant blog posts
And it MUST search cookbook.openai.com for practical implementation patterns
And findings MUST cover: agent design, function calling, structured output, reasoning model usage
```

### SCENARIO-009: Search Google AI documentation
**Traces: AC-09**

```gherkin
Given a research task related to AI frameworks or grounding
When the research agent performs AI documentation searches
Then it MUST search ai.google.dev for developer guidance
And it MUST search cloud.google.com/vertex-ai for enterprise patterns
And it MUST search deepmind.google/research for research insights
And findings MUST cover: agent frameworks, grounding techniques, multi-modal integration
```

### SCENARIO-010: Search AI tooling documentation
**Traces: AC-10**

```gherkin
Given a research task related to agent orchestration
When the research agent performs supplementary AI tool searches
Then it MUST search LangChain and LangGraph documentation
And it MUST search CrewAI documentation for multi-agent patterns
And it MUST search AutoGen documentation for agent coordination
And it MUST search DSPy and Instructor documentation for structured generation
And patterns found MUST be assessed for applicability to the plugin workflow
```

### SCENARIO-011: AI Workflow Patterns section in research report
**Traces: AC-11**

```gherkin
Given a research report is being generated
When AI company documentation has been traversed
Then the report MUST include an "AI Workflow Patterns" section
And this section MUST document prompt engineering discoveries
And this section MUST document agent coordination patterns
And this section MUST document tool-use optimizations
And this section MUST document context management strategies
And each pattern MUST include source attribution and applicability assessment
```

---

## REQ-03: All-Stage Best Practice Upgrade

### SCENARIO-012: Stage 1 enhancement
**Traces: AC-12**

```gherkin
Given Stage 1 (Specification Setup) is executed
When project context is gathered
Then stack detection MUST use improved heuristics beyond file extension scanning
And worktree initialization MUST be optimized based on detected project type
And project metadata MUST be captured for downstream agent context injection
```

### SCENARIO-013: Stage 2 enhancement
**Traces: AC-13**

```gherkin
Given Stage 2 (Requirements + BDD) agents are spawned
When requirements-clarifier generates acceptance criteria
Then it MUST use structured prompting for ambiguity detection
And it MUST flag potentially incomplete or contradictory requirements
When bdd-scenario-writer generates scenarios
Then it MUST apply BDD quality scoring to self-assess scenario coverage
And it MUST detect missing edge case scenarios
```

### SCENARIO-014: Stage 4 enhancement
**Traces: AC-15**

```gherkin
Given Stage 4 (Debug Analysis) is activated for a bug
When the debug-analyzer investigates
Then it MUST use chain-of-thought debugging methodology
And it MUST generate a hypothesis tree with confidence scores
And it MUST synthesize automated reproduction steps
And it MUST apply root-cause isolation patterns before suggesting fixes
```

### SCENARIO-015: Stage 5 enhancement
**Traces: AC-16**

```gherkin
Given Stage 5 (Code Assessment) is executed
When the code-assessor analyzes the codebase
Then it MUST detect architecture smells using established smell catalogs
And it MUST score dependency health using community signals (stars, maintenance status, CVEs)
And it MUST quantify technical debt with severity and estimated effort
```

### SCENARIO-016: Stage 6 enhancement
**Traces: AC-17**

```gherkin
Given Stage 6 (Design) produces an architecture
When the architecture-designer creates the design
Then it MUST consider AI-aware architecture patterns
And it MUST include prompt caching considerations where applicable
And it MUST plan for token budget efficiency
And it MUST optimize for parallel agent execution where possible
```

### SCENARIO-017: Stage 7 enhancement
**Traces: AC-18**

```gherkin
Given Stage 7 (Specification Writing) is executed
When the spec-writer produces documents
Then specifications MUST use structured formats optimized for AI consumption
And implementation plan granularity MUST be tuned based on task complexity
And task decomposition MUST follow agent-friendly patterns (clear inputs/outputs per task)
```

### SCENARIO-018: Stage 8 enhancement
**Traces: AC-19**

```gherkin
Given Stage 8 (Specification Review) is executed
When the spec-reviewer analyzes the specification
Then it MUST apply automated completeness checking against all BDD scenarios
And it MUST verify cross-references between spec, requirements, and BDD
And it MUST calculate and report a grounding score
```

### SCENARIO-019: Stage 9 enhancement
**Traces: AC-20**

```gherkin
Given Stage 9 (Implementation) TDD workflow is active
When domain specialists implement code
Then they MUST use latest AI pair-programming patterns
And implementation MUST be incremental to maximize test-driven feedback loops
And code generation MUST pass quality gates before proceeding to next task
```

### SCENARIO-020: Stage 10 enhancement
**Traces: AC-21**

```gherkin
Given Stage 10 (Code Review) agents are active
When code-reviewer and adversarial-reviewer analyze code
Then they MUST apply latest automated code review patterns from AI research
And security vulnerability detection MUST use updated vulnerability databases
And review dimension scoring MUST be calibrated against industry benchmarks
```

### SCENARIO-021: Stage 11 enhancement
**Traces: AC-22**

```gherkin
Given Stage 11 (Documentation) is executed
When docs-executor generates documentation
Then documentation MUST be structured for both human and agent consumption
And changelog entries MUST be automated from commit history analysis
And API documentation MUST follow latest best practices for AI-assisted codebases
```

### SCENARIO-022: Stage 12 enhancement
**Traces: AC-23**

```gherkin
Given Stage 12 (Cleanup & Confirmation) is executed
When build-cleaner runs cleanup
Then it MUST use intelligent artifact detection based on project type
And cleanup patterns MUST be project-type-specific (not generic rm commands)
And it MUST verify no sensitive data (secrets, credentials) remains in the worktree
```

### SCENARIO-023: Stage 13 enhancement
**Traces: AC-24**

```gherkin
Given Stage 13 (Commit and Merge) is executed
When commit workflow runs
Then commit messages MUST use semantic generation with context from all prior stages
And PR descriptions MUST be auto-generated from specification and implementation summaries
And merge conflict prevention MUST be applied (rebase check before merge)
```

---

## REQ-04: Community Discovery Integration

### SCENARIO-024: Dedicated social/community search modes
**Traces: AC-25**

```gherkin
Given the search agent receives a community search request
When it executes search passes
Then it MUST use site-filtered searches for Reddit (site:reddit.com)
And it MUST use social mode searches for X/Twitter content
And it MUST search GitHub Discussions (site:github.com/*/discussions)
And it MUST search HackerNews (site:news.ycombinator.com)
And it MUST search Dev.to (site:dev.to)
And it MUST search Stack Overflow for trending topics in the relevant domain
```

### SCENARIO-025: Community signal momentum scoring
**Traces: AC-26**

```gherkin
Given community sources are retrieved
When signals are scored
Then each signal MUST receive a "momentum" metric
And momentum MUST factor: engagement count (upvotes/stars/reactions)
And momentum MUST factor: recency (days since publication)
And momentum MUST factor: author authority (maintainer, expert, core team)
And signals MUST be ranked by composite momentum score
```

### SCENARIO-026: Emerging consensus detection
**Traces: AC-27**

```gherkin
Given multiple community sources have been retrieved for a topic
When the research agent analyzes signals
Then it MUST detect "emerging consensus" patterns
And emerging consensus MUST require 3+ independent sources converging
And convergent sources MUST be within the last 6 months
And detected consensus MUST be flagged prominently in the report
```

### SCENARIO-027: Community Pulse subsection
**Traces: AC-28**

```gherkin
Given a research report is being generated with community data
When the Community Pulse section is written
Then it MUST summarize what developers are actively discussing
And it MUST list pain points being reported by the community
And it MUST highlight novel solutions gaining traction
And all items MUST be relevant to the current research topic
And each item MUST include source attribution
```

---

## REQ-05: Continuous Improvement Feedback Loop

### SCENARIO-028: Internal improvement detection
**Traces: AC-29**

```gherkin
Given the research agent discovers a technique during research
When the technique would improve the super-dev workflow itself (not the user's project)
Then the research report MUST include an "Internal Improvement Suggestions" section
And each suggestion MUST explain what workflow aspect it improves
And each suggestion MUST include the source discovery
And each suggestion MUST include estimated impact (high/medium/low)
```

### SCENARIO-029: Team-lead presents improvement suggestions
**Traces: AC-30**

```gherkin
Given a workflow has completed all stages successfully
And the research report contains "Internal Improvement Suggestions"
When the team-lead agent performs final summary
Then it MUST present internal improvement suggestions to the user
And it MUST categorize suggestions by affected stage
And the user MUST be able to accept or dismiss each suggestion
```

---

## Edge Cases

### SCENARIO-030: Community sources unreachable
**Traces: AC-01, AC-02, NFR-07**

```gherkin
Given a research task is initiated
When community sources (Reddit, X, GitHub Discussions) are unreachable or return errors
Then the research agent MUST proceed with available sources
And the report MUST note unreachable sources in a "Limitations" section
And the workflow MUST NOT be blocked by unavailable community sources
```

### SCENARIO-031: No new technologies found
**Traces: AC-03, AC-06**

```gherkin
Given a research task for a mature, stable domain
When no technologies less than 12 months old are found
Then the "New Technologies & Approaches" section MUST state "No emerging alternatives identified"
And the report MUST still include current best practices with their maturity assessment
And the scoring MUST proceed with available options only
```

### SCENARIO-032: AI documentation sites outdated or moved
**Traces: AC-07, AC-08, AC-09, NFR-07**

```gherkin
Given the research agent searches AI company documentation
When documentation URLs return 404 or redirect to different content
Then the agent MUST attempt alternate known documentation paths
And it MUST note gaps in AI documentation coverage in the report
And it MUST NOT fabricate or hallucinate documentation content
```

### SCENARIO-033: Search latency exceeds threshold
**Traces: NFR-01**

```gherkin
Given Stage 3 research is executing with all enhanced search passes
When total research duration approaches 150% of baseline duration
Then parallel search execution MUST be enforced for remaining searches
And low-priority searches MUST be cancelled if timeout is imminent
And the report MUST note any searches that were time-limited
```

### SCENARIO-034: Source freshness enforcement
**Traces: NFR-02**

```gherkin
Given community or AI documentation sources are retrieved
When a source publication date exceeds 18 months
Then it MUST NOT be cited without cross-referencing a newer source
And if no newer corroborating source exists, the finding MUST be marked "unverified - stale source"
And the recency score MUST reflect the staleness in the report
```

### SCENARIO-035: Platform parity verification
**Traces: NFR-05**

```gherkin
Given modifications are made to Claude Code agents (agents/*.md)
When the implementation is complete
Then equivalent updates MUST exist in Codex CLI agents (.codex/agents/*.toml)
And a parity check MUST verify both platforms have matching capabilities
And any platform-specific differences MUST be documented
```
