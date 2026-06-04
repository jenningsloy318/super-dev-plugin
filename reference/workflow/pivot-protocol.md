# Pivot Protocol — when implementation reveals the spec design is wrong

> Loaded by: team-lead during Stage 9/10 iteration when failures indicate
> the spec's design (not just its implementation) is fundamentally wrong.
> Origin: spec-29 woo-dock postmortem — three ad-hoc pivots happened in one
> branch with no protocol; final state required manual reconciliation. This
> protocol formalizes the recovery so it's controlled, documented, and
> always produces a reviewable artifact.

## When does pivot apply?

Pivot is **NOT** for ordinary bugs (where code doesn't match spec). Pivot is for the situation where the spec is internally consistent but:

- Test data and real data show the algorithm produces wrong results in production cases.
- A foundational assumption in the spec turns out to be false (framework doesn't behave as specified, environment doesn't honor an API as documented, real input doesn't match the assumed shape).
- An architectural decision that looked reasonable on paper has unfixable downsides in implementation (e.g., performance, layout, accessibility).

Heuristic: if iteration 2 of the implementation-iteration-loop (`reference/workflow/implementation-iteration-loop.md`) is producing the same class of failure that iteration 1 produced, AND fixing it requires changing the spec's design constants or algorithm, **pivot**.

## When does pivot NOT apply?

- Spec says X, code does Y, fix code → ordinary iteration loop, not pivot.
- One edge case fails → ordinary iteration loop with edge-case handling.
- Style or naming nit → just fix it.
- Performance regression → ordinary iteration; spec usually has performance ACs that drive the fix.

## Trigger conditions (formal)

ALL of the following must hold:

1. Stage 9 implementation has been attempted at least once (review iteration ≥ 1).
2. Failures in the most recent iteration are NOT reproducible by hand-fixing code while keeping spec unchanged.
3. The fix requires changing one or more of: spec design constants, spec algorithm, spec architectural decisions.
4. Visual-verifier (Step 9.4) has produced render artifacts AND those artifacts confirm a mismatch with spec's expected outcome — OR — Empirical Prototype (Stage 6.5) is being run RETROACTIVELY because the original spec didn't have a prototype.

## Steps

### Step 1 — Pause iteration loop

Team Lead halts the in-progress implementation phase. Mark the phase as `pivot-pending` in `iteration.lastReviewVerdict` of workflow tracking JSON.

### Step 2 — Diagnostic capture

Capture artifacts that demonstrate the design failure:
- Visual-verifier render artifacts that show the bad outcome.
- qa-agent test output showing which assertions fail and why.
- Code review findings noting "implementation faithful to spec, but spec is wrong because X".

These capture the **evidence the spec is wrong**, not "the implementation is wrong".

### Step 3 — Research alternative approach

Spawn `research-agent` in **pivot mode** with these inputs:
- Original spec (`05-architecture.md` and/or `06-specification.md`)
- Diagnostic artifacts from Step 2
- The specific failing assumption(s) — written as bullet points

research-agent's task: find an alternative approach that handles the failing input class. Report back via `02-deep-research-report-pivot.md` (using the existing deep-research-report naming convention).

### Step 4 — User confirmation (MANDATORY)

Team Lead invokes `AskUserQuestion` with three options:
1. **Adopt alternative approach** (per research findings) — proceed to Step 5.
2. **Continue with current spec** — accept the failing edge cases and document as Known Limitations. Proceed back to ordinary iteration loop.
3. **Abandon spec** — close out the worktree without merging; spec was wrong end-to-end.

This step is non-negotiable. Pivot without user confirmation is a process violation — pivots can be expensive (extra implementation work, schedule shift), and that decision belongs to the user.

### Step 5 — Spec redraft

Spawn `spec-writer` to produce a revised spec with name `[XX]-specification-rN.md` (where N = revision count, starting at 2 for the first pivot). The revised spec:
- Documents WHY the original was wrong (link to diagnostic artifacts from Step 2).
- Replaces the failing constants/algorithm/architecture.
- Adjusts ACs that referenced the old mechanism (mark them `SUPERSEDED` and add new ACs referencing the new mechanism).
- Re-runs through Stage 8 (spec-reviewer) to verify the revision is internally consistent.

### Step 6 — Historical banner insertion (MANDATORY)

The original `05-architecture.md`, `06-specification.md`, and any phase summaries written before pivot get a banner inserted at the top:

```
> **HISTORICAL — superseded by Nth-revision specification**
> This document reflects the design as planned BEFORE pivot {N} on
> {date}. The mechanism described here was replaced because {brief reason}.
> See `[XX]-specification-rN.md` for the current authoritative spec and
> `02-deep-research-report-pivot.md` for the rationale.
```

This is critical: future maintainers reading the spec directory must immediately see which docs are authoritative vs. historical. Without banners, the dir misleads.

### Step 7 — Implementation plan + task list re-derivation

Spawn `spec-writer` again to produce revised `[XX]-implementation-plan-rN.md` and `[XX]-task-list-rN.md`. Banner the originals as historical. Update the workflow tracking JSON `implementationPhases` array if phases changed shape.

### Step 8 — Resume Stage 9

Reset `iteration.loops` to 0 (this is a fresh start). Re-spawn tdd-guide for Phase 1 of the revised plan. Resume normal Stage 9 flow.

### Step 9 — Plan-vs-actual reconciliation in handoff (per Phase 5 of this spec)

When Stage 11 handoff-writer runs, the `## AC Coverage Assessment` section MUST list:
- ACs **met as planned** (referencing the revised spec).
- ACs **met by alternative mechanism** (e.g., AC was originally about findContentBounds, met by crystal-dock pattern instead).
- ACs **superseded** (referencing both original and revised spec).

`gate-handoff.sh` enforces this when `iteration.loops > 0` OR `implementationPhases > 1`.

## Anti-patterns

- **Silent spec edit.** Editing `05-architecture.md` or `06-specification.md` in place without producing an `-rN.md` revision is a CRITICAL violation. Future maintainers cannot then trace what changed.
- **Pivoting without diagnostic artifacts.** If you can't show evidence the spec is wrong (vs. the implementation), you don't have grounds to pivot — keep iterating.
- **Pivoting more than twice in one spec.** If pivot 2 doesn't land a workable spec, escalate to user with full diagnostic and pause the entire spec — the problem is bigger than design choice.
- **Skipping Step 4 user confirmation.** Cost decisions are not the agent's to make.

## Why this protocol exists (spec-29 lessons)

Without a pivot protocol:
- Pivots happen ad-hoc inside conversation context.
- Three pivots in spec-29 took ~6 hours total because there was no structured "pause-research-confirm-redraft" cycle.
- Final docs required manual reconciliation between original and final state — no audit trail of WHY changes happened.
- Reviewer agents can't tell which doc is authoritative.

With this protocol:
- Pivots are deliberate, documented decisions.
- Each pivot produces a research report + revised spec + reviewer-readable banner.
- The handoff doc shows the user exactly which ACs ended up met as planned vs. by alternative mechanism vs. superseded.
- Time-to-pivot is bounded by the protocol (no infinite iteration loops).

## See also

- `reference/lessons-learned/spec-29-visual-verification.md` — the postmortem that motivated this protocol
- `reference/workflow/implementation-iteration-loop.md` — the ordinary loop that this protocol branches from
- `agents/visual-verifier.md` — provides the diagnostic artifacts that often trigger pivot
- `agents/prototype-runner.md` — runs at Stage 6.5 and can pre-empt pivots by catching wrong constants before Stage 9
