# Research Report: AI Agent Development Workflow Best Practices (2025-2026)

**Date:** 2026-05-22
**Scope:** Industry best practices for improving the super-dev plugin's 13-stage AI agent development workflow

---

## 1. Executive Summary — Top 5 Most Impactful Findings

1. **Adaptive Thinking with Effort Levels (Anthropic):** Claude Opus 4.7 introduces adaptive thinking (`thinking: {type: "adaptive"}`) with granular effort levels (`low` through `max`). For agentic coding, `xhigh` is recommended. This replaces manual `budget_tokens` and lets the model self-calibrate reasoning depth per step — critical for multi-stage workflows where some steps need deep analysis and others need fast execution.

2. **Agent Teams with Shared Task Lists (Claude Code v2.1.32+):** Anthropic's experimental agent teams enable coordinated multi-session work with shared task lists, direct inter-agent messaging, and self-claiming tasks. This is more powerful than subagents for complex work requiring discussion and collaboration between specialists — directly applicable to the super-dev multi-agent architecture.

3. **Memory Tool for Cross-Session State (Anthropic):** The `memory_20250818` tool enables persistent file-based memory that survives context compaction and session boundaries. Agents check memory before starting, record progress during work, and leave state for the next session. This is the canonical pattern for long-running workflows spanning multiple context windows.

4. **Context Engineering > Prompt Engineering (Industry Consensus):** The field has evolved from crafting prompts to managing entire information states. Key strategies: just-in-time context retrieval (load data on demand, not upfront), structured note-taking (external state files), sub-agent architectures (clean context per specialist), and aggressive compaction to maximize signal-to-noise ratio.

5. **Structured Research with Competing Hypotheses (Anthropic + OpenAI):** For research and debugging stages, spawning multiple agents with competing hypotheses and having them challenge each other's findings produces significantly better outcomes than sequential investigation. This pattern prevents anchoring bias and ensures the surviving theory is more likely correct.

---

## 2. AI Company Guidance

### 2.1 Anthropic (Claude Platform Documentation, May 2026)

**Agentic Loop Architecture:**
- Three phases: Gather Context → Take Action → Verify Results (blended, iterative)
- Claude Code serves as the "agentic harness" providing tools, context management, and execution environment
- The loop adapts to task complexity — simple questions need only context gathering; bug fixes cycle through all phases

**Key Prompting Best Practices for Agents:**
- **Effort parameter is the primary control lever:** Use `xhigh` for coding/agentic, `high` for most intelligence-sensitive work, `medium`/`low` for cost-sensitive or latency-sensitive
- **Opus 4.7 follows instructions more literally:** State scope explicitly rather than relying on inference
- **Parallel tool calling:** Models excel at this — boost to ~100% with explicit instructions about independent vs. dependent calls
- **Subagent spawning:** Opus 4.7 spawns fewer subagents by default but is steerable. Explicitly guide when subagents are desirable
- **Anti-hallucination:** Use `<investigate_before_answering>` tags — never speculate about code not opened
- **Self-verification:** Include tests, screenshots, or expected outputs so agent can check itself — "single highest-leverage thing you can do"

**Extended Thinking:**
- Adaptive thinking (`thinking: {type: "adaptive"}`) is preferred over manual `budget_tokens`
- Interleaved thinking enables reasoning BETWEEN tool calls (Opus 4.7 enables automatically)
- Thinking blocks must be preserved during tool use loops
- `display: "omitted"` reduces latency in streaming applications

**Prompt Caching:**
- Automatic caching recommended for multi-turn conversations
- Cache hierarchy: tools → system → messages
- 5-minute default TTL (free refresh on use), 1-hour optional (2x base cost)
- Cache reads cost 0.1x base input tokens — massive savings for agentic loops
- Pre-warm cache before users arrive to eliminate first-request latency

**Agent Teams:**
- Team lead coordinates, spawns teammates, assigns tasks
- Shared task list with file-locking for race prevention
- Teammates can self-claim pending unblocked tasks
- Quality gates via hooks: `TeammateIdle`, `TaskCreated`, `TaskCompleted`
- Require plan approval before implementation for risky tasks
- 3-5 teammates optimal; 5-6 tasks per teammate keeps everyone productive

**Long-Horizon State Management:**
- Use JSON for structured state (test results, task status)
- Use unstructured text for progress notes
- Use git for state tracking across sessions
- First session: set up framework (tests, scripts); subsequent sessions: iterate on todo-list
- Start fresh context windows rather than compacting when models can discover state from filesystem

**Code Review Guidance (Opus 4.7):**
- Better bug-finding (11pp higher recall on hard evals)
- May under-report if prompted to "only report high-severity" — tell model its job is COVERAGE, not filtering
- Separate finding from ranking: "Report every issue including uncertain ones; downstream filter will rank them"

**Context Window Management:**
- Context fills fast — performance degrades as it fills
- `/clear` between unrelated tasks
- Subagents for investigation (separate context windows)
- Skills load on demand (descriptions only at start)
- After 2 failed corrections: clear and write better initial prompt

### 2.2 OpenAI (Agents SDK Documentation, 2025-2026)

**Three Core Primitives:**
1. **Agents** — LLMs with instructions and tools
2. **Handoffs** — Agent-to-agent delegation for task specialization
3. **Guardrails** — Input/output/tool-level validation

**Two Orchestration Approaches:**
- **LLM-Driven (Agents as Tools):** Manager agent calls specialists via `Agent.as_tool()` — specialist output flows back to manager who owns the final answer
- **Code-Based (Handoffs):** Triage agent routes to specialists who become the active agent and respond directly

**Guardrail Architecture:**
- Input guardrails: validate before consuming model resources
- Output guardrails: validate before reaching users
- Tool guardrails: validate arguments and results at execution time
- Tripwire mechanism: boolean flags that halt execution when safety conditions trigger
- Blocking mode (safe but slow) vs. Parallel mode (fast but may waste tokens)

**Recommendations:**
- "Invest in good prompts. Make it clear what tools are available, how to use them, and what parameters it must operate within"
- Monitor performance, enable agent self-critique
- Create specialized agents rather than generalists
- Implement evaluations for measuring agent quality

### 2.3 Google (Agent Development Kit 2.0, 2025-2026)

**ADK Architecture:**
- Multi-language support: Python, TypeScript, Go, Java, Kotlin
- Agent defined by: name, model, instructions, tools
- Supports Gemini, Claude, Gemma, and other providers

**Orchestration Patterns:**
- Sequential workflows: tasks in defined order
- Parallel workflows: concurrent task execution
- Loop patterns: iterative task processing
- Agent routing: intelligent agent selection based on context
- Graph-based workflows (ADK 2.0): deterministic execution paths with "adaptive AI reasoning + reliable logic"

**Context Management:**
- Automatic filtering and summarization for token efficiency
- Structured token management

**Deployment:** "Deploy anywhere flexibility" — containerization on custom infra or one-command cloud deployment

---

## 3. Agent Framework Patterns

### 3.1 LangGraph / LangChain

**Key Patterns:**
- LangSmith Evaluation: score and improve agent performance
- LangSmith Observability: trace every agent decision
- Human-in-the-loop checks: prevent agents from veering off course
- Real-time streaming: token-by-token showing agent reasoning
- Memory persistence: maintain context across sessions

**Applicability to super-dev:** The observability pattern (tracing every decision) could be applied to Stage 9 (Implementation) and Stage 10 (Code Review) to provide audit trails.

### 3.2 CrewAI

**Role-Based Agent Teams:**
- `@agent` decorator marks methods returning `Agent` objects with distinct responsibilities
- Tasks decomposed into individual units assigned to specific agents
- Each task includes: description, expected output, assigned agent

**Orchestration:**
- Sequential Process (default): linear task execution
- Hierarchical Process: manager agent coordinates, delegates, validates outcomes
- Checkpointing via `CheckpointConfig`: interrupted workflows resume from saved states
- Async patterns: `akickoff()` for high-concurrency scenarios

**Applicability to super-dev:** The hierarchical process with manager validation maps directly to the team-lead → specialist model. CheckpointConfig pattern could improve Stage 9 phase recovery.

### 3.3 OpenAI Agents SDK

**Agents as Tools vs. Handoffs:**
- Agents as Tools: one agent owns final answer, combines specialist outputs
- Handoffs: specialists respond directly, own subsequent interactions

**Code-Orchestrated Techniques:**
- Structured output for task classification
- Sequential agent chaining with output transformation
- Feedback loops with evaluation agents
- Parallel agent execution using `asyncio.gather`

### 3.4 DSPy (Programmatic Prompt Optimization)

**Core Innovation:** Separates interface from implementation through signatures. "Modules help you describe AI behavior as code, not strings."

**Optimization Strategies:**
- `BootstrapRS`: synthesize quality examples for each module
- `GEPA` / `MIPROv2`: propose and explore better natural-language prompts
- `BootstrapFinetune`: create datasets for model fine-tuning
- Results: ReAct agents improved from 24% → 51% accuracy through prompt optimization

**Applicability to super-dev:** The MIPROv2 optimizer could be used to automatically tune agent prompts in each stage based on success metrics. The composable module pattern could replace string-based agent instructions.

---

## 4. Community Discoveries

### 4.1 Agent-Generated PR Review (GitHub Blog, 2025-2026)

- Agent pull requests emerging as standard pattern
- Key challenge: reviewing AI-generated code requires different lens ("where issues hide, how to catch technical debt")
- Multi-agent coordination inside repositories with "inspectable, predictable, and collaborative" design patterns
- Trust layers for non-deterministic correctness validation

### 4.2 AI Shifting to Programmable Execution

- GitHub documents shift from "prompt-response interactions to programmable execution"
- Copilot SDK enables workflows integrated directly into applications
- Token efficiency and graceful degradation as production concerns

### 4.3 Cursor/AI Coding Platforms

- Autonomous cloud agents handling extended tasks
- "Agents merge PRs, manage rollouts, and monitor production"
- Long-horizon agentic work: multi-step development challenges, not isolated tasks
- Organizations report "3x more production code" through AI-assisted development

### 4.4 Martin Fowler / ThoughtWorks

- "Coding assistants do not replace pair programming" — distinct limitations
- "How to tackle unreliability of coding assistants" — robustness patterns
- "Context Engineering for Coding Agents" — context management crucial
- "Assessing internal quality while coding with an agent" — quality metrics

---

## 5. New Technologies & Approaches (Last 12 Months)

### 5.1 Memory Tool (Anthropic, August 2025+)

Client-side persistent memory enabling cross-session learning. Agents store/retrieve files in `/memories` directory. Critical for multi-context-window workflows. Security considerations: path traversal protection, sensitive information filtering, size limits.

### 5.2 Adaptive Thinking (Anthropic, 2025-2026)

Replaces manual `budget_tokens`. Model self-calibrates reasoning depth based on effort parameter and query complexity. Particularly suited to autonomous multi-step agents, bimodal workloads, and computer use agents.

### 5.3 Interleaved Thinking (Anthropic, May 2025+)

Thinking blocks between tool calls — agent reasons AFTER receiving each tool result. Previously thinking only happened before the first tool call. Critical for multi-step debugging and research.

### 5.4 Claude Code Agent Teams (Experimental, 2026)

Multi-session coordination with shared task lists, direct messaging, and self-coordination. Goes beyond subagents which only report back. Teammates share findings, challenge each other, and coordinate independently.

### 5.5 Effort Parameter (Anthropic, 2025-2026)

Granular control: `low`, `medium`, `high`, `xhigh`, `max`. Replaces `budget_tokens` as primary intelligence control. `xhigh` recommended for coding/agentic. Models respect effort levels strictly at low end.

### 5.6 Prompt Caching with Extended TTL (Anthropic, 2025-2026)

1-hour cache duration option (2x base cost) for agentic workflows. Cache reads don't deduct against rate limits. Pre-warming pattern for latency-sensitive applications.

### 5.7 Model Context Protocol (MCP)

Open standard for connecting AI applications to external systems. Supported across Claude, ChatGPT, VS Code, Cursor, and many others. Enables tool sharing and interoperability between AI platforms.

### 5.8 Strict Tool Use (Anthropic)

`strict: true` in tool definitions guarantees Claude's tool calls always match schema exactly. Eliminates parsing errors in agent loops.

### 5.9 Context Awareness (Claude 4.5+)

Models can track their remaining context window ("token budget") throughout conversations. Enables intelligent context management and "save state before window refreshes" behavior.

---

## 6. Per-Stage Recommendations

### Stage 1: Project Setup / Scaffolding

**Current:** Create worktree, spec dir, workflow JSON, agent team.

**Improvements:**
- **Initializer Pattern (Anthropic):** First session should set up foundational environment: feature list (JSON), progress tracking file, init script, git baseline. This mirrors the "initializer agent" pattern from Anthropic's long-running agent harness research.
- **Auto-detection with Config Write:** Use `first-run-config.md` protocol more aggressively. Detect project stack, test framework, linter, CI system automatically and write to structured config JSON.
- **Pre-warm Prompt Cache:** If the workflow will use API calls, pre-warm system prompts for all subsequent stages to eliminate first-request latency.
- **Memory Tool Bootstrap:** Create `/memories` directory structure with project-context.xml and progress-tracker.md files for cross-session continuity.

### Stage 2: Requirements + BDD

**Current:** Spawn requirements-clarifier + doc-validator → bdd-scenario-writer + doc-validator.

**Improvements:**
- **Interview Pattern (Claude Code):** Before generating requirements, have the agent "interview" the user using structured questions about technical implementation, edge cases, and tradeoffs. "Claude asks about things you might not have considered yet."
- **Structured Research Before BDD:** Use just-in-time context retrieval to pull existing similar features from the codebase before writing BDD scenarios. This grounds scenarios in reality.
- **Acceptance Criteria Traceability Matrix:** Generate a machine-readable mapping (JSON) from each AC to BDD scenarios. Gate scripts can validate completeness programmatically.
- **DSPy-style Optimization:** Use few-shot examples from previous successful requirements docs as "bootstrap" examples for the requirements-clarifier agent.

### Stage 3: Research

**Current:** Spawn research-agent, Firecrawl MCP, deep-research mode on issues.

**Improvements:**
- **Competing Hypotheses Pattern (Anthropic Agent Teams):** Instead of one research agent iterating, spawn 3-5 research agents with different angles simultaneously. Have them challenge each other's findings.
- **Structured Hypothesis Tracking:** Maintain a hypothesis tree or research notes file with confidence levels. "Track confidence levels to improve calibration. Regularly self-critique approach."
- **Source Verification:** Require verification across multiple sources before accepting any finding.
- **Time-Bounded Research:** Set explicit scope and success criteria to prevent infinite exploration. "Scope investigations narrowly or use subagents."
- **Research → Options Matrix:** Always produce a structured comparison matrix (not just prose) with evaluation criteria, pros/cons, and recommendation rationale.

### Stage 4: Debug Analysis

**Current:** Spawn debug-analyzer (bug fixes only).

**Improvements:**
- **Multiple Competing Hypotheses (Anthropic Pattern):** "Spawn 5 agent teammates to investigate different hypotheses. Have them talk to each other to try to disprove each other's theories, like a scientific debate."
- **Reproduce → Minimize → Instrument Loop:** Follow the systematic debugging pattern: first reproduce, then minimize the reproduction, then instrument to gather data, then fix.
- **Root Cause vs. Symptom Distinction:** Explicitly prompt the debug agent to distinguish between symptoms and root causes. "Address root causes, not symptoms."
- **Git Bisect Integration:** For regression bugs, automate git bisect with the debug agent to narrow the introducing commit.

### Stage 5: Code Assessment

**Current:** Spawn code-assessor. First stage to explore codebase.

**Improvements:**
- **Subagent Architecture for Exploration:** Use subagents with separate context windows for codebase exploration. Each subagent investigates one aspect (architecture, dependencies, test coverage, security) and reports summaries back.
- **Code Intelligence Plugins:** Leverage "go to definition" and "find references" navigation for precise structural analysis rather than grep-based exploration.
- **Automated Metrics:** Generate structured assessment with: cyclomatic complexity, dependency depth, test coverage gaps, security surface area, technical debt hotspots.
- **Pattern Library Extraction:** Identify 3-5 canonical patterns from the codebase that subsequent stages should follow (per Claude Code best practices: "reference existing patterns").

### Stage 6: Design / Architecture

**Current:** Route to architecture-designer, architecture-improver, ui-ux-designer, or product-designer.

**Improvements:**
- **Design It Twice (ADK Pattern):** Always produce at least 2 competing architectural approaches. Use the "4 distinct visual directions" pattern from Anthropic's frontend guidance.
- **ADR-Driven Design:** Generate Architecture Decision Records as first-class outputs with: context, decision, consequences, alternatives considered.
- **Interface-First Design:** Define interfaces/contracts before implementations. This enables parallel implementation in Stage 9.
- **Graph-Based Workflow Visualization:** Use deterministic graph patterns (from Google ADK 2.0) to visualize the proposed architecture's execution flow.
- **Evaluation Matrix with Weighted Criteria:** Score approaches against: testability, readability, consistency, simplicity, reversibility (from decision framework in CLAUDE.md).

### Stage 7: Specification Writing

**Current:** Spawn spec-writer + doc-validator. Produces specification, implementation plan, task list.

**Improvements:**
- **AI-Consumable Format:** Write specs optimized for AI consumption: use XML tags to structure sections, include machine-parseable acceptance criteria, reference BDD scenarios by ID.
- **Implementation Plan as Task Graph:** Structure the implementation plan as a dependency graph (not just a list) so Stage 9 can identify parallelizable phases.
- **Contract-First Specifications:** Define input/output contracts and interface signatures in the spec. This enables type-checking against the spec during implementation.
- **Long Context Best Practice:** Put long reference documents at the TOP of prompts, queries at the BOTTOM. "Queries at the end can improve response quality by up to 30%."

### Stage 8: Specification Review

**Current:** Spawn spec-reviewer + doc-validator. Verify coverage of requirements, BDD, design.

**Improvements:**
- **Multi-Lens Review (Anthropic Agent Teams Pattern):** Spawn 3 reviewers in parallel: one checking requirements coverage, one checking technical feasibility, one checking test strategy. Synthesize findings.
- **Coverage Report as Structured Output:** Generate a machine-readable traceability report showing: each AC → spec section → BDD scenario → implementation plan task. Gate script validates completeness.
- **Explicit Anti-Patterns Check:** Include verification that spec doesn't introduce: unnecessary abstractions, premature optimization, missing error paths, untestable requirements.
- **Self-Correction Chain:** Generate spec draft → review against criteria → refine based on review. "The most common chaining pattern is self-correction."

### Stage 9: Implementation (TDD)

**Current:** Sequential per phase: tdd-guide → domain specialist → qa-agent → e2e-runner.

**Improvements:**
- **Parallelizable Phase Execution:** Use the task graph from Stage 7 to identify independent phases that can run in parallel (different files, different modules). "Three focused teammates often outperform five scattered ones."
- **Feature-by-Feature Incremental Pattern:** Work one feature at a time, verify end-to-end before marking complete. "Only mark a feature complete after end-to-end verification confirms it works, not just after the code is written."
- **Anti-Hardcoding Prompt:** "Write a high-quality, general-purpose solution using the standard tools available. Do not hard-code values or create solutions that only work for specific test inputs. Implement the actual logic."
- **Verification Tools:** Use browser automation (Playwright MCP) for UI testing. "As the length of autonomous tasks grows, agents need to verify correctness without continuous human feedback."
- **Init Script Pattern:** Create setup/teardown scripts early that agents reuse each phase (server startup, test suite, linters). Prevents repeated work across phases.
- **Git-Based Progress Tracking:** Commit after each passing phase with descriptive messages. Use git log as recovery mechanism for subsequent context windows.
- **Effort Level Management:** Use `xhigh` effort for complex implementation, `high` for test writing, `medium` for simple refactoring within a phase.

### Stage 10: Code Review

**Current:** Spawn code-reviewer + adversarial-reviewer + doc-validators.

**Improvements:**
- **Coverage-First Prompting (Anthropic Opus 4.7 Guidance):** "Report every issue you find, including ones you are uncertain about or consider low-severity. Your goal here is coverage: it is better to surface a finding that later gets filtered out than to silently drop a real bug."
- **Multi-Domain Parallel Review:** Spawn reviewers with distinct lenses: security implications, performance impact, test coverage validation, API compatibility, accessibility.
- **Writer/Reviewer Separation:** "A fresh context improves code review since Claude won't be biased toward code it just wrote." Ensure reviewer has clean context.
- **Confidence-Scored Findings:** Each finding includes: severity, confidence level, file:line reference, suggested fix. Downstream filter ranks them.
- **Guard Against Under-Reporting:** If review prompt says "be conservative" or "don't nitpick," Opus 4.7 may follow too literally. Remove such qualifiers.

### Stage 11: Documentation

**Current:** Sequential: docs-executor → doc-validator → handoff-writer.

**Improvements:**
- **Documentation-as-Code:** Generate docs alongside code changes (not as separate phase). Commit docs WITH the code change in the same commit.
- **AI-Optimized Documentation:** Include structured metadata, example usage, and cross-references that future AI agents can parse efficiently.
- **Changelog Generation from Git:** Use git log and diff analysis to auto-generate changelog entries, not manual documentation.
- **API Documentation from Types:** Extract documentation from type definitions and interfaces rather than requiring manual JSDoc/docstring writing.
- **Handoff Document as Memory:** Format handoff documents as memory-tool-compatible files so the next session can bootstrap instantly.

### Stage 12: Cleanup & Confirmation

**Current:** Verify termination, spawn build-cleaner, preserve worktree, present summary.

**Improvements:**
- **End-of-Session State Update:** Update progress log with what was completed and what remains, following the "end-of-session update" pattern from Anthropic's harness research.
- **Automated Integration Test:** Run full integration test suite as final verification before presenting to user.
- **Resource Cleanup Verification:** Verify no orphaned processes, temp files, or leaked secrets exist in the worktree.
- **Summary with Decision Trail:** Present not just what changed, but WHY each decision was made (linking back to Stage 6 ADRs).

### Stage 13: Commit and Merge

**Current:** Git operations: commit spec + code, merge to main.

**Improvements:**
- **Semantic Commit Messages:** Use conventional commits with machine-parseable format. Include scope, breaking change markers, and issue references.
- **PR Description from Spec:** Auto-generate PR description from the specification document, including: summary, test plan, traceability to requirements.
- **Pre-Merge Verification Gate:** Run CI-equivalent checks locally before merge: build, test, lint, type-check, security scan.
- **Post-Merge Cleanup:** Clean up feature branch, update any external tracking systems, mark issues as resolved.

---

## 7. AI Workflow Patterns

### 7.1 Prompt Engineering for Agents

| Pattern | Description | Source |
|---------|-------------|--------|
| XML Structuring | Wrap content types in distinct tags (`<instructions>`, `<context>`, `<input>`) | Anthropic |
| Role Prompting | Set role in system prompt to focus behavior and tone | Anthropic |
| Few-Shot with Thinking | Include `<thinking>` tags in examples to show reasoning pattern | Anthropic |
| Explicit Action Prompts | "Change this function" not "Can you suggest changes?" | Anthropic |
| Investigate Before Answering | Never speculate about code not opened — read first | Anthropic |
| Default to Action | Implement rather than suggest unless unclear | Anthropic |
| Parallel Tool Instructions | Explicit instructions about independent vs dependent calls | Anthropic |
| Anti-Overengineering | "Only make changes that are directly requested or clearly necessary" | Anthropic |
| Self-Check | "Before you finish, verify your answer against [test criteria]" | Anthropic |

### 7.2 Tool Use Patterns

- **Parallel Execution:** Read multiple files, run multiple searches simultaneously. "Execute bash commands in parallel (which can even bottleneck system performance)"
- **Strict Schema Enforcement:** `strict: true` guarantees output matches schema exactly
- **Tool as Context Source:** Let agents fetch their own context via tools rather than pre-loading everything
- **Error Recovery:** Retry failed tool calls with adjusted parameters; implement graceful degradation
- **Minimum Tool Overlap:** Ambiguous tool sets lead to agent errors — each tool should have clear, distinct purpose

### 7.3 Context Management

- **Context is the fundamental constraint** — manage it aggressively
- **Just-in-time loading:** Load data on demand, not upfront
- **Subagents for exploration:** Keep main context clean; subagents report summaries
- **Compaction with focus:** `/compact Focus on the API changes` — direct what to preserve
- **Skills load on demand:** Only descriptions loaded at start; full content when used
- **Start fresh vs. compact:** For new sessions, fresh context + filesystem discovery often beats compaction
- **Context awareness:** Models track remaining budget; prompt about compaction behavior

### 7.4 Multi-Context Window Workflows

1. First window: set up framework (tests, scripts, todo-list)
2. Subsequent windows: iterate on todo-list
3. Use JSON for structured state, text for progress notes
4. Git as primary state tracking mechanism
5. Init scripts for graceful startup in fresh contexts
6. Mandatory verification before marking features complete
7. "It is unacceptable to remove or edit tests" — prevent regression masking

### 7.5 Error Handling and Recovery

- **Three-attempt rule:** Stop after 3 failures, research alternatives
- **Question basic assumptions:** Is the approach over-abstracted? Can it be decomposed?
- **Obstacle investigation:** Don't use destructive actions as shortcuts. Investigate root causes.
- **Graceful degradation:** Plan fallback paths for each critical step
- **State preservation:** Git commit before risky operations

---

## 8. Internal Improvement Suggestions

### 8.1 Plugin Architecture Improvements

1. **Effort Level Configuration:** Add per-stage effort level configuration to the workflow JSON. Research/Design stages should use `xhigh`/`max`; simple cleanup stages can use `medium`.

2. **Prompt Caching Strategy:** Implement prompt caching for the system prompts and protocol files that are shared across all stages. Pre-warm at Stage 1.

3. **Memory Tool Integration:** Add memory-tool-compatible state files to the spec directory so workflows can survive context window resets gracefully.

4. **Task Graph (DAG) for Implementation:** Replace linear phase lists with a dependency graph that enables parallel execution of independent phases.

5. **Competing Hypothesis Mode for Research/Debug:** Add a workflow variant that spawns multiple agents with different angles and has them debate findings.

### 8.2 Agent Prompt Improvements

6. **Anti-Hallucination Tags:** Add `<investigate_before_answering>` blocks to all agents that interact with code.

7. **Coverage-First Review Prompts:** Update code-reviewer and adversarial-reviewer prompts to use Anthropic's recommended "report everything, filter later" pattern.

8. **Parallel Tool Calling Instruction:** Add the `<use_parallel_tool_calls>` prompt block to all agents for maximum efficiency.

9. **Self-Verification Mandate:** Every implementation agent should verify its own work (run tests, compare outputs) before reporting completion.

10. **Adaptive Thinking Guidance:** Add steering for adaptive thinking: "Use thinking when multi-step reasoning is needed. For simple tasks, respond directly."

### 8.3 Workflow Process Improvements

11. **Writer/Reviewer Separation Enforcement:** Ensure code reviewers always operate in fresh contexts, never reviewing code they generated.

12. **Structured Output Gates:** Gate scripts should validate structured JSON outputs, not just prose documents. Machine-parseable traceability matrices.

13. **Incremental Git Commits per Phase:** Mandate git commit after each passing phase in Stage 9. This provides recovery points and progress visibility.

14. **Init Script Generation:** Stage 1 should generate project-specific init scripts that all subsequent agents use for environment setup.

15. **Quality Gate Hooks:** Implement `TaskCompleted` hooks that run automated validation (build, test, lint) before any task can be marked complete.

### 8.4 New Capabilities to Add

16. **Plan Approval for Risky Stages:** Add plan-approval workflow for Stages 6 (Architecture) and 9 (Implementation) where teammates must get team-lead approval before making changes.

17. **Observability/Tracing:** Add structured logging of agent decisions at each stage for debugging workflow issues.

18. **Cost Tracking:** Track token usage per stage to identify optimization opportunities.

19. **Feedback Loop from Stage 10 to Stage 9:** When code review finds issues, route specific findings back to the implementation agent with file:line references for targeted fixes.

20. **Cross-Stage Context Passing:** Use structured handoff documents between stages that carry forward only the essential context (not full conversation history).

---

## 9. Sources

### Anthropic Documentation (May 2026)
- Claude Prompting Best Practices — https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Claude Code Best Practices — https://code.claude.com/docs/en/best-practices
- Claude Code Common Workflows — https://code.claude.com/docs/en/common-workflows
- How Claude Code Works — https://code.claude.com/docs/en/how-claude-code-works
- Agent Teams — https://code.claude.com/docs/en/agent-teams
- Extended Thinking — https://platform.claude.com/docs/en/build-with-claude/extended-thinking
- Prompt Caching — https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Tool Use Overview — https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- Memory Tool — https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
- Effective Context Engineering for AI Agents — https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Effective Harnesses for Long-Running Agents — https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

### OpenAI Documentation (2025-2026)
- OpenAI Agents SDK — https://openai.github.io/openai-agents-python/
- OpenAI Agents SDK Multi-Agent — https://openai.github.io/openai-agents-python/multi_agent/
- OpenAI Agents SDK Guardrails — https://openai.github.io/openai-agents-python/guardrails/

### Google Documentation (2025-2026)
- Agent Development Kit (ADK) — https://adk.dev/

### Framework Documentation
- CrewAI Crews — https://docs.crewai.com/concepts/crews
- LangGraph — https://www.langchain.com/langgraph
- DSPy — https://dspy.ai/
- Model Context Protocol — https://modelcontextprotocol.io/introduction

### Community & Industry Sources
- GitHub Blog AI/ML — https://github.blog/ai-and-ml/
- Martin Fowler - Exploring Gen AI — https://martinfowler.com/articles/exploring-gen-ai.html
- Cursor Blog — https://www.cursor.com/blog
