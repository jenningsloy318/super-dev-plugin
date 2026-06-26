# Super Dev Plugin

A comprehensive team-lead-driven development workflow plugin for Claude Code with parallel agent execution for implementing features, fixing bugs, and refactoring code.

Enhanced with best practices from [everything-claude-code](https://github.com/affaan-m/everything-claude-code)

v2.4.31 — Enhanced Research and Stage Capabilities:
- Enhanced Research: search-agent gains community discovery mode (Reddit/HN/forums) and AI documentation traversal mode with momentum scoring and emerging consensus detection
- Research Agent: 4-pass research pipeline (best practices → community discovery → AI doc traversal → innovation discovery) with internal improvement suggestions
- Stage 1–13 Quality Upgrades: Every workflow stage strengthened with 2026 best practices (interview-pattern requirements, hypothesis-tree debugging, architecture smells, AI-aware design, task DAG specs, OWASP 2025 reviews, CONTEST adversarial verdicts, BDD traceability)
- Codex CLI Parity: All agent enhancements mirrored in `.codex/agents/*.toml`

v2.3.52 — Stage-Based Workflow with Implementation Completeness:
- Terminology Clarity: Workflow steps renamed from "Phase" to "Stage" (Stage 1–13). "Phase" now exclusively refers to implementation-plan phases (Phase 1, 2, 3…)
- Implementation Completeness Loop: Stage 9/10 now iterates through ALL implementation-plan phases before proceeding to Stage 11
- Continuous Verification Gates: Programmatic quality checks between every stage handoff (6 gate scripts in `scripts/gates/`)
- Real Browser Testing: QA agent now runs browser smoke tests using chrome-devtools MCP for web apps
- Autoresearch Skill: Auto-improve agent prompts using Karpathy's iterative test-measure-improve method
- Investigation Protocol: New `investigator` agent for bounded mid-execution research when agents hit unknowns (inspired by gstack's `/investigate`)
- 10 Automated Hooks: Hook-level enforcement for safety, formatting, linting, testing, stage gates, and checkpoints (inspired by @zodchiii's 8 hooks principle)

*Inspired by: gstack (Garry Tan), Boris's Claude Code workflow, agentic engineering best practices 2026, @zodchiii's Claude Code hooks, and Anthropic's official skill design lessons.*

## Prerequisites

The plugin requires two CLI tools for deterministic template rendering:

```bash
# Install minijinja-cli (template engine)
curl -sSfL https://github.com/mitsuhiko/minijinja/releases/latest/download/minijinja-cli-installer.sh -o /tmp/minijinja-cli-installer.sh
bash /tmp/minijinja-cli-installer.sh

# Install jq (JSON validation)
# Debian/Ubuntu
sudo apt-get install jq
# macOS
brew install jq
```

Verify both are available:

```bash
minijinja-cli --version
jq --version
```

## Installation

### Claude Code

```bash
claude plugin marketplace add jenningsloy318/super-dev-plugin
claude plugin install super-dev@super-dev
claude plugin enable super-dev@super-dev
```

### OpenAI Codex

```bash
codex plugin marketplace add jenningsloy318/super-dev-plugin
```

Then inside Codex, enable the plugin:

```
/plugins enable super-dev
```

Alternatively, install agents manually:

```bash
# Global install (available in all Codex sessions)
./scripts/setup-codex-agents.sh --global

# Project-level install
./scripts/setup-codex-agents.sh --project
```

### Antigravity IDE/CLI

The plugin is fully compatible with Google Antigravity IDE and Antigravity CLI (`agy`). It uses the Antigravity plugin format with a root-level `plugin.json` and convention-based directory discovery for `agents/`, `skills/`, `rules/`, and `hooks.json`.

**Installation:**

```bash
agy plugin install https://github.com/jenningsloy318/super-dev-plugin
```

**Workspace-level installation:**

```bash
# Clone into your project's plugin directory
mkdir -p .agents/plugins
git clone https://github.com/jenningsloy318/super-dev-plugin \
  .agents/plugins/super-dev
```

**Migration:**
The plugin uses the Antigravity plugin format natively.

## Overview

This plugin provides a systematic development workflow with 13 stages. On Claude Code v2.1.178+ the entire pipeline runs as a [Dynamic Workflow](https://code.claude.com/docs/en/workflows) — a deterministic JavaScript orchestration script that holds the loops, gates, and intermediate state in code, freeing each agent to focus on its own stage. On platforms without a Workflow runtime (Codex CLI, Antigravity, older Claude Code) the same 13-stage contract is executed by a Team Lead agent that narrates the orchestration turn by turn.

## Workflow Engine

The Workflow script at `workflows/super-dev.workflow.js` is the source of truth for the 13-stage pipeline. Layout:

```
workflows/
├── super-dev.workflow.js   # 13-stage orchestration body + inlined git helpers
├── README.md
schemas/
├── gate-verdict.json
├── requirements-output.json
├── bdd-output.json
├── research-output.json
├── debug-output.json
├── assessment-output.json
├── design-output.json
├── prototype-output.json
├── spec-output.json
├── spec-review-output.json
├── tdd-output.json
├── impl-output.json
├── impl-summary-output.json
├── qa-output.json
├── e2e-output.json
├── code-review-output.json
├── adversarial-review-output.json
├── docs-output.json
├── handoff-output.json
└── cleanup-output.json
```

The Workflow runtime requires `export const meta` to be the FIRST statement and forbids `import` declarations, so the git-helper Bash snippets and `shellQuote` are inlined as plain function declarations at the bottom of `super-dev.workflow.js` (hoisted within the module).

Key properties:

- **Deterministic loops** — Stage 8 (spec review), Stage 9 (per-phase TDD), and Stage 10 (code review) iteration limits are real JS `while` loops capped at 3. The model cannot drift past the cap.
- **Structured-output verdicts** — every gate result is a `GateVerdict` object validated against `schemas/gate-verdict.json`. Stage transitions read `verdict.pass` from data, not from chat signals.
- **Per-phase commits** — Stage 9 captures `base_sha` before each phase, then commits the phase under `feat(<phase-name>): <summary>` once `gate-build` passes. The next phase's `base_sha` is the new HEAD.
- **Pivot detection** — Stage 10's adversarial reviewer can set `spec_faithful_but_wrong=true`; combined with finding-signature stagnation at iteration ≥ 2, the workflow throws `PIVOT_REQUIRED` so the caller can re-run from Stage 6 with a revised design instead of looping forever.
- **Sensitive-data gate** — Stage 12 scans the worktree for accidentally committed secrets before any merge; findings are BLOCKING.
- **Manual merge** — Stage 13 logs the merge command for the user to run manually (never auto-merges).
- **Resumable** — the Workflow runtime persists each agent result; an interrupted run replays the cached prefix and resumes from the first incomplete stage.

## Usage

### Main Entry Point

Invoke the `super-dev` skill and describe your task:

```
Invoke the super-dev skill and describe your task
```

On Claude Code v2.1.178+ the skill triggers `Workflow(${CLAUDE_PLUGIN_ROOT}/workflows/super-dev.workflow.js)` with the user's request as `args.request`.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `request` | string | *(required)* | Your natural-language task description |
| `plugin_root` | string | *(auto)* | Plugin root path (resolved automatically) |
| `repo_path` | string | *(auto)* | Target project path (resolved from cwd) |

All other behavior (feature kind, language, UI scope) is auto-detected by the workflow from the request text and project structure.

### Examples

```bash
# Basic feature (all defaults)
/super-dev:super-dev implement user authentication with OAuth2

# Bug fix
/super-dev:super-dev fix the login crash on mobile

# Refactor
/super-dev:super-dev refactor the payment module for better testability
```

### Additional Commands

```
/plan - Implementation planning with planner agent
/tdd - Test-driven development workflow
/e2e - E2E test generation
/code-review - Quality and security review
/build-fix - Fix build errors
/refactor-clean - Dead code removal
/learn - Extract patterns mid-session
/test-coverage - Check test coverage
/update-docs - Update documentation
/update-codemaps - Update code maps
/autoresearch - Auto-improve agent prompts (Karpathy method)
```

## Architecture

```
                    ┌─────────────────┐
                    │   super-dev     │
                    │     Skill       │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Coordinator   │ ◄── Central Authority
                    │     Agent       │
                    └────────┬────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
    ▼                        ▼                        ▼
┌─────────┐            ┌─────────┐            ┌─────────┐
│Planning │            │Analysis │            │Execution│
│ Agents  │            │ Agents  │            │ Agents  │
└─────────┘            └─────────┘            └─────────┘
```

## Plugin Structure

All instruction files (agents, commands, rules, skills, reference docs) use a unified XML-tagged format with a three-tier tag schema (`<meta>`, semantic content blocks, type-specific tags). README files and JSON/shell files remain in their original formats.

```
super-dev-plugin/
├── .claude-plugin/              # Claude Code plugin manifest
│   └── plugin.json
├── .codex-plugin/               # OpenAI Codex plugin manifest
│   └── plugin.json
├── .codex/                      # Codex agent definitions (TOML)
│   ├── config.toml                 # Agent declarations
│   └── agents/*.toml               # 35 agents in Codex TOML format
├── AGENTS.md                    # Codex project-level instructions
├── workflows/                 # Dynamic Workflow scripts
│   └── super-dev.workflow.js      # 13-stage orchestration (Workflow runtime)
├── schemas/                   # JSON Schema for structured agent outputs (20 files)
├── agents/                    # Specialized agents (35 total, XML-tagged)
│   ├── team-lead.md              # Central Team Lead Agent (super-dev unique)
│   ├── dev-executor.md             # Development Executor
│   ├── qa-executor.md              # QA Executor
│   ├── docs-executor.md            # Documentation Executor
│   ├── architecture-designer.md    # Architecture Design for new features
│   ├── architecture-improver.md    # Architecture Improvement for existing code
│   ├── ui-ux-designer.md           # UI/UX Design (super-dev unique)
│   ├── spec-writer.md              # Specification Writer (super-dev unique)
│   ├── research-agent.md           # Research Agent (super-dev unique)
│   ├── code-reviewer.md            # Specification-Aware Review (super-dev unique)
│   ├── debug-analyzer.md           # Debug Analysis
│   ├── code-assessor.md            # Code Assessment
│   ├── requirements-clarifier.md   # Requirements Clarification
│   ├── search-agent.md             # Multi-Source Search
│   ├── qa-agent.md                 # QA Testing
│   ├── adversarial-reviewer.md      # Multi-lens Adversarial Review
│   ├── bdd-scenario-writer.md       # BDD Scenario Generation (Stage 2)
│   ├── investigator.md              # Mid-Execution Investigation (any stage, on-demand)
│   │
│   # Additional agents:
│   ├── build-error-resolver.md     # Build Error Resolution
│   ├── doc-updater.md              # Documentation Updates
│   ├── e2e-runner.md               # E2E Testing
│   ├── planner.md                  # Implementation Planning
│   ├── refactor-cleaner.md         # Dead Code Cleanup
│   ├── security-reviewer.md        # Security Analysis
│   ├── tdd-guide.md                # Test-Driven Development
│   │
│   # Developer Specialists:
│   ├── rust-developer.md
│   ├── golang-developer.md
│   ├── frontend-developer.md
│   ├── backend-developer.md
│   ├── android-developer.md
│   ├── ios-developer.md
│   ├── macos-app-developer.md
│   └── windows-app-developer.md
│
├── skills/                     # Skills (5 items, XML-tagged)
│   # super-dev skills:
│   ├── super-dev/                 # Main orchestrator skill
│   # Additional skills:
│   ├── tdd-workflow/              # Test-Driven Development methodology
│   ├── security-review/           # Security checklist
│   ├── continuous-learning/       # Auto-extract patterns from sessions
│   └── strategic-compact/         # Manual compaction suggestions
│
├── templates/                  # MiniJinja format templates (agents read as structure reference)
│   └── *.md.j2                    # 9 MiniJinja templates (gate-compliant structure)
│   └── reference/                 # Reference documentation
│       ├── architecture-patterns.md  # Software architecture patterns, SOLID, ADRs
│       ├── ui-ux-patterns.md         # UI/UX design patterns, wireframes, accessibility
│       ├── debugging-patterns.md     # Systematic debugging methodology, root cause analysis
│       ├── research-methodology.md   # Multi-source research, option presentation, synthesis
│       ├── testing-patterns.md       # CLI, Desktop UI, Web testing strategies
│       ├── backend-patterns.md       # API, database, caching patterns
│       ├── frontend-patterns.md      # React, Next.js patterns
│       ├── coding-standards.md       # Language best practices
│       ├── bdd-patterns.md           # BDD scenario writing patterns and reference
│       ├── *-template.md             # XML-tagged document templates (5 remaining)
│       └── project-guidelines-example.md
│
├── rules/                      # Always-follow guidelines (7 files, XML-tagged)
│   ├── agents.md                 # When to delegate to subagents
│   ├── coding-style.md           # Immutability, file organization
│   ├── git-workflow.md           # Commit format, PR process
│   ├── patterns.md               # Common code patterns
│   ├── performance.md            # Model selection, context management
│   ├── security.md               # Mandatory security checks
│   └── testing.md                # TDD, coverage requirements
│
├── hooks/                     # Automated hooks (10 total)
│   ├── hooks.json                  # Hook configuration (PreToolUse/PostToolUse/Stop)
│   ├── block-dangerous.sh          # Block destructive Bash commands
│   ├── protect-files.sh            # Block edits to sensitive files
│   ├── log-commands.sh             # Audit trail of all commands
│   ├── require-tests-pr.sh         # Gate: tests must pass before PR
│   ├── stage-gate.sh               # Gate: validate stage artifacts before agent spawn
│   ├── stage-manifest.json         # Stage → required artifacts mapping
│   ├── auto-format.sh              # Auto-detect and run formatter
│   ├── auto-lint.sh                # Auto-detect and run linter
│   ├── run-tests.sh                # Run tests after edit (opt-in)
│   └── auto-checkpoint.sh          # Git checkpoint on stop
│
├── plugins/                    # Plugin ecosystem documentation
│   └── README.md                # Plugins and marketplaces guide
│
├── examples/                   # Example configurations
│   ├── CLAUDE.md                # Example project-level config
│   ├── user-CLAUDE.md           # Example user-level config
│   └── statusline.json          # Example statusline config
│
└── scripts/                    # Utility scripts
    ├── gates/                     # Per-document gate validation scripts
    ├── preflight-env.sh           # Environment preflight check
    └── (other scripts)
```

## Workflow Stages

| Stage | Name | Agent/Skill | Description |
|-------|------|-------------|-------------|
| 1 | Specification Setup | Coordinator | Scan handoffs for continuity, create worktree, spec dir, team |
| 2 | Requirements + BDD | `super-dev:requirements-clarifier` → `super-dev:bdd-scenario-writer` | Gather requirements, then generate Given/When/Then scenarios (MANDATORY) |
| 3 | Research | `super-dev:research-agent` | Best practices research with optional deep-research follow-up |
| 4 | Debug Analysis | `super-dev:debug-analyzer` | Root cause analysis (grep/ast-grep) |
| 5 | Code Assessment | `super-dev:code-assessor` | Evaluate codebase (grep/ast-grep) |
| 6 | Design | `super-dev:architecture-designer`/`super-dev:architecture-improver` + `super-dev:ui-ux-designer` | Architecture (new → designer, refactor → improver) + UI/UX design (when applicable) |
| 7 | Specification Writing | `super-dev:spec-writer` | Create tech spec, implementation plan, task list |
| 8 | Specification Review | `super-dev:spec-reviewer` | Validate all documents |
| 9 | Implementation | PARALLEL: 9.1 `tdd-guide` → 9.2 domain specialist → 9.3 `qa-agent` → 9.4 `e2e-runner` (Web/UI) | Implement ALL plan phases iteratively |
| 10 | Code Review | `super-dev:code-reviewer` + `super-dev:adversarial-reviewer` | Spec-aware + multi-lens review (loops with Stage 9) |
| 11 | Documentation + Handoff | `super-dev:docs-executor` → `super-dev:handoff-writer` | Update docs, write handoff |
| 12 | Cleanup | Coordinator | Terminate agents, finalize artifacts |
| 13 | Commit + Final Verification | Coordinator | Commit, merge, verify all complete |

## Key Features

### Super-Dev Unique Features

1. Coordinator Agent - Central orchestrator for all workflow stages
1. Git Worktree Requirement - MANDATORY isolation for development
3. Specification-Aware Code Review - Validates against technical specs
4. Parallel Execution - Specialists + QA run simultaneously
5. Build Queue Management - Rust/Go serialization for resource safety
6. Implementation Completeness Loop - ALL plan phases must be implemented before docs stage
6. BDD Integration - Mandatory Stage 2 BDD scenario generation with 100% coverage gate
8. Investigation Protocol - Bounded mid-execution investigation when agents hit unknowns (auto-triggered by dev-executor, qa-agent, code-reviewer)

### Additional Integrated Features

1. TDD Workflow Skill - Comprehensive test-driven development methodology
2. Security Review Skill - Security checklist and validation
3. Rules System - Modular always-follow guidelines
4. Contexts - Dynamic system prompt injection (dev/review/research modes)
5. MCP Configurations - Pre-configured MCP server templates
6. Additional Agents - planner, tdd-guide, security-reviewer, refactor-cleaner, etc.
7. Additional Commands - /plan, /tdd, /e2e, /refactor-clean, etc.

## Hooks (10 Total)

Hooks are automatic actions that fire every time Claude edits a file, runs a command, or finishes a task. Unlike CLAUDE.md rules (~80% compliance), hooks provide 100% enforcement — they run in the background without Claude needing to remember.

### PreToolUse Hooks (block before action)

| # | Hook | Matcher | Purpose |
|---|------|---------|---------|
| 1 | `usage-tracker.sh` | `Skill\|Agent` | Track skill/agent invocations to usage log |
| 2 | `block-dangerous.sh` | `Bash` | Block `rm -rf`, `DROP TABLE`, `git push --force`, etc. (exit 2) |
| 3 | `protect-files.sh` | `Edit\|Write` | Block edits to `.env`, `.pem`, `secrets/`, `.git/` (exit 2) |
| 4 | `log-commands.sh` | `Bash` | Timestamped audit trail of every command |
| 5 | `require-tests-pr.sh` | `mcp__github__create_pull_request` | Hard gate: tests must pass before PR creation |
| 6 | `stage-gate.sh` | `Agent` | Validate previous stage artifacts before spawning next agent |

### PostToolUse Hooks (quality control after action)

| # | Hook | Matcher | Purpose |
|---|------|---------|---------|
| 7 | `auto-format.sh` | `Write\|Edit` | Auto-detect formatter (prettier/biome/black/ruff/gofmt/rustfmt) |
| 8 | `auto-lint.sh` | `Write\|Edit` | Auto-detect linter (eslint/biome/ruff/golangci-lint/clippy) |
| 9 | `run-tests.sh` | `Write\|Edit` | Run tests after edit (opt-in: `SUPER_DEV_TEST_ON_EDIT=1`) |

### Stop Hook (cleanup on session end)

| # | Hook | Matcher | Purpose |
|---|------|---------|---------|
| 10 | `auto-checkpoint.sh` | (all) | Create recoverable git checkpoint via `git stash create` |

### Stage Gate (Hook #6)

The stage-gate hook validates that prerequisite artifacts exist before spawning stage agents. It reads `stage-manifest.json` to map agent types to required files:

```
Stage 2    (BDD)         → requires [doc-index]-requirements.md
Stage 3    (Research)    → requires [doc-index]-requirements.md + [doc-index]-bdd-scenarios.md
Stage 5    (Assessment)  → requires [doc-index]-research-report.md
Stage 7    (Spec)        → requires [doc-index]-code-assessment.md
Stage 9    (Execution)   → requires [doc-index]-specification.md + [doc-index]-implementation-plan.md + [doc-index]-task-list.md + [doc-index]-spec-review.md
Stage 10   (Review)      → requires [doc-index]-specification.md + [doc-index]-implementation-summary.md
Stage 11   (Docs)        → requires [doc-index]-specification.md + gate-implementation-complete.sh PASS
Stage 11   (Handoff)     → requires [doc-index]-specification.md
```

The gate also validates required sections within files (e.g., requirements.md must contain "Acceptance Criteria").

### Configuration

Hooks are defined in `hooks/hooks.json` and activated automatically when the plugin is loaded. Environment variables:

- `SUPER_DEV_TEST_ON_EDIT=1` — Enable test-on-edit feedback loop (Hook #9)
- `SUPER_DEV_SPEC_DIR=/path` — Override spec directory detection for stage gates

## Agents

### Coordinator Agent (Central Authority)

The Coordinator Agent orchestrates ALL workflow stages:

- Task Assignment: Assigns correct sub-agent per stage
- Monitoring: Ensures no unauthorized stops or missing tasks
- Build Queue: Manages Rust/Go build serialization
- Quality Gates: Enforces checkpoints at stage boundaries
- Implementation Completeness: Verifies ALL plan phases are done before docs
- Final Verification: Verifies all artifacts complete

Invoke: `Task(subagent_type: "super-dev:team-lead")`

### Executor Agents (Parallel Execution)

During Stage 9-11, specialists + QA run in PARALLEL:

| Agent | Purpose | Invoke Via |
|-------|---------|------------|
| `dev-executor` | Implements code, invokes specialists | `super-dev:dev-executor` |
| `qa-agent` | Writes and runs tests | `super-dev:qa-agent` |
| `docs-executor` | Updates documentation | `super-dev:docs-executor` |

Build Policy (Rust/Go): Only ONE build at a time to prevent resource conflicts.

### Workflow Agents

| Agent | Purpose | Invoke Via |
|-------|---------|------------|
| `requirements-clarifier` | Gather requirements | `super-dev:requirements-clarifier` |
| `research-agent` | Research with Time MCP | `super-dev:research-agent` |
| `search-agent` | Multi-source search | `super-dev:search-agent` |
| `debug-analyzer` | Root cause analysis (grep/ast-grep) | `super-dev:debug-analyzer` |
| `code-assessor` | Assess codebase (grep/ast-grep) | `super-dev:code-assessor` |
| `code-reviewer` | Specification-aware code review | `super-dev:code-reviewer` |
| `architecture-designer` | Design new feature architecture and ADRs | `super-dev:architecture-designer` |
| `architecture-improver` | Improve existing architecture (deepening) | `super-dev:architecture-improver` |
| `ui-ux-designer` | Create UI/UX design specifications | `super-dev:ui-ux-designer` |
| `spec-writer` | Write specifications | `super-dev:spec-writer` |
| `qa-agent` | Modality-specific QA testing | `super-dev:qa-agent` |
| `bdd-scenario-writer` | BDD scenario generation (Stage 2) | `super-dev:bdd-scenario-writer` |
| `investigator` | Mid-execution investigation (any stage, on-demand) | `super-dev:investigator` |
| `planner` | Implementation planning | `planner` |
| `tdd-guide` | Test-driven development | `tdd-guide` |
| `security-reviewer` | Security analysis | `security-reviewer` |
| `build-error-resolver` | Fix build errors | `build-error-resolver` |
| `refactor-cleaner` | Dead code cleanup | `refactor-cleaner` |
| `doc-updater` | Documentation sync | `doc-updater` |
| `e2e-runner` | Playwright E2E testing | `e2e-runner` |

## Skills

### super-dev

Main entry point skill that documents the workflow. The Coordinator Agent is invoked to orchestrate all stages.

### tdd-workflow

Comprehensive test-driven development methodology with:
- Tests BEFORE code requirement
- 80%+ minimum coverage (unit + integration + E2E)
- Test patterns for Jest/Vitest, Playwright
- Mocking external services
- Coverage verification
- Best practices and common mistakes

### security-review

Security checklist and validation:
- No hardcoded secrets
- Input validation
- SQL injection prevention
- XSS/CSRF protection
- Authentication/authorization verification
- Rate limiting on endpoints
- Error message sanitization

## Reference Materials

The `reference/` directory contains reference documentation (XML-tagged format):

### architecture-patterns

Software architecture patterns, SOLID principles, ADR templates.

### ui-ux-patterns

UI/UX design patterns, wireframes, accessibility guidelines.

### debugging-patterns

Systematic debugging methodology, root cause analysis, evidence collection, and hypothesis verification.

### research-methodology

Multi-source research, option presentation, Time MCP integration, and synthesis techniques.

### Document Templates

9 MiniJinja templates in `templates/*.md.j2`. Agents read these as format reference (Step 0 "Read Format Template") and write markdown directly to disk following the template structure. Gate scripts validate the output against the expected headings/sections.

### testing-patterns

CLI, Desktop UI, and Web testing strategies, coverage tracking, and quality gates.

### coding-standards

Language best practices reference.

### bdd-patterns

BDD scenario writing patterns, Gherkin-like syntax reference, banned words, test reference patterns per language, and quality checklists.

### backend-patterns

API, database, caching patterns.

### frontend-patterns

React, Next.js patterns.

### project-guidelines-example

Example project-specific skill template (based on Zenith production app).

## Rules

The `rules/` directory contains modular always-follow guidelines:

- agents.md - When to delegate to subagents
- coding-style.md - Immutability, file organization, error handling
- git-workflow.md - Commit format, PR process
- patterns.md - Common code patterns (API response format, custom hooks, repository pattern)
- performance.md - Model selection (Haiku/Sonnet/Opus), context window management
- security.md - Mandatory security checks
- testing.md - TDD, 80% coverage requirement

## Output Documents

All documents are created in `specification/[index]-[name]/` directory:

1. `[index]-requirements.md` - Clarified requirements
2. `[index]-research-report.md` - Research findings with freshness scores
3. `[index]-debug-analysis.md` - Debug analysis (bugs only)
4. `[index]-code-assessment.md` - Code assessment with coverage
5. `[index]-architecture.md` - Architecture design (complex features)
6. `[index]-design-spec.md` - UI/UX design (UI features)
7. `[index]-specification.md` - Technical specification
8. `[index]-implementation-plan.md` - Implementation plan
9. `[index]-task-list.md` - Detailed task list
10. `[index]-implementation-summary.md` - Final summary

## License

MIT

## Credits

- super-dev-plugin - Coordinator-driven development workflow
- everything-claude-code - Additional agents, commands, skills, rules, and configurations
