# Design Plan: Learnings System + Runtime Memory

**Date**: 2026-07-06  
**Version**: Draft 1  
**Status**: Awaiting review  

---

## Overview

Two complementary memory systems for the super-dev pipeline:

| System | Scope | Lifecycle | Purpose |
|--------|-------|-----------|---------|
| **Runtime Memory** (`.knowledge.md`) | Per-spec, per-run | Created Stage 2, grows each stage, complete by Stage 14 | Share structured data between agents within a single workflow run |
| **Learnings** (`~/.claude/plugins/super-dev/learnings/`) | Cross-project, persistent | Accumulated over 100+ runs, scored, decayed | Learn from past runs to improve future performance |

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SINGLE WORKFLOW RUN                              │
│                                                                         │
│  Stage 2 ──► .knowledge.md (append ACs, scenarios)                      │
│  Stage 3 ──► .knowledge.md (append research decisions)                  │
│  Stage 6 ──► .knowledge.md (append architecture, modules)               │
│  Stage 7 ──► .knowledge.md (append phases, file structure)              │
│  Stage 9 ──► .knowledge.md (append impl status, tests)                  │
│  Stage 10 ──► .knowledge.md (append review verdict)                     │
│  Stage 11 ──► .knowledge.md (append test results)                       │
│                                                                         │
│  + Raw journal events logged to learnings/journals/                      │
│                                                                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼ (post Stage 14)
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONSOLIDATION ("Dreaming")                            │
│                                                                         │
│  Read journal → Extract patterns → Graduate → Score → Update index      │
│                                                                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEXT WORKFLOW RUN (any project)                       │
│                                                                         │
│  Read index.json → Load top-5 patterns → Inject hints into prompts      │
│  During run: if symptom matches index → load specific pattern → apply   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Runtime Memory (`.knowledge.md`)

### 1.1 Problem

Current state: each agent gets a prompt listing 5-8 file paths to read. Agents must:
- Open and parse each file independently
- Extract relevant IDs (AC-01, SCENARIO-001) from unstructured markdown
- Context window fills with repetitive boilerplate from multiple docs
- Critical decisions from early stages get lost in later stages' noise

### 1.2 Solution

A single accumulating file (`spec-dir/.knowledge.md`) where each agent appends its structured output after completing work. Later agents read ONE file for full context.

### 1.3 Location

```
{worktree}/docs/specifications/{spec-identifier}/.knowledge.md
```

Git-tracked. Lives alongside the spec docs it summarizes.

### 1.4 Format

Structured markdown with machine-parseable sections:

```markdown
# Runtime Knowledge: {feature_name}
Created: {date}
Spec: {spec-identifier}

---
## Stage 2A: Requirements
<!-- Written by: requirements-clarifier, {timestamp} -->

### Feature
{feature_name} — {type} ({priority})

### Executive Summary
{executive_summary}

### Acceptance Criteria
- AC-01: {description}
- AC-02: {description}
- AC-03: {description}

### Non-Functional Requirements
- Performance: {description}
- Security: {description}

### Open Questions
- {question}

---
## Stage 2B: BDD Scenarios
<!-- Written by: bdd-scenario-writer, {timestamp} -->

### Scenarios ({total_count})
- SCENARIO-001: {title} [AC-01] (high)
  - Given: {given}
  - When: {when}
  - Then: {then}
- SCENARIO-002: {title} [AC-01] (high)
  - Given: {given}
  - When: {when}
  - Then: {then}
- SCENARIO-003: {title} [AC-02] (medium)
  - ...

### Traceability
| AC | Scenarios | Coverage |
|----|-----------|----------|
| AC-01 | SCENARIO-001, SCENARIO-002 | Covered |
| AC-02 | SCENARIO-003 | Covered |

---
## Stage 3: Research
<!-- Written by: research-agent, {timestamp} -->

### Recommended Approach
- Name: {name}
- Summary: {summary}
- Rationale: {rationale}

### Key Libraries/Tools
- {library}: {purpose}

### Decisions Made
- {decision_1}
- {decision_2}

### Open Issues (if any)
- {issue}

---
## Stage 4: Debug Analysis (bug-fix only)
<!-- Written by: debug-analyzer, {timestamp} -->

### Root Cause
{root_cause}

### Reproduction Steps
1. {step}

### Confirmed Hypothesis
- {hypothesis} (confidence: {N}%)

---
## Stage 5: Code Assessment
<!-- Written by: code-assessor, {timestamp} -->

### Patterns Found
- {pattern_1}
- {pattern_2}

### Project Stack
- Language: {language}
- Framework: {framework}
- Test Runner: {test_runner}
- Package Manager: {package_manager}

### Files Assessed: {count}

### Recommendations
- (high) {recommendation}
- (medium) {recommendation}

---
## Stage 6: Architecture / Design
<!-- Written by: {designer_type}, {timestamp} -->

### Modules
- {module_1}: {responsibility}
- {module_2}: {responsibility}

### Interfaces
- {module}.{method}({params}) → {return_type}
- {module}.{method}({params}) → {return_type}

### Data Flow
{description of data flow between modules}

### Has Numeric Constants: {yes/no}
{list if yes}

---
## Stage 7: Specification
<!-- Written by: spec-writer, {timestamp} -->

### Implementation Phases ({phase_count})
- Phase 1: {name} (domain: {domain}, effort: {effort}, depends: none)
- Phase 2: {name} (domain: {domain}, effort: {effort}, depends: Phase 1)
- Phase 3: {name} (domain: {domain}, effort: {effort}, depends: Phase 1)

### File Structure (planned)
- {path}: {purpose}
- {path}: {purpose}

### Testing Strategy
- Unit: {approach}
- Integration: {approach}
- E2E: {approach}

---
## Stage 8: Spec Review
<!-- Written by: spec-reviewer, {timestamp} -->

### Verdict: {APPROVED|REVISIONS NEEDED|REJECTED}
### Dimension Scores
- Completeness: {Pass|Fail}
- Grounding: {Pass|Fail} ({verified}/{total} refs)
- Testability: {Pass|Fail}

### Findings ({count})
- ({severity}) {finding}

---
## Stage 9: Implementation
<!-- Written by: domain-specialist, {timestamp} -->
<!-- Updated per-phase -->

### Phase Status
| Phase | Status | Tests | Files |
|-------|--------|-------|-------|
| 1 | ✅ complete | 12/12 pass | 5 files |
| 2 | ✅ complete | 8/8 pass | 3 files |
| 3 | 🔄 in progress | — | — |

### Build Command
{build_command}

### Key Files Created
- {path}: {purpose}
- {path}: {purpose}

---
## Stage 10: Code Review
<!-- Written by: code-reviewer + adversarial-reviewer, {timestamp} -->

### Code Review
- Verdict: {Approved|Changes Requested}
- Findings: {count} ({severity breakdown})
- Iterations: {N}

### Adversarial Review
- Verdict: {PASS|CONTEST|REJECT}
- Destructive Actions: {none|list}

---
## Stage 11: Integration Testing
<!-- Written by: api-tester + e2e-runner, {timestamp} -->

### API Tests (if backend)
- Verdict: {PASS|FAIL}
- Total: {N}, Passed: {N}, Failed: {N}
- Categories: CRUD({N}), Validation({N}), Auth({N}), Edge({N})
- Endpoints Covered: {N}/{N}

### E2E Tests (if frontend)
- Verdict: {PASS|FAIL}
- Scenarios: {N}/{N} pass
- Browsers: chromium ✓, firefox ✓, webkit ✓
- Performance: {pass|fail}
- Accessibility: {N} critical, {N} serious

### Outer Loop Iterations: {N}
```

### 1.5 Who Writes

Each agent appends its own section. The workflow prompt for every agent includes:

```
After completing your work, APPEND your structured output to
${SPEC_DIRECTORY}/.knowledge.md under a "## Stage {N}: {name}" header.
Include ALL structured data (IDs, decisions, verdicts, file lists).

Before starting, READ ${SPEC_DIRECTORY}/.knowledge.md to understand
what previous stages decided and produced.
```

### 1.6 Who Reads

Every agent from Stage 3 onward reads `.knowledge.md` FIRST before reading individual spec docs. This gives:
- Full context of prior decisions in one file
- All AC-IDs and SCENARIO-IDs readily available
- Implementation status visible to reviewers
- No need to list 8+ file paths in prompts (just one)

### 1.7 Concurrency Handling

For the workflow path: stages are sequential, so no concurrent writes to `.knowledge.md`.

For the skill-based path: paired writers (e.g., code-reviewer + adversarial-reviewer in Stage 10) could both try to append. Solution: the team-lead appends on behalf of parallel agents after they return (not the agents themselves in parallel stages).

### 1.8 Workflow Changes

```javascript
// Before each agent() call, add to prompt:
`Read ${SPEC_DIRECTORY}/.knowledge.md for context from prior stages.\n` +

// After each stage completes, add to next agent's prompt:
`Append your results to ${SPEC_DIRECTORY}/.knowledge.md under ## Stage {N}: {name}.\n` +
```

For parallel stages (Stage 10: code-reviewer + adversarial-reviewer), the workflow script appends on their behalf after both complete.

---

## Part 2: Learnings System (Cross-Run Persistence)

### 2.1 Problem

- Same mistakes repeated across projects (agent stalls, format failures, wrong routing)
- No memory between workflow runs — each run starts from zero knowledge
- No adaptive improvement — timeouts/retries are hardcoded, not data-driven

### 2.2 Solution

Persistent knowledge base stored at user level, scored and indexed, that informs future runs.

### 2.3 Storage Location

```
~/.claude/plugins/super-dev/learnings/
├── index.json                    ← Always loaded (~2KB), maps symptoms → patterns
├── patterns/
│   ├── stall/
│   │   ├── PAT-001.json          ← One pattern per file
│   │   └── PAT-007.json
│   ├── gate-failure/
│   │   ├── PAT-002.json
│   │   └── PAT-005.json
│   ├── agent-routing/
│   │   └── PAT-003.json
│   ├── timeout/
│   │   └── PAT-004.json
│   └── compliance/
│       └── PAT-006.json
├── baselines/
│   └── stage-timings.json        ← Mean/stddev per stage across runs
└── journals/
    ├── run-2026-07-06T12-00.jsonl
    └── ... (last 30 runs)
```

### 2.4 Index Structure

```json
{
  "version": 2,
  "total_patterns": 47,
  "total_runs": 103,
  "last_consolidation": "2026-07-06T12:30:00Z",
  "categories": {
    "stall": { "count": 8, "top_score": 0.95 },
    "gate-failure": { "count": 15, "top_score": 0.88 },
    "agent-routing": { "count": 12, "top_score": 0.82 },
    "timeout": { "count": 7, "top_score": 0.76 },
    "compliance": { "count": 5, "top_score": 0.91 }
  },
  "hot_patterns": [
    { "id": "PAT-001", "score": 0.95, "category": "stall", "stage": 6,
      "summary": "architecture-designer stalls when AC>8",
      "symptoms": ["180s timeout", "stage 6", "architecture-designer"] },
    { "id": "PAT-002", "score": 0.88, "category": "gate-failure", "stage": 2,
      "summary": "BDD gate fails on SCENARIO-ID format",
      "symptoms": ["gate-bdd FAIL", "SCENARIO-ID", "format"] }
  ]
}
```

### 2.5 Pattern File Structure

```json
{
  "id": "PAT-001",
  "category": "stall",
  "stage": 6,
  "score": 0.95,
  "status": "active",
  "summary": "architecture-designer stalls when spec has >8 acceptance criteria",
  "description": "Agent attempts to generate 400+ line doc in single pass, hits 180s timeout before completing Write call",
  "symptoms": ["180s timeout", "stage 6", "architecture-designer", "no output"],
  "mitigation": "Add conciseness constraint: '100-200 lines max, write in ONE pass, skip boilerplate for simple projects'",
  "evidence": {
    "occurrences": 12,
    "distinct_projects": 4,
    "distinct_runs": 8,
    "first_seen": "2026-06-15",
    "last_seen": "2026-07-06",
    "last_run_number": 98
  },
  "scoring": {
    "frequency": 0.9,
    "impact": 1.0,
    "confidence": 0.95,
    "recency": 0.9,
    "effectiveness": 0.85,
    "_runs_since_last": 2
  },
  "applied_in": ["run-2026-07-06T09", "run-2026-07-05T15"],
  "verified_effective": true
}
```

### 2.6 Scoring Formula

```
score = (frequency × 0.3) + (impact × 0.3) + (confidence × 0.2) + (recency × 0.1) + (effectiveness × 0.1)

Where:
  frequency   = min(1, occurrences / (total_runs × 0.1))
  impact      = 0-1 severity (stall/block=1.0, warn=0.5, info=0.2)
  confidence  = min(1, distinct_projects / 3)
  recency     = max(0, 1 - (runs_since_last_triggered / 20))
  effectiveness = post-mitigation success rate (0-1)
```

### 2.7 Lifecycle

```
CANDIDATE → GRADUATED → ACTIVE → DORMANT → PRUNED

Candidate:   First occurrence, not yet graduated
              Stored in journal only (not in patterns/)

Graduated:   Meets threshold (3+ occurrences, 2+ distinct runs)
              Gets own PAT-NNN.json file, appears in index

Active:      Score > 0.3, triggered in last 10 runs
              Injected into agent prompts

Dormant:     Not triggered in 10+ runs (score decays via recency)
              Stays on disk but not injected

Pruned:      Dormant for 50+ runs
              File deleted, removed from index

Disproven:   Mitigation applied but didn't help (effectiveness < 0.2)
              Marked status: "disproven", not injected
```

### 2.8 Graduation Criteria

```
A candidate graduates to a pattern when ALL of:
  - occurrences >= 3 (seen enough times)
  - distinct_runs >= 2 (not just a flaky single run)
  - NOT a one-off environment issue
```

### 2.9 Journal Events (captured per-run)

```jsonl
{"ts":"...","stage":1,"event":"start"}
{"ts":"...","stage":1,"event":"end","duration_ms":4000}
{"ts":"...","stage":2,"event":"gate","gate":"gate-requirements","pass":true,"attempt":1}
{"ts":"...","stage":6,"event":"stall","agent":"architecture-designer","timeout_ms":180000}
{"ts":"...","stage":9,"event":"gate","gate":"gate-build","pass":false,"attempt":1,"error":"type-error"}
{"ts":"...","stage":9,"event":"gate","gate":"gate-build","pass":true,"attempt":2}
{"ts":"...","stage":10,"event":"review","verdict":"Approved","iterations":1}
{"ts":"...","stage":11,"event":"api-test","pass_rate":100,"total":24}
{"ts":"...","stage":14,"event":"merge","sha":"abc123"}
```

### 2.10 Consolidation ("Dreaming")

Runs post-Stage 14. Process:

```
1. Read this run's journal (journals/run-<ts>.jsonl)
2. For each failure/stall/retry event:
   a. Compute symptom fingerprint (stage + agent + error category)
   b. Search index.json hot_patterns by symptoms
   c. If match exists:
      - Increment occurrences
      - Update last_seen, last_run_number
      - Recompute score
   d. If no match:
      - Create candidate in journal metadata
      - If candidate now meets graduation → create PAT-NNN.json
3. For each SUCCESSFUL stage (no retries):
   - If a pattern predicted failure but it didn't happen:
     → Increment effectiveness of the mitigation
4. Apply decay to all patterns (recency score adjustment)
5. Prune: delete patterns with status=dormant for 50+ runs
6. Rebuild index.json (hot_patterns = top-20 by score)
7. Prune old journals (keep last 30)
```

### 2.11 How Learnings Are Used (Next Run)

**At workflow start (Stage 1):**
```javascript
// Load index + top-5 patterns
const learnings = loadIndex(LEARNINGS_ROOT);
const topPatterns = getTopPatterns(LEARNINGS_ROOT, 5);

// Store for injection into later stages
const LEARNING_HINTS = topPatterns.map(p =>
  `[${p.id}] Stage ${p.stage}: ${p.summary} → Mitigation: ${p.mitigation}`
).join('\n');
```

**Before each agent() call:**
```javascript
// Query patterns relevant to THIS stage
const stagePatterns = queryPatterns(LEARNINGS_ROOT, { stage: currentStage, limit: 3 });
const stageHints = stagePatterns.map(p =>
  `⚠️ Known issue: ${p.summary}. Fix: ${p.mitigation}`
).join('\n');

// Add to agent prompt
prompt += `\n\nKnown patterns for this stage:\n${stageHints}`;
```

**When agent encounters an error (reactive lookup):**
```
Agent reads .knowledge.md → sees prior context
Agent encounters error → searches index by symptoms
Agent finds matching pattern → applies mitigation directly
→ Saves 1-2 retry iterations
```

### 2.12 Stage Baselines

```json
// baselines/stage-timings.json
{
  "updated_at": "2026-07-06",
  "run_count": 103,
  "stages": {
    "1": { "mean_ms": 15000, "stddev_ms": 5000, "p95_ms": 25000 },
    "2": { "mean_ms": 45000, "stddev_ms": 12000, "p95_ms": 65000 },
    "6": { "mean_ms": 60000, "stddev_ms": 30000, "p95_ms": 120000 },
    "9": { "mean_ms": 180000, "stddev_ms": 60000, "p95_ms": 300000 },
    "10": { "mean_ms": 90000, "stddev_ms": 30000, "p95_ms": 150000 }
  },
  "gate_pass_rates": {
    "gate-requirements": 0.95,
    "gate-bdd": 0.85,
    "gate-spec-review": 0.75,
    "gate-build": 0.70,
    "gate-review": 0.90
  }
}
```

---

## Part 3: File Concurrency Lock

### 3.1 Problem

In the workflow path, most stages are sequential. But:
- Stage 10: code-reviewer + adversarial-reviewer run in parallel (both may try to append to `.knowledge.md`)
- Stage 9: multiple phases may overlap if parallelized in future
- Skill-based path: team-lead may spawn parallel agents

### 3.2 Solution

Lightweight advisory lock using mkdir atomicity + atomic rename for writes.

### 3.3 Implementation

```
scripts/lib/file-lock.mjs

Exports:
  withFileLock(targetPath, fn, opts)  — acquire lock, run fn, release
  atomicWrite(targetPath, content)     — tmp + rename (no partial reads)
  atomicAppend(targetPath, content)    — lock + read + append + atomic write
```

### 3.4 Lock Protocol

```
1. ACQUIRE: mkdir(target.lock/)
   - Atomic on all platforms (POSIX, Windows)
   - Write owner file inside: {pid}:{timestamp}
   - If EEXIST: check stale (mtime > 30s → break + retry)
   - If timeout (5s): fail-open (proceed without lock, log warning)

2. OPERATION: perform the file read/write

3. RELEASE: rmdir(target.lock/) in finally block
   - Always release even on error
   - Stale detection handles crash case (process dies before release)
```

### 3.5 Atomic Write Pattern

```
1. Write content to: target.{pid}.{random}.tmp
2. rename(tmp → target)  ← atomic on POSIX
3. Readers always see complete old or complete new content, never partial
```

### 3.6 Atomic Append Pattern (for .knowledge.md)

```
1. Acquire lock on target file
2. Read existing content
3. Append new section
4. Atomic write full content (tmp + rename)
5. Release lock
```

### 3.7 Integration with .knowledge.md

```javascript
import { atomicAppend } from './lib/file-lock.mjs';

// Each agent's append operation uses:
await atomicAppend(
  `${SPEC_DIRECTORY}/.knowledge.md`,
  `\n---\n## Stage ${N}: ${name}\n<!-- Written by: ${agent}, ${timestamp} -->\n\n${content}\n`
);
```

### 3.8 Performance

| Operation | Expected Time | Meets <10ms? |
|-----------|---------------|--------------|
| mkdir lock acquire | 0.01ms | ✅ |
| Read existing .knowledge.md (50KB) | 0.5ms | ✅ |
| Write temp + rename | 0.5ms | ✅ |
| rmdir release | 0.01ms | ✅ |
| **Total atomic append** | **~1ms** | ✅ |

---

## Part 4: Implementation Plan

### Phase A: File Lock Library (foundation)
- [ ] Create `scripts/lib/file-lock.mjs`
- [ ] Test: concurrent access simulation
- [ ] Commit

### Phase B: Runtime Memory (.knowledge.md)
- [ ] Create `.knowledge.md` template/header logic in workflow
- [ ] Add append instructions to each stage's agent prompt
- [ ] Add "Read .knowledge.md first" to each stage's agent prompt
- [ ] Handle parallel stages (Stage 10: workflow appends on behalf)
- [ ] Test: run workflow, verify .knowledge.md accumulates correctly
- [ ] Commit

### Phase C: Learnings Library
- [ ] Create `scripts/lib/learnings.mjs` (index, patterns, scoring, query)
- [ ] Create `scripts/utils/consolidate-run.mjs` (dreaming script)
- [ ] Test: simulate 5 runs, verify graduation + scoring
- [ ] Commit

### Phase D: Workflow Integration
- [ ] Wire learnings into workflow start (load top-5, inject hints)
- [ ] Wire journal capture (emit events at each stage boundary)
- [ ] Wire consolidation post-Stage 14
- [ ] Wire reactive lookup (query patterns when gate fails)
- [ ] Test: end-to-end with real workflow
- [ ] Commit

### Phase E: Skill-Based Path
- [ ] Update `skills/super-dev/SKILL.md` with .knowledge.md instructions
- [ ] Update `agents/team-lead.md` with learnings injection
- [ ] Commit

---

## Part 5: Key Decisions (Resolved)

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Who appends .knowledge.md? | **C: Hybrid** — workflow.js centrally appends; skill path team-lead appends (not sub-agents) + gate checks completeness | Prose instructions to sub-agents are unreliable (same failure mode as team-lead skipping stages). Centralized writer = deterministic. |
| 2 | When does consolidation run? | **Fire-and-forget** — non-blocking, journal persists on disk regardless | Pipeline results already delivered to user. If reflection fails, journal stays at `~/.claude/plugins/super-dev/learnings/journals/`. Can rerun later or next run catches it. System works without it. |
| 3 | How does .knowledge.md reach agents? | **C: upstreamStructured()** — workflow.js injects precise fields directly into prompt. Agent never reads files. | No "please Read this file" (unreliable). No full 50KB dump (wasteful). Workflow extracts exact AC texts, scenario IDs, phase names, module interfaces from structured return values and formats them into the prompt. |

### Design Implications of These Decisions

**Decision 1 → No agent self-append**:
```
BEFORE (rejected): Agent prompt says "append to .knowledge.md" → agent may forget
AFTER (chosen):    Workflow.js does atomicAppend() after agent() returns → deterministic

For skill-based path: team-lead appends after each spawn returns (not the sub-agent).
Gate: .knowledge.md section count must match completed stages (gate-knowledge check).
```

**Decision 2 → Consolidation is best-effort**:
```
post-Stage 14:
  try { await consolidateRun(journalPath) }
  catch { log('Consolidation failed — journal preserved for next run') }

Journal ALWAYS written (append-only during run).
Consolidation ATTEMPTS to graduate patterns.
Failure = next run still works, just without latest learnings.
```

**Decision 3 → upstreamStructured() function**:
```javascript
// The workflow.js keeps structured objects from each stage:
//   req = { ac_count, feature_name, ... }
//   bdd = { scenario_count, ... }
//   spec = { phases: [...], ... }
//   design = { modules: [...], ... }

// Before each agent() call, inject only what that stage needs:
function upstreamStructured(stage) {
  let ctx = '';
  if (stage >= 3)  ctx += `\nAcceptance Criteria:\n${req.acceptance_criteria.map(ac => `- ${ac.id}: ${ac.desc}`).join('\n')}`;
  if (stage >= 3)  ctx += `\nScenarios: ${bdd.scenario_count} (${bdd.scenarios.map(s => s.id).join(', ')})`;
  if (stage >= 7)  ctx += `\nModules: ${design.modules.join(', ')}`;
  if (stage >= 9)  ctx += `\nPhases: ${spec.phases.map(p => `Phase ${p.number}: ${p.name}`).join(', ')}`;
  if (stage >= 10) ctx += `\nImpl Status: ${phaseResults.map(p => `Phase ${p.number}: ${p.status}`).join(', ')}`;
  return ctx;
}

// Agent prompt becomes:
`${stageSpecificInstructions}\n\n--- Upstream Context ---\n${upstreamStructured(currentStage)}`
```

**Decision 3 → .knowledge.md still written to disk** (but NOT for agent consumption):
```
Purpose of .knowledge.md file on disk:
  1. Git-tracked audit trail (human review after run)
  2. Skill-based path reference (team-lead can read it)
  3. Rebuild/resume if workflow crashes mid-run
  4. Gate validation (check all stages contributed)

NOT used for: injecting into agent prompts (upstreamStructured() does that)
```

---

## Part 5b: Remaining Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Should .knowledge.md have a max size? | Unbounded / Cap at 100KB / Summarize old sections | Cap at 100KB — if exceeded, summarize Stages 2-5 into a 20-line digest |
| 2 | Should learnings be shared across users? | User-only / Plugin-global (git) / Both | Start user-only; add opt-in git-tracked sharing later |
| 3 | Should consolidation use an LLM or be deterministic? | Pure code / LLM-assisted / Hybrid | Pure code for pattern matching/scoring; LLM only for generating mitigations from novel failures |
| 4 | What if .knowledge.md gets corrupted? | Fail / Rebuild from spec docs / Ignore | Rebuild: re-read spec docs and reconstruct (each doc is source of truth, .knowledge.md is derived) |
| 5 | Should patterns auto-modify agent prompts? | Direct injection / Suggest only / Human gate | Direct injection for score>0.8; suggest-only for 0.5-0.8; ignore below 0.5 |

---

## Part 6: Dual-Path Architecture (Skill-Based vs Workflow)

### 6.1 Two Paths, Same Pipeline

```
/super-dev             → Skill-based (team-lead.md spawns agents in context)
/super-dev-workflow    → Workflow.js (Workflow() tool, isolated JS script)

Both run Stages 1-14. Both need .knowledge.md + learnings.
The LIBRARY is shared. The CALLER differs.
```

### 6.2 Shared Code (both paths use)

```
scripts/lib/
├── file-lock.mjs       ← atomicAppend() for .knowledge.md writes
├── learnings.mjs       ← loadIndex(), queryPatterns(), getTopPatterns()
└── ...

scripts/utils/
└── consolidate-run.mjs ← "dreaming" — runs at end of both paths
```

### 6.3 Differences by Path (Updated with Decisions)

| Concern | Skill-based (team-lead.md) | Workflow (super-dev.workflow.js) |
|---------|---------------------------|----------------------------------|
| **Who creates .knowledge.md** | Team-lead creates at Stage 1 | Workflow script creates at Stage 1 |
| **Who appends** | Team-lead appends after each agent returns (NOT the sub-agent) | Workflow script appends after each `agent()` returns |
| **How agents get upstream context** | Team-lead includes upstream data in spawn prompt (extracted from prior agents' returns) | `upstreamStructured(stage)` injects precise fields into prompt |
| **Parallel stage handling** | Team-lead appends after parallel agents ALL return | Workflow script appends after `parallel()` resolves |
| **Journal capture** | Team-lead calls `appendJournal()` at stage transitions | Workflow script calls at each `phase()` / gate verdict |
| **Learnings injection** | Team-lead reads top-5 at start, includes in every spawn prompt | Workflow script reads at start, injects per `agent()` call |
| **Reactive lookup** | Team-lead queries index after gate FAIL, includes in retry prompt | Workflow script queries after gate FAIL, injects in retry prompt |
| **Consolidation trigger** | Team-lead spawns consolidate-run.mjs (fire-and-forget, non-blocking) | Workflow script calls consolidation (fire-and-forget, try/catch) |

### 6.4 Skill-Based Path — .knowledge.md Instructions

Added to `skills/super-dev/SKILL.md` and `agents/team-lead.md`:

```xml
<constraint name="Runtime Memory (.knowledge.md)">
  At Stage 1: create {spec_directory}/.knowledge.md with header.
  
  Every agent spawn prompt MUST include:
  1. "Read {spec_directory}/.knowledge.md FIRST for context from prior stages."
  2. "After completing your work, APPEND your structured output to
     {spec_directory}/.knowledge.md under ## Stage {N}: {name} header.
     Use atomicAppend: node -e 'import {atomicAppend} from ...' OR
     simply append if you are the only writer at this stage."
  
  For PARALLEL spawns (Stage 10: code-reviewer + adversarial-reviewer):
    Do NOT instruct parallel agents to append. Instead, after BOTH return,
    team-lead appends their combined results in one write.
</constraint>
```

### 6.5 Skill-Based Path — Learnings Instructions

Added to `skills/super-dev/SKILL.md` and `agents/team-lead.md`:

```xml
<constraint name="Learnings Integration">
  At Stage 1 (after worktree setup):
  1. Run: node {plugin_root}/scripts/lib/learnings.mjs --top=5
     (or equivalent: load index.json from ~/.claude/plugins/super-dev/learnings/)
  2. Store top-5 patterns as LEARNING_HINTS variable.
  3. Include LEARNING_HINTS in EVERY agent spawn prompt as:
     "Known issues from prior runs:\n{LEARNING_HINTS}"

  At each gate FAIL:
  1. Query learnings index by stage + error category.
  2. If match found: include mitigation in retry prompt.
  
  At Stage 14 (after merge):
  1. Spawn general-purpose agent to run:
     node {plugin_root}/scripts/utils/consolidate-run.mjs {journal_path}
  2. This extracts patterns from this run and updates the learnings store.
</constraint>
```

### 6.6 Workflow Path — Code Integration Points

```javascript
// ─── WORKFLOW START (after Stage 1 setup) ───
const LEARNINGS_ROOT = join(PLUGIN_ROOT, 'learnings');
const topPatterns = getTopPatterns(LEARNINGS_ROOT, 5);
const LEARNING_HINTS = topPatterns.length > 0
  ? '\nKnown issues from prior runs:\n' +
    topPatterns.map(p => `⚠️ [${p.id}] Stage ${p.stage}: ${p.summary} → Fix: ${p.mitigation}`).join('\n')
  : '';

// Create .knowledge.md
const knowledgePath = `${SPEC_DIRECTORY}/.knowledge.md`;
atomicWrite(knowledgePath, `# Runtime Knowledge: ${REQUEST.slice(0,60)}\nCreated: ${new Date().toISOString()}\n`);

// ─── BEFORE EACH agent() CALL ───
const prompt = `Read ${knowledgePath} for context from prior stages.\n` +
  LEARNING_HINTS + '\n\n' +
  stageSpecificPrompt;

// ─── AFTER EACH agent() RETURNS ───
atomicAppend(knowledgePath, formatKnowledgeSection(stage, agentType, result));

// ─── ON GATE FAIL (reactive lookup) ───
const failPatterns = queryPatterns(LEARNINGS_ROOT, { stage: currentStage, category: 'gate-failure' });
const retryHint = failPatterns.length > 0
  ? `\nKnown fix for this failure: ${failPatterns[0].mitigation}`
  : '';

// ─── JOURNAL CAPTURE (at each stage boundary) ───
appendJournal(LEARNINGS_ROOT, RUN_ID, { stage, event: 'end', duration_ms, verdict });

// ─── POST STAGE 14 (consolidation) ───
await agent(`Run: node ${PLUGIN_ROOT}/scripts/utils/consolidate-run.mjs ...`);
```

### 6.7 Implementation Order

```
Phase A: file-lock.mjs          ← both paths use
Phase B: .knowledge.md logic    ← implement in workflow.js FIRST (deterministic, testable)
Phase C: learnings.mjs          ← both paths use
Phase D: consolidate-run.mjs    ← both paths use
Phase E: Wire into workflow.js  ← all integration points
Phase F: Wire into SKILL.md + team-lead.md  ← instructions for skill-based path
```

Workflow.js is implemented FIRST because:
- Deterministic (JS code, not LLM interpretation of instructions)
- Testable (can verify .knowledge.md grows correctly)
- Then SKILL.md just mirrors the same behavior via prose instructions
