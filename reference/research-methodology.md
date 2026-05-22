<meta>
  <name>research-methodology</name>
  <type>template</type>
  <description>Comprehensive research methodology for software development including multi-source search, version awareness, option presentation, and synthesis techniques</description>
</meta>

<purpose>Reference for systematic research before software implementation during Stage 3 (Research) of the super-dev workflow. Covers search tools, version awareness, option presentation format, and research output structure.</purpose>

<principles>
  <principle name="Multi-Source Research">Search across code, documentation, academic papers, and community resources for comprehensive understanding</principle>
  <principle name="Pattern Extraction">Identify established patterns and anti-patterns from multiple sources</principle>
  <principle name="Version Awareness">Always research for the latest stable versions; avoid outdated information</principle>
  <principle name="Synthesis">Compile findings into actionable recommendations with clear options and trade-offs</principle>
</principles>

<process>
  <step n="1" name="Establish Context">Get current timestamp via Time MCP for year context. Note the technology stack from requirements. Identify key topics needing research. Plan search queries WITH year context for recency.</step>
  <step n="2" name="Research Areas">Cover systematically: Best Practices and Design Patterns (established patterns, anti-patterns, recommended architectures, industry standards), Official Documentation (API references, framework docs, language guidelines, configuration options), Community Knowledge (blog posts, Stack Overflow, GitHub issues, conference talks), Performance and Edge Cases (benchmarks, known limitations, edge cases, security considerations).</step>
  <step n="3" name="Execute Searches">Step 3a — Firecrawl MCP (MANDATORY first): Run `firecrawl_search` then scrape top results and extract patterns. Step 3b — Structured tools (supplementary): Use search-agent with modes: `code` (implementation patterns), `docs` (official documentation), `academic` (research papers), `web` (blog posts, tutorials), `all` (comprehensive).</step>
  <step n="4" name="Version Awareness">Check current year. Look for latest stable versions. Note breaking changes in recent versions. Avoid outdated patterns/APIs. Verify deprecation status. Apply recency scoring: less than 6 months (+2 Fresh), 6-12 months (+1 Current), 1-2 years (0 Dated), over 2 years (-1 Potentially Outdated). Flag sources mentioning "deprecated", "legacy", "old version", "no longer recommended", "superseded by".</step>
  <step n="5" name="Synthesize Findings">Compile all findings into structured recommendations. Prioritize by relevance and authority. Cross-reference multiple sources. Identify consensus patterns. Note disagreements or alternatives.</step>
</process>

<tools name="Search Tools">
  Firecrawl MCP (MANDATORY — run first): Run before any other search. No source limits. Use `firecrawl_search` for discovery, `firecrawl_scrape` for content extraction, `firecrawl_extract` for structured data.

  Exa (Web and Code Search — Supplementary): Use `mcp__exa__web_search_exa` for web search, use with type "code" for code context search.

  DeepWiki (GitHub Repo Documentation): Get repo docs structure via `mcp__deepwiki__read_wiki_structure`, contents via `mcp__deepwiki__read_wiki_contents`, ask questions via `mcp__deepwiki__ask_question`.

  Context7 (Library Documentation): Resolve library ID via `mcp__context7__resolve-library-id`, get docs via `mcp__context7__query-docs`.

  GitHub (Code and Repo Search): Search code via `mcp__github__search_code`, search repos via `mcp__github__search_repositories`, get file contents via `mcp__github__get_file_contents`.
</tools>

<process name="Time MCP Integration">
  Before ANY research, get current timestamp via `mcp__time-mcp__current_time`. Enhance all queries with year context (e.g., "React hooks best practices 2025"). Apply recency scoring to all sources.
</process>

<process name="Option Presentation">
  CRITICAL: Always present 3-5 options with detailed comparisons for decision points.

  Always present options for: Technology/library selection, framework choices, architecture patterns, implementation approaches, design decisions, tool selection, API/client library choices.

  Single answer only when: Looking up specific API documentation, finding exact configuration values, retrieving specific error messages, user explicitly requests single answer.

  Each option must include: description (1-2 sentences), strengths with source citations, weaknesses with source citations, best-for use cases, and source links. Include a comparison matrix scoring Learning Curve, Community Size, Performance, Maturity, Documentation Quality, and Maintenance Activity. End with a recommendation, rationale, trade-offs, and alternative suggestion.
</process>

<process name="Community Source Discovery">
  Site-filtered searches targeting developer community platforms for real-world experience reports, pain points, and emerging patterns.

  Search targets:
  - Reddit: `site:reddit.com/r/programming OR r/ExperiencedDevs OR r/{stack-subreddit} {topic} {year}`
  - HackerNews: `site:news.ycombinator.com {topic} {year}`
  - GitHub Discussions: `site:github.com/*/discussions {topic}`
  - Dev.to: `site:dev.to {topic} {year}`
  - X/Twitter: Exa social mode with expert filters for `{topic}`
  - Stack Overflow: `site:stackoverflow.com [tag:{tech}] {topic}`

  Quality thresholds (minimum engagement to include):
  - Reddit: 10+ upvotes
  - GitHub Issues/Discussions: 5+ reactions
  - HackerNews: 10+ points
  - Stack Overflow: accepted answer OR 5+ upvotes
  - Content length: 100+ words (filters low-effort posts)
  - No duplicates, no spam, no self-promotion without substance

  Momentum scoring (applied to each community finding):
  Formula: momentum = (engagement_normalized × 0.4) + (recency_score × 0.35) + (authority × 0.25)
  - engagement_normalized: scaled 0-1 within source type (e.g., Reddit upvotes relative to subreddit median)
  - recency_score: less than 3mo = 1.0, 3-6mo = 0.8, 6-12mo = 0.5, 12-18mo = 0.3, over 18mo = 0.0
  - authority: verified_maintainer = 1.0, recognized_expert = 0.9, active_contributor = 0.7, general = 0.5

  Emerging consensus detection:
  When 3+ independent sources converge on the same recommendation within a 6-month window, flag as "Emerging Consensus" with source count and confidence level. Sources must be independent (different authors, different platforms) to count.

  Freshness enforcement (NFR-02): Discard community sources older than 18 months unless they describe fundamental/timeless patterns. Prioritize sources from the last 6 months.
</process>

<process name="AI Documentation Traversal">
  Systematic search of AI company documentation and frameworks for workflow patterns, agent coordination techniques, and tool-use optimizations.

  Provider matrix:
  - Anthropic: docs.anthropic.com, anthropic.com/engineering, anthropic.com/research, code.claude.com/docs
  - OpenAI: platform.openai.com, openai.com/blog, cookbook.openai.com
  - Google: ai.google.dev, cloud.google.com/vertex-ai, deepmind.google/research
  - Frameworks: LangChain/LangGraph docs, CrewAI docs, AutoGen docs, DSPy docs, Instructor docs

  Search topics per provider: prompt engineering, agent orchestration, tool use patterns, context management, multi-agent coordination, structured output, chain-of-thought, function calling, memory/state management.

  Process:
  1. For each provider, search documentation sites with topic + year context
  2. Extract patterns: technique name, category, applicability, implementation notes
  3. Cross-reference patterns across providers for convergence
  4. Assess applicability to current research topic (High/Medium/Low)
  5. Output structured findings to "AI Workflow Patterns" template section

  Categories: Prompt Engineering, Agent Coordination, Tool Use, Context Management.
</process>

<process name="Innovation Discovery">
  Search for technologies and approaches less than 12 months old that may offer superior solutions.

  Search strategies:
  1. Direct: `"{topic} new approach {current_year} {previous_year}"`
  2. Alternatives: `"{current_tech} alternative new {current_year}"`
  3. Cross-domain: `"{problem_type} solution {adjacent_domain}"`
  4. Emerging: `"emerging {topic} technology {current_year}"`

  Filtering criteria:
  - First release within 12 months
  - Active development (commits within 3 months)
  - Community traction (GitHub stars > 100 OR npm/pip downloads > 1000)
  - Not abandoned (no "archived", "unmaintained", or "deprecated" flags)

  Innovation potential scoring:
  Formula: potential = (community_momentum × 0.3) + (problem_fit × 0.3) + (adoption_ease × 0.2) + (maturity_trajectory × 0.2)
  - community_momentum: derived from momentum scoring formula above
  - problem_fit: how well the technology addresses the specific research topic (0-1)
  - adoption_ease: migration cost, learning curve, ecosystem compatibility (0-1)
  - maturity_trajectory: rate of improvement in docs, stability, community growth (0-1)

  Only report technologies with innovation_potential > 0.4 to the "New Technologies and Approaches" template section.
</process>

<process name="Momentum Scoring">
  Unified scoring methodology applied across community findings, technology assessment, and emerging pattern detection.

  Core formula: momentum = (engagement_normalized × 0.4) + (recency_score × 0.35) + (authority × 0.25)

  Engagement normalization (per platform):
  - Reddit: upvotes / subreddit_median_upvotes, capped at 1.0
  - HackerNews: points / 100, capped at 1.0
  - GitHub: (stars + reactions) / category_median, capped at 1.0
  - Stack Overflow: votes / 50, capped at 1.0
  - Dev.to: (reactions + comments) / 100, capped at 1.0

  Recency scoring:
  - Less than 3 months: 1.0
  - 3-6 months: 0.8
  - 6-12 months: 0.5
  - 12-18 months: 0.3
  - Over 18 months: 0.0

  Authority levels:
  - verified_maintainer (repo owner, official team member): 1.0
  - recognized_expert (well-known in field, conference speaker): 0.9
  - active_contributor (regular PRs, consistent posting): 0.7
  - general (standard community member): 0.5

  Threshold definitions:
  - High momentum (>= 0.7): Strong signal, prioritize in recommendations
  - Medium momentum (0.4-0.7): Noteworthy signal, include in findings
  - Low momentum (< 0.4): Weak signal, include only if corroborated by other evidence
</process>

<criteria name="Evaluation Criteria">
  When comparing options, score on: Learning Curve (High weight), Community Size (High), Performance (High), Maturity (High), Documentation Quality (High), Maintenance Activity (High). Scoring rubric: 5 Excellent, 4 Good, 3 Acceptable, 2 Fair, 1 Poor, 0 Unacceptable.
</criteria>

<constraints>
  <constraint>Firecrawl MCP MUST be run first before any other search tool</constraint>
  <constraint>Always include year in search queries for recency</constraint>
  <constraint>Cross-reference multiple sources; never trust single sources</constraint>
  <constraint>Present 3-5 options for all decision points</constraint>
  <constraint>Cite all sources with URLs</constraint>
  <constraint>Flag any deprecated technologies or patterns found</constraint>
  <constraint>Do not use information older than 2 years without verification</constraint>
</constraints>

<anti-patterns>
  <anti-pattern>Skipping Firecrawl MCP and going straight to supplementary tools</anti-pattern>
  <anti-pattern>Limiting source types instead of searching all categories</anti-pattern>
  <anti-pattern>Trusting single sources without cross-referencing</anti-pattern>
  <anti-pattern>Making decisions without presenting option comparisons</anti-pattern>
  <anti-pattern>Assuming blog posts are authoritative without verification</anti-pattern>
</anti-patterns>

<references>
  <ref>Extracted from `super-dev:research-agent`. For full agent behavior during Stage 3, invoke with subagent_type "super-dev:research-agent".</ref>
</references>
