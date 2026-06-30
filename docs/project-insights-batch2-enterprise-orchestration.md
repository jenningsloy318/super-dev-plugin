# Deep Insights Distillation — Batch 2: Enterprise & Orchestration

> Generated 2026-06-30 from deep analysis of enterprise, orchestration, and AI meta-pattern projects.  
> Purpose: Identify high-value patterns to enrich the super-dev plugin (complementary to Batch 1's Rust/Desktop focus).

## Projects Analyzed

| Project | Language | Domain | Key Insight Domain |
|---------|----------|--------|-------------------|
| **stock-analysis-plugin** | Python+Agents | Multi-agent orchestration | Wave dependency, async pool, cross-check, scoring |
| **MaCo dashboard** | Go+TS+React | Enterprise SaaS | Error classification, handler patterns, RBAC sync |
| **lib-llm-utilities** | TypeScript | LLM factory | Adapter pattern, credential cascade, Zod validation |
| **claude-skill-artifacts** | Meta/Research | Agent design | 2026 research findings, autoresearch, context-keeper |
| **context-keeper-plugin** | Python | Session persistence | MCP hooks, memory persistence, session continuity |
| **HongHu** | Rust/GPUI | Learning app | GPUI Entity pattern, Enum Router, multi-step flows |
| **jennings-site** | Astro/Bun | Personal site | Bun package manager, Playwright build-time |

---

---

## 1. ORCHESTRATION & MULTI-AGENT PATTERNS (from stock-analysis-plugin)

### Insight 1.1: Wave-Based Dependency with Async Pool > Sync Batches

The stock-analysis plugin uses a **4-wave dependency ordering** (Wave1[5+7+9+13] → Wave2[6+8+10+14] → Wave3[11+12] → Wave4[15]) that's superior to super-dev's purely sequential approach.

**Gap in super-dev**: The current 13-stage workflow is strictly sequential. Within Stage 9 (implementation), phases execute one-by-one. But many phases are actually **independent** — e.g., a backend API handler and a frontend component have no dependency.

**Actionable improvement**:
- Add **phase dependency analysis** to the spec-writer: output a DAG of phase dependencies, not just an ordered list
- Let team-lead spawn parallel domain-specialist agents for independent phases
- Async Pool pattern: as soon as one phase completes, start the next independent phase (don't wait for all in a "batch")

### Insight 1.2: Company-Orchestrator Pattern (Context Window Isolation)

Stock-analysis spawns a `company-orchestrator` per company — each gets its **own context window** for stages 5-15. This prevents context pollution between unrelated analysis subjects.

**Gap in super-dev**: When implementing multi-file features, all Phase 1-N code modifications share one domain-specialist context. By Phase 5, the specialist has a bloated context full of Phase 1's code that's irrelevant.

**Actionable improvement**:
- For features with ≥4 implementation phases, spawn a **phase-orchestrator** per phase (or per 2-3 related phases) instead of reusing one long-running domain-specialist
- Each phase-orchestrator gets a clean context with only the spec, task list, and previous phase's summary (not raw code)

### Insight 1.3: Deterministic Scoring + LLM Adjustment (Hybrid Quality Gates)

The scorer agent runs **Python scripts** (`compute_scores.py`, `cross_check.py`, `calibrate_conviction.py`) for reproducible numeric outputs, then allows ±2.0 LLM adjustment on qualitative dimensions with **cited evidence**.

**Gap in super-dev**: Quality gates are either fully deterministic (shell scripts) or fully LLM-based (reviews). No hybrid path.

**Actionable improvement**:
- Create a `gate-quality-score.py` that produces a numeric quality score from measurable metrics (cyclomatic complexity, test coverage %, unused imports, TODO count, etc.)
- Let code-reviewer adjust the score ±N with cited evidence
- This gives a **reproducible baseline** that's auditable and improvable over time

### Insight 1.4: Cross-Check / Contradiction Detection

The scorer's `cross_check.py` detects contradictions between dimensions (e.g., "overvaluation + wide moat → moat erosion question").

**Gap in super-dev**: The adversarial-reviewer catches issues, but there's no systematic contradiction detection between spec and implementation, between test expectations and code behavior, or between architecture-designer's plan and actual code structure.

**Actionable improvement**:
- Add a **cross-check step** after Stage 10 reviews: compare architecture.md's module boundaries vs actual file tree, spec's API contracts vs actual route definitions, task-list completion vs code coverage
- Make this a script, not an LLM call — structural contradictions are deterministic

---

## 2. ENTERPRISE DEVELOPMENT PATTERNS (from MaCo dashboard)

### Insight 2.1: The 4-File Permission Sync Problem

MaCo requires updating **4 files in sync** when adding a new API permission (auth-service constants, roles, Go middleware, frontend permissions). Missing ANY ONE → 403 errors.

**Gap in super-dev**: The dev-executor and backend-developer agents don't have a "permission checklist" or "multi-file sync" awareness. They'll add the route handler but forget the permission in 3 other places.

**Actionable improvement**:
- Add a **"sync-point detection" heuristic** to the code-assessor: when analyzing a codebase, detect multi-file coupling patterns (RBAC, i18n keys, API schema + client types, DB migration + model)
- Surface these as "mandatory multi-file updates" in the spec-writer's task decomposition
- Add to code-reviewer's checklist: "Does this change touch a sync-point? Are all coupled files updated?"

### Insight 2.2: Error Classification & Recovery Architecture

MaCo's enrichment pipeline has a sophisticated error classification system:
- HTTP status → classified outcome (`http_error_400`, `odata_error_{code}`)
- Retriable vs terminal errors (401 → retry with refresh, 408/5xx → retry, 4xx → terminal)
- Backoff with full-jitter: [250ms, 1s, 4s]
- Every error path produces exactly ONE persistence record (ADR-004)
- Context timeouts: 45s per row (bumped from 30s after discovering budget overlap with inner 35s HTTP deadline)

**Gap in super-dev**: The backend-developer agent has no guidance on error classification patterns. It'll write generic try/catch without distinguishing retriable vs terminal errors.

**Actionable improvement**:
- Add an **error-handling-patterns rule** (like the existing async-correctness rule):
  - Classify every external call's errors: retriable (network glitch) vs terminal (bad input)
  - Require explicit retry budgets with jitter-backoff
  - Require every error path to produce one persistence/observability record
  - Require context timeouts to account for inner operation budgets (don't just set outer = inner)

### Insight 2.3: Handler Pattern Awareness (Dispatch + Wiring)

MaCo's handler patterns reveal a common enterprise structure: Upload → Enrichment → Listing → Detail → Reverse Lookup, with **correlation endpoints** requiring two-pattern systems (one-to-one vs one-to-many).

**Gap in super-dev**: Backend agents lack awareness of common enterprise CRUD+ patterns (standard CRUD + batch operations + enrichment flows + SSE streaming + reverse lookups).

**Actionable improvement**:
- Enhance backend-developer with a **"handler pattern library"** section that covers:
  - Standard CRUD + list with filters/pagination/search
  - Batch upload → async enrichment with SSE progress events
  - Link/correlation patterns (one-to-many, reverse lookup for cross-navigation)
  - Rate-limited iteration with semaphore patterns

### Insight 2.4: Data Fetching Convention Awareness

MaCo has TWO data-fetching patterns: bare `useEffect + fetchWithAuth` (68 sites, the default) vs `useSWR` (3 hooks, only for shared reference data). The convention is **intentional** — SWR is NOT better, just different.

**Gap in super-dev**: The frontend-developer agent tends to recommend "modern" patterns (React Query / SWR everywhere) without checking what the existing codebase actually uses. This creates inconsistency.

**Actionable improvement**:
- Make **"detect existing data-fetching convention"** a mandatory first step in the code-assessor's frontend analysis
- Frontend-developer should receive the convention in its spawn prompt and follow it — not impose a "better" pattern
- Add to spec-writer: when speccing new data fetches, specify WHICH pattern to use and WHY

---

## 3. AI AGENT META-PATTERNS (from claude-skill-artifacts + context-keeper)

### Insight 3.1: The 2026 Research Sources — What Actually Works

From the super-dev-2026-research memory, the most impactful patterns applied:
1. **Persona-based cognitive modes** (from gstack) → forces specific analysis depth
2. **Gotchas sections** (from Anthropic lessons.md) → highest-signal content in any agent
3. **Verification gates** (from Boris + industry) → programmatic checks at every handoff
4. **Autoresearch** (from Karpathy) → auto-improve agent prompts iteratively
5. **Investigation Protocol** (bounded 4-step) → mid-execution diagnosis for unknowns

**Gap in super-dev**: Autoresearch was added as a separate skill but NOT integrated into the main workflow. Agents don't self-improve based on review feedback.

**Actionable improvement**:
- After Stage 10 (code-review) produces recurring feedback patterns (3+ instances of same issue type across runs), automatically trigger an autoresearch loop that:
  1. Identifies the pattern
  2. Generates a new rule (like the existing super-dev-rules/)
  3. Integrates it into the relevant agent's mandatory-rules section
- Track "rule generation triggers" in a simple counter file

### Insight 3.2: Context-Keeper's Hook Architecture (PreCompact + SessionEnd)

The context-keeper plugin uses Claude Code hooks (PreCompact, SessionEnd) to persist memory to nowledge MCP. Key learnings:
- **MCP_AVAILABLE flag pattern**: import at module level, check flag in functions
- **Plugin cache invalidation**: cached scripts don't auto-update from source
- **Separation of concerns**: save_memory.py for compaction summaries, save_thread.py for full session persistence
- **Local MCP doesn't need auth** — simplifies testing

**Gap in super-dev**: The super-dev workflow produces massive amounts of context (specs, reviews, assessments) that's **lost between sessions**. If a user runs super-dev twice on the same feature, the second run has no memory of the first run's decisions.

**Actionable improvement**:
- Add a **post-workflow memory hook**: after Stage 13, persist key decisions (architecture choices, rejected alternatives, review findings, test patterns established) to project memory
- On subsequent runs, the requirements-clarifier should check project memory for prior decisions on the same feature area
- This makes super-dev "learn" from past runs on the same project

### Insight 3.3: The MCP Integration Pattern (mcp-use HttpConnector)

Context-keeper's integration with nowledge shows a clean MCP tool usage pattern:
- find_mcp_config() → handles both `url` and `httpUrl` formats
- Environment variable substitution for headers (`${VAR_NAME}`)
- call_nowledge_tools() → HttpConnector for tool invocation

**Gap in super-dev**: The search-agent already uses MCP tools (Firecrawl, etc.), but there's no pattern for agents to persist their findings to external knowledge bases.

**Actionable improvement**:
- Enable research-agent and code-assessor to optionally persist their findings to nowledge memory (if configured)
- Pattern: check if nowledge MCP is available → if yes, save key findings with labels → subsequent runs can recall prior findings for the same project

---

## 4. CROSS-LANGUAGE PATTERNS (from termusic/Rust, HongHu/GPUI, live-Cap/Rust+GPUI)

### Insight 4.1: Platform-Conditional Compilation Awareness

Both termusic and live-Cap use heavy `#[cfg(...)]` conditional compilation. PR #720 revealed that blocking I/O in async (std::fs in tokio) is a **critical** and common Rust mistake.

**Gap in super-dev**: The rust-developer agent has generic Rust guidance but no awareness of:
- Workspace member interdependencies (termusic has lib, playback, server, tui)
- cfg-gated platform code requiring cross-platform testing
- The Edition 2024 async patterns vs blocking I/O detection

**Actionable improvement**:
- Add workspace-aware analysis to rust-developer: detect workspace members, understand which crates are libraries vs binaries
- Add platform-conditional compilation checklist: when touching platform-specific code, verify the same change is reflected/handled in other platform cfg blocks
- The async-correctness rule is already created — ensure it's deeply integrated into rust-developer's review checklist

### Insight 4.2: GPUI-Specific Patterns (from HongHu + live-Cap)

Both projects use GPUI (Zed's framework) with specific patterns:
- Entity<T> pattern for state management
- `cx.notify()` required after every state update
- Icon fallbacks needed (gpui-component lacks some Lucide icons)
- Enum Router pattern for navigation flows
- `Arc<Mutex<>>` for thread-safe shared buffers

**Gap in super-dev**: No GPUI-aware agent exists. The generic frontend-developer is React-focused.

**Actionable improvement**:
- Since the user works heavily with GPUI, add a **GPUI gotchas section** to the rust-developer agent:
  - Entity<T> lifecycle
  - cx.notify() after every mutation
  - Arc<RwLock<>> for cross-task shared state
  - Never hold locks across .await
  - Use dirs crate for cross-platform paths

### Insight 4.3: Astro/Bun Patterns (from jennings-site)

Personal site uses Astro + Bun with Playwright for build-time rendering.

**Actionable improvement**: Minimal — Astro is well-supported. But note that **bun** is used as package manager, not npm/pnpm. The frontend-developer should detect and respect the project's package manager.

---

## 5. LLM UTILITY PATTERNS IN ENTERPRISE (from lib-llm-utilities)

### Insight 5.1: Adapter Factory + Zod Validation for Multi-Provider LLM

The enterprise LLM library uses:
- **Factory pattern** for multi-provider support (Azure, SAP BTP Playground, SAP AI Core)
- **Zod schemas** for validating environment configurations at startup
- **Context window rolling**: automatically selects the smallest deployment that fits, and rolls messages if they exceed the window
- **Deployment routing**: multiple model deployments sorted by maxTokens, auto-selects cheapest that fits
- **Credential cascade**: tries 4 different xsenv credential resolution patterns with fallback

**Gap in super-dev**: The ai-engineer agent type exists but isn't part of super-dev's domain specialist pool. When users are building LLM features, there's no awareness of enterprise LLM patterns.

**Actionable improvement**:
- Add to the architecture-designer's domain awareness: when the task involves LLM integration, recommend:
  - Adapter/factory pattern for provider abstraction
  - Zod/schema validation for LLM configuration
  - Context window management (rolling, deployment selection)
  - Credential cascade with multiple resolution strategies
  - Token counting with appropriate libraries

### Insight 5.2: SAP/Enterprise Auth Patterns

Enterprise apps have complex auth: XSUAA, OAuth client credentials, certificate-based auth, user-propagation auth. The credential discovery pattern (try multiple xsenv lookups with different selectors) is common.

**Actionable improvement**:
- Add enterprise-auth pattern awareness to backend-developer: when detecting SAP/enterprise context, suggest:
  - Service binding resolution patterns
  - Token refresh with fallback
  - Certificate vs client-secret paths
  - Environment variable precedence chains

---

## 6. UI AUTOMATION & VERIFICATION (from MaCo feedback memories)

### Insight 6.1: Base UI Controls Require Real Events, Not Synthetic Clicks

Critical finding: Base UI (and similar modern headless UI libraries) components **ignore** `HTMLElement.click()`. They need the full pointer event sequence OR keyboard activation.

**Gap in super-dev**: The e2e-runner and visual-verifier agents don't have guidance on handling headless UI component libraries.

**Actionable improvement**:
- Add to e2e-runner's gotchas section:
  - Modern headless UI libraries (Base UI, Radix, Headless UI) ignore synthetic `.click()`
  - Prefer keyboard activation (focus → Space/Enter) for reliable automation
  - Verify component roles before assuming `menuitem` — it might be `option` (listbox)
  - Wide viewport + CDP mouse dispatch can be flaky — prefer keyboard paths

### Insight 6.2: Never Push Before User Confirms Fix Works

The feedback memory explicitly states: never commit/push before user confirms the fix actually works. The AI agent committed a "fix" that was insufficient — the real issue was deeper.

**Gap in super-dev**: The team-lead's Stage 12 requires "user confirmation" before cleanup, but the per-phase commits in Stage 9 happen automatically after gate-build PASS without user verification of actual behavior.

**Actionable improvement**:
- For **bug fix** workflows specifically, add a "manual verification pause" between Stage 9 completion and Stage 10 reviews
- The qa-agent's automated tests may pass while the actual user-facing behavior is still broken
- At minimum, surface a clear message: "Implementation complete — please verify the fix before I proceed to review & merge"

---

## 7. FILTER/PAGINATION PATTERNS (from MaCo dashboard-filters-pagination)

### Insight 7.1: Chained Filtering Architecture

The dashboard implements **chained filtering**: Topic filter applied FIRST, then other filter options are derived from topic-filtered results. This prevents "no results" states in cascading dropdowns.

**Gap in super-dev**: The frontend-developer agent has no guidance on cascading filter architecture.

**Actionable improvement**:
- Add to frontend-developer's implementation patterns:
  - Chained filtering: primary filter → derive secondary filter options from primary results
  - Page reset on filter change (currentPage → 1)
  - Sprint vs. Timeframe mutual exclusivity (general pattern: when two controls are logically exclusive, disable the inactive one visually)
  - Debounced search (300ms standard)
  - Multi-select with search inside dropdown (Popover+Command pattern)

---

## 8. WORKFLOW SAFETY & RESILIENCE (cross-cutting)

### Insight 8.1: Single Writer Rule for Shared State

Stock-analysis enforces: team-lead is the ONLY writer to tracking.json. Sub-agents communicate via return values, never direct file writes to shared state.

**Gap in super-dev**: The worktree approach avoids most conflicts, but if multiple agents modify the same config file or shared module, race conditions can occur.

**Actionable improvement**:
- Make explicit in team-lead's constraints: when spawning parallel agents (future phase-parallelism), ensure they touch **disjoint file sets**
- Add a "conflict detection" check before parallel spawn: parse the task-list phases to verify no shared files

### Insight 8.2: Retry with Exponential Backoff on Agent Failures

Stock-analysis retries up to **10 times** on null agent returns. MaCo retries HTTP calls 3 times with [250ms, 1s, 4s] jitter-backoff.

**Gap in super-dev**: Team-lead's constraint says "max 3 iterations per loop, escalate to user after 3" — but this is for review-fix cycles, not for agent spawn failures.

**Actionable improvement**:
- Add explicit agent spawn retry logic: if domain-specialist returns null (crash), retry 3 times with increasing timeout before marking the phase as failed
- Log each retry with the error reason for debugging

### Insight 8.3: Progressive Result Streaming

Stock-analysis surfaces per-company completion updates so users see real-time progress.

**Gap in super-dev**: Users see nothing between stage transitions. A long Stage 9 (with 5+ phases) feels like a black hole.

**Actionable improvement**:
- After each implementation phase completes, emit a brief progress update visible to the user
- Pattern: "✅ Phase 2/5 (API endpoints) complete — 3 tests passing, 0 failures"

---

## 9. FUND FLOW / DOMAIN-SPECIFIC COVERAGE ANALYSIS (from stock-analysis memory)

### Insight 9.1: Coverage Audit Pattern — Identifying What's Missing

The fund-flow-coverage-analysis memory demonstrates an excellent pattern: systematically audit what's covered vs. what's missing, categorized by priority (High/Medium/Low).

**Actionable improvement for super-dev**:
- Add a similar **"coverage audit" step** to the code-assessor: not just "what patterns exist" but "what's MISSING given the feature requirements"
- This prevents the common failure mode where agents implement what they can see but miss what should exist

### Insight 9.2: Data Source Freshness & Gap Flagging

Stock-analysis recommends emitting a `fund_flow_summary.json` that scores data freshness and flags incomplete analysis.

**Actionable improvement for super-dev**:
- The code-assessor should produce a **"context freshness score"**: how confident is it that its analysis covers the current state? If files were recently modified (git log), if there are uncommitted changes, if dependencies have major version gaps — flag these as "potentially stale context"

---

## PRIORITY RANKING OF IMPROVEMENTS

| # | Insight | Impact | Effort | Priority |
|---|---------|--------|--------|----------|
| 1 | Phase dependency DAG + parallel execution | High | High | P1 |
| 2 | Error classification rule for backend-developer | High | Low | P1 |
| 3 | Multi-file sync-point detection | High | Medium | P1 |
| 4 | Cross-check script (spec vs implementation) | High | Medium | P1 |
| 5 | Post-workflow memory persistence | Medium | Medium | P2 |
| 6 | Chained filtering patterns for frontend-developer | Medium | Low | P2 |
| 7 | Never-push-before-confirm for bug fixes | Medium | Low | P2 |
| 8 | Handler pattern library for backend-developer | Medium | Medium | P2 |
| 9 | Enterprise auth/LLM patterns | Medium | Medium | P2 |
| 10 | Phase-orchestrator for long features | High | High | P2 |
| 11 | GPUI gotchas in rust-developer | Low | Low | P3 |
| 12 | e2e-runner headless UI gotchas | Low | Low | P3 |
| 13 | Autoresearch integration into main workflow | Medium | High | P3 |
| 14 | Hybrid quality scoring (script + LLM adjust) | Medium | High | P3 |
| 15 | Progress streaming per-phase | Low | Low | P3 |

---

## NEXT STEPS

1. **Create new rules**: `error-classification.md`, `multi-file-sync.md`, `cascading-filter-patterns.md`
2. **Enhance existing agents**: backend-developer (error + handler patterns), frontend-developer (filtering + convention detection), code-assessor (sync-point + coverage audit)
3. **Workflow enhancement**: phase DAG support in spec-writer output format
4. **Team-lead enhancement**: parallel phase spawning when DAG allows, progress streaming
5. **New integration**: post-workflow memory hook for cross-session learning
