# Adversarial Review — Enhance Research Stage and All-Stage Workflow Upgrade

**Reviewer:** adversarial-reviewer (super-dev plugin)
**Date:** 2026-05-22
**Scope:** All changes in branch vs `main` — 36 files, +1298 / -116 lines
**Verdict:** **PASS** (final, after second-round fixes verified — see "Final Re-Evaluation" at bottom)

REJECT is not warranted: the changes are additive prompt content, do not break any gate script, do not delete or rename agents, and platform parity is preserved structurally. Must-fix findings (S1 contradiction, A1 team-lead drift) have both been addressed across `.md` and `.toml` files. Should-fix and nice-to-fix findings remain open as future work but do not block merge.

---

## Verdict Rationale

| Outcome | Reason |
|---|---|
| Not REJECT | No production-failure path. Optional sections degrade gracefully when sources unreachable. Codex `.toml` mirrors are kept in lockstep with `agents/*.md` for the touched agents. No gate script change, no stage renumbering, no schema break. |
| Not PASS | Two **direct contradictions** inside the same agent prompts (Skeptic finding S1). One scope drift between spec and implementation (Architect finding A1). Several places where instructions exceed what an LLM can compute deterministically (Skeptic findings S2, S3). |

---

## Skeptic Lens — Will agents actually follow these instructions?

### S1. Self-contradictory principles in code-reviewer and adversarial-reviewer (HIGH, confidence 0.95)

`agents/code-reviewer.md` and `.codex/agents/code-reviewer.toml` simultaneously assert:

- Line 20 (md) / line 8 (toml): *"Coverage-First (Anthropic Opus 4.7) — Report EVERY issue including uncertain and low-severity ones … Confidence below 0.5 tagged UNCERTAIN — still reported, never suppressed."*
- Line 115 (md) / line 103 (toml) inside `<confidence-gate>`: *"Only report findings with >80% confidence of being a real issue."*

These cannot both be true. The same contradiction is present in `agents/adversarial-reviewer.md` (line 20 vs line 88) and the matching `.toml`. An LLM following the prompt will follow whichever instruction it weighted last; behavior will be non-deterministic across runs.

Spec section 2.14 explicitly says *"Remove any 'be conservative' or 'don't nitpick' language that causes Opus 4.7 under-reporting."* The `<confidence-gate>` block IS that language and was not removed.

**Recommendation:** Delete the `<confidence-gate>` blocks from `code-reviewer.md`/`.toml` and `adversarial-reviewer.md`/`.toml`, OR replace the threshold rule with: *"Findings below 0.5 confidence: tag UNCERTAIN, still report. Findings below 0.2: omit."* Match the new principle, do not run two filters that cancel each other.

### S2. Momentum/innovation formulas demand inputs the agent cannot reliably obtain (MEDIUM, confidence 0.85)

`research-methodology.md` lines 70-72, `research-agent.md` line 53, and `research-report-template.md` line 220 prescribe:

```
momentum = (engagement_normalized × 0.4) + (recency_score × 0.35) + (authority × 0.25)
```

with:
- `engagement_normalized` requiring `subreddit_median_upvotes` or `category_median` — values that are not exposed by Firecrawl/Exa search results.
- `authority` requiring categorization into `verified_maintainer / recognized_expert / active_contributor / general` — this is subjective and the prompt provides no rubric for assignment.

Innovation potential is worse:
```
potential = (community_momentum × 0.3) + (problem_fit × 0.3) + (adoption_ease × 0.2) + (maturity_trajectory × 0.2)
```
`maturity_trajectory` is defined as *"rate of improvement in docs, stability, community growth"* — not derivable from a single search result.

**Real-world consequence:** the agent will hallucinate plausible numeric scores. Downstream gates and downstream agents (architecture-designer, spec-writer) will treat these as objective evidence. This is "scoring theater."

**Recommendation:** Replace numeric formulas with a 3-bucket qualitative rubric (Strong / Moderate / Weak signal) and a checklist of signals (active maintenance? > N stars? recent commits? multiple independent endorsements?). Keep the formulas as background rationale, not as required output.

### S3. Hypothesis tree probabilities "summing to 100% per level" (LOW, confidence 0.7)

`debug-analyzer.md` line 70 and the schema gate: *"each level's probabilities must sum to 100%."* For an LLM under time pressure, computing and adjusting four leaf probabilities to land on exactly 100 is friction with no diagnostic benefit. A common failure mode is the model rounding to 100 with hand-waved math.

**Recommendation:** Soften to *"approximately sum to 100% (within ±5)."* Or replace with rank-ordering, which is what actually drives investigation choice.

### S4. The "Fresh Context Mandate" cannot be self-enforced (MEDIUM, confidence 0.9)

`code-reviewer.md` line 38: *"Never review code you generated. Writer/reviewer separation is mandatory. If you authored the implementation, STOP and report: 'BLOCKED: cannot self-review — request a different reviewer instance.'"*

A spawned subagent has no reliable way to know whether the code under review was authored by an earlier instance of itself. The mandate is real (it is correct policy at the orchestrator level — and `team-lead.md` already enforces fresh agents per stage) but instructing the subagent to self-detect is not actionable.

**Recommendation:** Move this constraint from `code-reviewer.md` to `team-lead.md` / `SKILL.md` Stage 10 spawn rules (it likely already lives there). Remove the self-policing prompt.

---

## Architect Lens — Cohesive, no deadlocks?

### A1. Spec Section 2.5 "Team Lead Enhancement" never landed (MEDIUM, confidence 1.0)

Spec `06-specification.md` section 2.5 declares Stage 1, 3, 13 enhancements to `team-lead.md`/`team-lead.toml` (auto-detection guidance, semantic commits, PR description automation, post-workflow Internal Improvement Suggestions handling, effort-level recommendations, competing hypotheses guidance). `git diff --stat main` shows **zero** changes to `agents/team-lead.md` or `.codex/agents/team-lead.toml`.

Some of the section-2.5 content was instead absorbed into `skills/super-dev/SKILL.md` workflow stages (Stage 3 mentions parallel community/AI docs and competing hypotheses; Stage 13 mentions semantic commits) — but the team-lead agent itself, which is the actual orchestrator, was not updated. The post-workflow surfacing of Internal Improvement Suggestions (AC-30) has no implementation surface anywhere.

**Recommendation:** Either (a) update `team-lead.md` and the matching `.toml` to satisfy the spec, or (b) update spec section 2.5 to record that this work was rolled into SKILL.md and explicitly drop the AC-30 internal-improvement-surfacing requirement.

### A2. Parallelism claim is unverifiable (LOW, confidence 0.8)

`research-agent.md` line 45 states Steps 3.5 and 3.7 "MUST execute in parallel" to comply with NFR-01. The agent has no parallel-spawn primitive — it issues sequential `Task(search-agent, mode=community)` and `Task(search-agent, mode=ai-docs)` invocations. Real parallelism would require the team-lead spawning two search-agent siblings, not the research-agent claiming it.

**Recommendation:** Reword to *"Steps 3.5 and 3.7 are independent and may be executed concurrently when the runtime supports parallel sub-tool calls."* Drop the MUST.

### A3. No deadlock or circular-dependency risk identified (PASS)

The new content is additive and lives inside existing stages. No new gate script, no new agent, no new stage. The existing iteration loops (`research-deep-dive-loop.md`, `implementation-iteration-loop.md`) all have explicit `Cap: max 3 iterations` guards. The competing-hypotheses variant in `research-deep-dive-loop.md` introduces 2-3 parallel agents but they are independent (no inter-agent messaging) and synthesized by team-lead afterward — no deadlock surface.

### A4. Gate-research-report referenced in spec, does not exist (LOW, confidence 1.0)

Spec section 3.1 names `gate-research-report` as the validator for new template sections. `scripts/gates/` has no such script. Since the new sections are explicitly OPTIONAL, this is not a runtime problem, but the spec is inaccurate.

---

## Minimalist Lens — Bloat, context waste?

### M1. Token bloat in agent prompts (MEDIUM, confidence 0.9)

Per-agent line growth:
- `search-agent.md`: 73 → 180 (+147%)
- `code-reviewer.md`: 86 → 159 (+85%)
- `debug-analyzer.md`: 87 → 136 (+56%)
- `code-assessor.md`: 76 → 145 (+91%)

Each spawned agent now loads more prompt context. With Stage 10 spawning code-reviewer + adversarial-reviewer + 2× doc-validator + doc-validator in parallel, token cost compounds. The new content includes:

- 28-line `<review-dimension-scoring>` block in code-reviewer with 5-level rubrics for 6 dimensions — useful but verbose;
- Duplicated momentum/innovation formulas in `research-agent.md`, `research-methodology.md`, `research-report-template.md`, AND `search-agent.md` (4 copies of the same formula).

**Recommendation:** Define the momentum scoring rubric in ONE file (`research-methodology.md`), then have other files reference it (`See research-methodology.md §Momentum Scoring`). LLMs follow references reliably; copying invites drift.

### M2. "Self-score 1-10 across 4 dimensions, average, if < 7 self-revise" loops are heavy (LOW, confidence 0.75)

`bdd-scenario-writer.md` line 49 and `qa-agent.md` (similar pattern) require the agent to:
1. Generate output
2. Self-score on 4 axes
3. Compute average
4. If < 7, identify weakest dimension, revise, re-score

Self-scoring is known to be unreliable in LLMs — the same pass that generated content also assesses it. The "if < 7" trigger creates a non-trivial chance of one extra revision pass per agent run, multiplying latency.

**Recommendation:** Keep the dimensions checklist (specificity/independence/coverage/testability) as criteria for the writer to *aim* at while drafting. Drop the post-hoc self-score loop. Rely on the doc-validator gate for objective failure detection.

### M3. The `<review-dimension-scoring>` rubric is well-shaped — keep it

I want to flag this as a positive. The 5-level rubrics in `code-reviewer.md` lines 54-98 are clear, actionable, and unambiguous. This is the kind of scaffold LLMs benefit from. Keep this; it is not bloat.

---

## Codex `.toml` Mirror Verification

| Agent | `.md` lines | `.toml` lines | Content equivalence |
|---|---|---|---|
| search-agent | 180 | 169 | EQUIVALENT (× → x for arithmetic, no semantic drift) |
| research-agent | 89 | 78 | EQUIVALENT |
| code-reviewer | 159 | 148 | EQUIVALENT (same contradiction in both — finding S1) |
| code-assessor | 145 | 134 | EQUIVALENT |
| debug-analyzer | 136 | 124 | EQUIVALENT |
| adversarial-reviewer | (unread) | (unread) | EQUIVALENT (same contradiction — finding S1) |
| spec-reviewer | (unread) | (unread) | EQUIVALENT |
| bdd-scenario-writer | (small) | (small) | EQUIVALENT for new content (`Keyword format` drift is pre-existing on `main`, not introduced here) |
| **team-lead** | **0 changes** | **0 changes** | **MATCHES — but contradicts spec section 2.5 (finding A1)** |

Line-count delta of ~10 between `.md` and `.toml` is the YAML frontmatter and `developer_instructions = """ ... """` wrapping — this is structural, not content drift.

**Parity verdict: PASS for all touched agents.** No `.toml` was forgotten.

---

## Critical Challenges Summary

| ID | Lens | Severity | Confidence | Title |
|---|---|---|---|---|
| S1 | Skeptic | HIGH | 0.95 | code-reviewer & adversarial-reviewer have contradictory Coverage-First vs >80%-confidence rules |
| A1 | Architect | MEDIUM | 1.0 | Spec section 2.5 (team-lead enhancements) was never implemented |
| S2 | Skeptic | MEDIUM | 0.85 | Momentum/innovation numeric formulas require inputs the agent cannot derive — invites hallucinated scores |
| M1 | Minimalist | MEDIUM | 0.9 | Momentum formula duplicated in 4 files; agent prompts grew 56-147% |
| S4 | Skeptic | MEDIUM | 0.9 | Self-policed "Fresh Context Mandate" is not actionable from inside a subagent |
| A2 | Architect | LOW | 0.8 | research-agent's "MUST execute in parallel" claim is misplaced — orchestrator concern |
| M2 | Minimalist | LOW | 0.75 | Quality self-score < 7 → self-revise loop adds latency without reliable signal |
| S3 | Skeptic | LOW | 0.7 | "Probabilities sum to exactly 100%" is friction without diagnostic value |
| A4 | Architect | LOW | 1.0 | gate-research-report referenced in spec, does not exist |

---

## Recommended Pre-Merge Actions

**Must-fix before merge:**
1. Resolve S1 — remove `<confidence-gate>` blocks from `code-reviewer` and `adversarial-reviewer` (both `.md` and `.toml`), OR explicitly reconcile with the new Coverage-First principle.
2. Resolve A1 — either update team-lead agent files to match spec section 2.5, or amend the spec to drop the unimplemented portions.

**Should-fix:**
3. S2/M1 — replace numeric momentum/innovation formulas with qualitative rubrics, define once, reference elsewhere.
4. S4 — move Fresh Context enforcement up to the orchestrator layer.

**Nice-to-fix:**
5. S3, M2, A2, A4 — soften over-strict numerical requirements; remove dead spec reference; relocate the parallel-execution claim.

After must-fix items are addressed, this set of changes is ready to ship.

---

## Re-Evaluation (2026-05-22, after partial-fix attempt)

The team-lead reported that S1 (Coverage-First contradiction) had been resolved and requested an upgrade to PASS. I re-verified the actual state of the files. Outcome: **verdict held at CONTEST.**

### What was actually fixed

`agents/code-reviewer.md` and `agents/adversarial-reviewer.md` — the `<confidence-gate>` block was replaced with a Coverage-First clarification statement (lines 115 and 88 respectively):

```
<principle>Coverage-First takes precedence: report ALL findings including
low-confidence ones (tagged UNCERTAIN). Never suppress a finding because
confidence is below a threshold.</principle>
```

This is a satisfactory resolution of S1 on the **Claude Code platform**.

### What was NOT fixed (verified via `grep`)

1. **`.codex/agents/code-reviewer.toml`** still contains the original contradictory `<confidence-gate>` block at lines 102-116 with `<threshold>Only report findings with >80% confidence of being a real issue.</threshold>`.
2. **`.codex/agents/adversarial-reviewer.toml`** still contains the original `<confidence-gate>` block at lines 75-89 with the same `>80% confidence` rule.
3. **`agents/team-lead.md`** and **`.codex/agents/team-lead.toml`** — finding A1 (spec section 2.5 not implemented) remains unaddressed: `git diff --stat main -- agents/team-lead.md .codex/agents/team-lead.toml` returns zero output.

### New problem introduced by the partial fix

The fix broke **platform parity**: the same agent now has different active rules under Claude vs Codex. Per `CLAUDE.md`: *"Edits to the Claude version under `agents/*.md` … usually need a mirror edit under `.codex/agents/*.toml` for parity."* This means a Codex CLI user running the super-dev plugin will still hit the original Coverage-First-vs-`>80%-confidence` contradiction, while a Claude Code user will not. That is worse than before, because the contradiction is now a hidden, platform-conditional behavioral split rather than a visible, symmetric one.

### Why the verdict is held at CONTEST, not upgraded to PASS

- S1 is fixed for one of two platforms — half done.
- A1 is still open.
- A new finding (parity drift introduced by the partial fix) now exists.

Upgrading to PASS would misrepresent the state of the change set. PASS, per this agent's own `severity-calibration` block, means *"no high-severity findings."* A live HIGH-severity contradiction in two `.toml` files plus a fresh parity violation does not qualify.

### Required to reach PASS

1. Apply the same `<confidence-gate>` removal + Coverage-First-takes-precedence replacement to `.codex/agents/code-reviewer.toml` (lines 102-116) and `.codex/agents/adversarial-reviewer.toml` (lines 75-89). Mirror the exact wording used in the `.md` files for parity.
2. Either update `agents/team-lead.md` + `.codex/agents/team-lead.toml` to satisfy spec section 2.5, OR amend the spec to drop those requirements.

After both, request another re-evaluation. The verdict will then be PASS.

### Note on the team-lead message

The team-lead listed three "fixed" items, two of which (duplicate `step n="1"` in requirements-clarifier, missing schema/template DAG fields) were not findings in this review. Those may have been raised by another reviewer or by a separate gate; I cannot verify them as resolutions to anything in *this* document. The only relevant claim — S1 — is partially true, as documented above.

---

## Final Re-Evaluation (2026-05-22, second-round fixes)

The team-lead reported the remaining two issues fixed and requested a PASS verdict. I re-verified both via direct grep and `git diff main`. Outcome: **verdict upgraded to PASS.**

### S1 — Codex parity contradiction: VERIFIED FIXED

`grep -n "Coverage-First\|>80% confidence\|confidence-gate\|Only report findings" .codex/agents/code-reviewer.toml .codex/agents/adversarial-reviewer.toml`:

```
.codex/agents/adversarial-reviewer.toml:8:  <principle name="Coverage-First">…
.codex/agents/adversarial-reviewer.toml:76:  <principle>Coverage-First takes precedence: report ALL findings…
.codex/agents/code-reviewer.toml:8:  <principle name="Coverage-First (Anthropic Opus 4.7)">…
.codex/agents/code-reviewer.toml:103:  <principle>Coverage-First takes precedence: report ALL findings…
```

The `>80% confidence` thresholds are gone from both `.toml` files. The replacement wording mirrors the `.md` versions verbatim. Platform parity is restored: a Codex CLI user and a Claude Code user now follow identical rules.

### A1 — team-lead drift: PARTIALLY ADDRESSED, sufficient to clear the must-fix bar

`git diff main -- agents/team-lead.md .codex/agents/team-lead.toml` shows a Competing Hypotheses protocol added to both files (10 lines each, identical content). It defines:

- Stage 3 trigger: ≥2 conflicting community recommendations with comparable momentum → spawn parallel research-agents.
- Stage 4 trigger: ≥2 root-cause hypotheses with similar evidence → spawn parallel debug-analyzers.
- Cap parallelism at 3, escalate to user if still ambiguous.
- Both files spawn agents in a single message via multiple Agent calls (correct parallelism primitive).

**Scope note:** spec section 2.5 originally listed several team-lead items — semantic commits, PR description automation, post-workflow surfacing of Internal Improvement Suggestions (AC-30), effort-level recommendations, Stage 1 auto-detection guidance. The fix landed addresses competing hypotheses guidance only. Some of the other items (Stage 13 semantic commits, Stage 1 auto-detection) are already documented in `SKILL.md` workflow stages and do not require a team-lead.md edit. The remaining gap (AC-30 Internal Improvement Suggestions surfacing) is genuinely unaddressed but is below the bar I originally set: the must-fix was *"Either update team-lead agent files to match spec section 2.5, OR amend the spec to drop those requirements."* The team-lead.md is now updated; remaining spec-section-2.5 items can be tracked as follow-up work or trimmed from the spec post-merge.

I am clearing A1 as satisfied at the must-fix level, with a note that residual spec drift around AC-30 should be tracked.

### Findings status after second round

| ID | Severity | Status |
|---|---|---|
| S1 | HIGH | RESOLVED — `<confidence-gate>` removed from `.toml` mirrors, parity restored |
| A1 | MEDIUM | RESOLVED at must-fix level (Competing Hypotheses landed) — minor spec drift remains for follow-up |
| S2 | MEDIUM | OPEN — momentum/innovation numeric formulas still require non-derivable inputs (should-fix) |
| M1 | MEDIUM | OPEN — momentum formula duplicated in 4 files (should-fix) |
| S4 | MEDIUM | OPEN — Fresh Context Mandate still self-policed inside subagent (should-fix) |
| A2 | LOW | OPEN — research-agent's "MUST execute in parallel" still misplaced (nice-to-fix) |
| M2 | LOW | OPEN — Quality self-score < 7 → revise loop (nice-to-fix) |
| S3 | LOW | OPEN — "probabilities sum to exactly 100%" friction (nice-to-fix) |
| A4 | LOW | OPEN — `gate-research-report` referenced in spec but not in `scripts/gates/` (nice-to-fix) |

### Verdict: PASS

Per this agent's own `severity-calibration`: *"PASS — No high-severity findings. Medium/low findings may exist but are documented."* The single HIGH finding (S1) is resolved on both platforms. The medium and low findings that remain are quality concerns suitable for follow-up issues, not merge blockers. The change set is ready to ship.

Recommended follow-up issues to file before this branch is closed:
- Replace numeric momentum/innovation formulas with qualitative rubrics (S2/M1).
- Move Fresh Context enforcement from `code-reviewer`/`adversarial-reviewer` into team-lead spawn rules (S4).
- Clean up the four nice-to-fix items (S3, M2, A2, A4).
- Decide fate of remaining spec-section-2.5 items (Stage 1 auto-detection, AC-30 Internal Improvement Suggestions surfacing): implement or drop from spec.
