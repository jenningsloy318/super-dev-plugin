# Requirements: Enhance Research Stage and Upgrade All Stages with Best Practices

## Summary

The super-dev plugin's research stage (Stage 3) currently focuses too heavily on codebase exploration and conventional documentation lookup. It must be upgraded to ALWAYS discover the latest industry best practices, emerging technologies, and community-driven insights that can resolve or improve requirements. Beyond research alone, ALL stages (1-13) must be audited and enhanced to leverage cutting-edge AI-assisted development practices — including prompt engineering patterns, agent orchestration techniques, and tool-use strategies discovered from AI company documentation (Anthropic, OpenAI, Google) and developer communities (Reddit, X/Twitter, GitHub Discussions).

This enhancement transforms the plugin from a structured-but-static workflow into a continuously-improving system that integrates the latest discoveries in AI-driven software development.

---

## Requirement Areas

### REQ-01: Research Stage Enhancement (Stage 3)

The research agent must go beyond code-level exploration to discover and synthesize industry best practices, new technologies, and community knowledge for every research task.

- **AC-01**: Research agent MUST search for latest industry best practices and emerging technologies relevant to the requirement, not just existing code patterns or library documentation.

- **AC-02**: Research agent MUST include dedicated search passes targeting: (a) community discussions (Reddit r/programming, r/ExperiencedDevs, r/node, r/rust, etc.), (b) X/Twitter developer threads from recognized experts, (c) GitHub Discussions and Issues on relevant repositories, (d) HackerNews threads with substantive technical discussion.

- **AC-03**: Research agent MUST include a "New Technologies & Approaches" section in every research report that identifies technologies or patterns less than 12 months old that could solve the requirement more effectively than established approaches.

- **AC-04**: Research agent MUST search beyond the immediate technology stack — discovering cross-domain patterns, adjacent ecosystem innovations, and unconventional approaches that apply to the problem.

- **AC-05**: Research report template MUST include a new section: "Community Discoveries" listing insights from developer forums, social media, and discussions with source links and recency scores.

- **AC-06**: Research agent MUST weight "innovation potential" alongside maturity when scoring options — a newer approach with strong community momentum should not be automatically dismissed in favor of an older stable option.

---

### REQ-02: AI Company Documentation Traversal

The research stage must systematically traverse and extract guidance from AI companies' documentation and blog posts to improve agent workflow patterns.

- **AC-07**: Research agent MUST search Anthropic's documentation (docs.anthropic.com, anthropic.com/engineering, anthropic.com/research) for latest guidance on: prompt engineering, agent orchestration, tool use patterns, context window management, and multi-agent coordination.

- **AC-08**: Research agent MUST search OpenAI's documentation (platform.openai.com, openai.com/blog, cookbook.openai.com) for: agent design patterns, function calling best practices, structured output techniques, and reasoning model usage.

- **AC-09**: Research agent MUST search Google's documentation (ai.google.dev, cloud.google.com/vertex-ai, deepmind.google/research) for: agent frameworks, grounding techniques, and multi-modal integration patterns.

- **AC-10**: Research agent MUST search additional AI tooling sources: LangChain/LangGraph docs, CrewAI docs, AutoGen docs, DSPy docs, and Instructor library docs for agent orchestration patterns applicable to the plugin workflow.

- **AC-11**: A new "AI Workflow Patterns" section in the research report MUST capture: prompt engineering discoveries, agent coordination patterns, tool-use optimizations, and context management strategies found from AI company sources.

---

### REQ-03: All-Stage Best Practice Upgrade

Every stage (1-13) of the super-dev workflow must be audited and enhanced with the latest best practices for AI-assisted development.

- **AC-12**: Stage 1 (Specification Setup) — MUST incorporate best practices for project context gathering, including automated stack detection improvements and smarter worktree initialization based on project type.

- **AC-13**: Stage 2 (Requirements + BDD) — MUST enhance requirements-clarifier and bdd-scenario-writer agents with latest techniques for AI-driven requirements elicitation: structured prompting for ambiguity detection, automated acceptance criteria generation patterns, and BDD scenario quality scoring.

- **AC-14**: Stage 3 (Research) — Covered by REQ-01 and REQ-02 above.

- **AC-15**: Stage 4 (Debug Analysis) — MUST enhance debug-analyzer with latest AI debugging techniques: chain-of-thought debugging, hypothesis tree generation, automated reproduction step synthesis, and root-cause isolation patterns.

- **AC-16**: Stage 5 (Code Assessment) — MUST enhance code-assessor with: architecture smell detection patterns, dependency health scoring using community signals, and technical debt quantification approaches from recent research.

- **AC-17**: Stage 6 (Design) — MUST enhance architecture-designer/improver with: AI-aware architecture patterns (prompt caching considerations, token budget planning, parallel agent execution optimization), and latest patterns from system design literature and AI engineering blogs.

- **AC-18**: Stage 7 (Specification Writing) — MUST enhance spec-writer with: structured specification formats optimized for AI consumption, implementation plan granularity tuning based on task complexity, and agent-friendly task decomposition patterns.

- **AC-19**: Stage 8 (Specification Review) — MUST enhance spec-reviewer with: automated completeness checking techniques, cross-referencing verification patterns, and grounding score calculation improvements.

- **AC-20**: Stage 9 (Implementation) — MUST enhance TDD workflow and domain specialists with: latest AI pair-programming patterns, incremental implementation strategies that maximize test-driven feedback loops, and code generation quality gates.

- **AC-21**: Stage 10 (Code Review) — MUST enhance code-reviewer and adversarial-reviewer with: latest automated code review patterns from AI research, security vulnerability detection improvements, and review dimension scoring calibration.

- **AC-22**: Stage 11 (Documentation) — MUST enhance docs-executor with: AI-optimized documentation generation (structured for both human and agent consumption), changelog automation, and API documentation best practices.

- **AC-23**: Stage 12 (Cleanup & Confirmation) — MUST enhance build-cleaner with: intelligent artifact detection, project-type-specific cleanup patterns, and verification that no sensitive data remains.

- **AC-24**: Stage 13 (Commit and Merge) — MUST enhance commit workflow with: semantic commit message generation improvements, PR description automation, and merge conflict prevention strategies.

---

### REQ-04: Community Discovery Integration

The plugin must integrate community signal discovery as a first-class research dimension across all applicable stages.

- **AC-25**: Search agent MUST include dedicated social/community search modes targeting: Reddit (site:reddit.com), X/Twitter (via Firecrawl or Exa social mode), GitHub Discussions (site:github.com/*/discussions), HackerNews (site:news.ycombinator.com), Dev.to (site:dev.to), and Stack Overflow trending topics.

- **AC-26**: Community signals MUST be scored with a "momentum" metric: upvotes/engagement + recency + author authority (verified maintainer, recognized expert, core team member).

- **AC-27**: Research agent MUST detect and flag "emerging consensus" — when 3+ independent community sources converge on a recommendation within the last 6 months.

- **AC-28**: A dedicated "Community Pulse" subsection in research reports MUST summarize: what developers are actively discussing, pain points being reported, and novel solutions gaining traction — all relevant to the current research topic.

---

### REQ-05: Continuous Improvement Feedback Loop

The plugin must support a mechanism for discoveries to feed back into improving the plugin's own workflow.

- **AC-29**: When research discovers a technique that would improve the super-dev workflow itself (not just the user's project), it MUST be flagged in an "Internal Improvement Suggestions" section of the research report.

- **AC-30**: The team-lead agent MUST recognize "Internal Improvement Suggestions" and, after the current workflow completes, present them to the user as potential plugin enhancements.

---

## Non-Functional Requirements

**NFR-01: Search Latency** — Additional research passes (community, AI docs) must not increase total Stage 3 duration by more than 50% compared to current baseline. Achieve through parallel search execution.

**NFR-02: Source Freshness** — All community and AI documentation sources must have publication dates within 18 months. Sources older than 18 months require explicit cross-referencing with a newer source to be cited.

**NFR-03: Signal-to-Noise** — Community sources must be filtered for quality: minimum engagement thresholds (e.g., Reddit posts with 10+ upvotes, GitHub issues with 5+ reactions), author verification where possible, and duplicate/low-effort content exclusion.

**NFR-04: Backward Compatibility** — Existing research report consumers (architecture-designer, spec-writer, code-assessor) must continue to parse reports without modification. New sections are additive.

**NFR-05: Platform Parity** — All enhancements to Claude Code agents (`agents/*.md`) MUST have equivalent updates in Codex CLI agents (`.codex/agents/*.toml`).

**NFR-06: Idempotency** — Running the enhanced research stage multiple times on the same requirement must produce consistent recommendations (same options, same rankings within reasonable variance).

**NFR-07: Graceful Degradation** — If community sources or AI documentation sites are unreachable, the workflow must proceed with available sources and note the gap in the report's "Limitations" section.

---

## Scope

### In Scope

- Enhancement of `agents/research-agent.md` with new search dimensions and report sections
- Enhancement of `agents/search-agent.md` with community and AI-doc search modes
- Updates to `reference/research-report-template.md` with new sections
- Updates to `reference/research-methodology.md` with new processes
- Audit and enhancement of ALL stage-specific agents (Stages 1-13) with latest best practices
- Updates to `skills/super-dev/SKILL.md` workflow descriptions where stage behaviors change
- Mirror updates to `.codex/agents/*.toml` for platform parity
- Updates to `reference/workflow/*.md` protocol files where processes change
- New or updated scripts in `scripts/` for community and AI-doc search wrappers

### Out of Scope

- Changing the stage numbering or adding/removing stages
- Modifying gate scripts (`scripts/gates/*.sh`) — only the agents that produce gated documents change
- Creating new agent files (only modifying existing ones)
- Changing the worktree/specification directory structure
- Modifying the plugin's CLI interface or hook system
- Adding new MCP server dependencies (use existing Firecrawl, Exa, GitHub, DeepWiki, Context7)
- Real-time monitoring or telemetry systems
- User-facing UI changes

---

## Dependencies

- **Firecrawl MCP**: Primary search tool — must support site-filtered searches (e.g., `site:reddit.com`, `site:docs.anthropic.com`)
- **Exa MCP**: Supplementary search with social/community mode support
- **Time MCP**: Required for recency scoring of all sources
- **Existing agent infrastructure**: TeamCreate, SendMessage, agent spawn patterns
- **Existing template system**: MiniJinja + `render.sh` for any new template sections

## Assumptions

- Firecrawl MCP can effectively scrape and search AI company documentation sites (docs.anthropic.com, platform.openai.com, ai.google.dev)
- Community platforms (Reddit, HackerNews, GitHub Discussions) are accessible via Firecrawl search with site filters
- The existing research-report-template XML structure supports additive sections without breaking downstream parsers
- Agent prompt modifications stay within reasonable context window limits (adding new sections to agent .md files does not push them past effective prompt length)
- The current deep-research-loop mechanism (max 3 iterations) is sufficient for the expanded research scope
