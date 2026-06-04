# 06 — Implementation Plan

5 phases, each independently shippable. Order chosen so foundation (visual-verifier + gate) lands first; domain agents and pivot/handoff layer on top.

---

## Phase 1 — Visual Verification Framework

**Goal:** Land the core `visual-verifier` agent + `gate-visual.sh` + Step 9.4 wiring. Once this exists, future visual specs benefit immediately.

**Domain:** plugin-internal (markdown agents + bash gates)

**Effort:** 1 day

**Tasks:**
- T1.1 — Create `agents/visual-verifier.md` (~150 lines): frontmatter, security-baseline, purpose, process blocks for Tier 1/2/3 selection, output contract (writes PNG/snapshot to `spec_directory/artifacts/`).
- T1.2 — Create `scripts/gates/gate-visual.sh`: checks `artifacts/` for PNG/snapshot files OR `.non-visual` marker; reports per existing gate-lib.sh pattern.
- T1.3 — Update `agents/team-lead.md` Stage 9 flow: insert Step 9.4 (visual-verifier + doc-validator paired spawn) between 9.3 (impl-summary-writer) and 9.5 (qa-agent, was 9.4).
- T1.4 — Update `agents/team-lead.md` Stage 10 spawn prompts: add `artifact_paths` field to code-reviewer + adversarial-reviewer spawn templates; add explicit "Read each artifact" instruction.
- T1.5 — Update `hooks/stage-manifest.json` to include gate-visual entry for Stage 9.4.
- T1.6 — Bump `plugin.json` and `marketplace.json` patch version (e.g., 2.4.37 → 2.4.38).

**Files created:** `agents/visual-verifier.md`, `scripts/gates/gate-visual.sh`
**Files modified:** `agents/team-lead.md`, `hooks/stage-manifest.json`, `plugin.json`, `marketplace.json`

**Verification (BDD):**
- SCENARIO-1, 2, 3, 4, 5, 7, 9
- gate-visual.sh executes and returns expected codes for empty/full/skip-marker spec dirs

**Gate:** `gate-build.sh` passes; manual smoke: spawn visual-verifier in a test invocation against a sample diff.

---

## Phase 2 — Domain Agent Visual Rules

**Goal:** Visual-verification expectation surfaces in every domain agent so they self-comply, not just team-lead.

**Domain:** plugin-internal (markdown agents)

**Effort:** 0.5 day

**Depends on:** Phase 1 (so visual-verifier exists to reference)

**Tasks:**
- T2.1 — Add `<process name="Visual Verification">` block to `agents/frontend-developer.md`. Mention Tier 1 (Vitest + Testing Library `getByRole().getBoundingClientRect`), Tier 2 (Storybook + Playwright component test screenshot), Tier 3 (Playwright headless screenshot).
- T2.2 — Add the same block to `agents/ios-developer.md`. Tier 1: XCTest with `XCUIApplication.snapshot()`, Tier 2: swift-snapshot-testing, Tier 3: simctl screenshot.
- T2.3 — Add to `agents/android-developer.md`. Tier 1: ComposeRule.captureToImage + pixel asserts, Tier 2: Paparazzi, Tier 3: adb screencap.
- T2.4 — Add to `agents/macos-app-developer.md`. Tier 1: NSImage byte sampling, Tier 2: snapshot test, Tier 3: screencapture CLI.
- T2.5 — Add to `agents/windows-app-developer.md`. Tier 1: WPF visual tree assertions, Tier 2: Appium snapshot, Tier 3: PowerShell screencap.
- T2.6 — Add to `agents/dev-executor.md` (fallback) — generic Tier 1/2/3 description.
- T2.7 — Bump plugin version (consolidated patch bump for Phase 2).

**Files modified:** 6 agent files + `plugin.json`, `marketplace.json`

**Verification:** SCENARIO-8 (grep all 6 files for the new section)

**Gate:** `gate-build.sh` passes (no code, just markdown — gate is a sanity scan).

---

## Phase 3 — Empirical Prototype Agent

**Goal:** When a spec contains numeric design constants, prove them against representative real input before code is written.

**Domain:** plugin-internal

**Effort:** 1 day

**Depends on:** Phase 1 (uses same artifact-dir convention)

**Tasks:**
- T3.1 — Create `agents/prototype-runner.md`: spawned with spec excerpts containing constants + 5–10 representative real inputs. Outputs `prototype-report.md` with measured-vs-spec table. Project-type-aware (Qt → tiny Qt app, web → Node script + Playwright, Rust → cargo bin, etc.).
- T3.2 — Create `scripts/gates/gate-prototype.sh`: parses prototype-report.md, checks each measured-vs-spec delta against per-constant tolerance (default 5%, override-able in report). Exit 1 on undocumented over-tolerance deltas.
- T3.3 — Create `reference/prototype-report-template.md`: structure for the report (problem statement, constants under test, sample inputs, measured deltas, accept/reject per constant, recommendation).
- T3.4 — Update `agents/team-lead.md` to add Stage 6.5 conditional: regex-detect constants in `06-specification.md` (matches `\b\d+(\.\d+)?\s*%\b`, `threshold\s*=\s*\d+`, `alpha\s*=\s*0?\.\d+`, etc.). When detected, spawn prototype-runner + doc-validator(gate-prototype) before Stage 7→8 transition completes (so spec can be revised before review). When not detected, mark Stage 6.5 `skipped`.
- T3.5 — Update `hooks/stage-manifest.json` for Stage 6.5.
- T3.6 — Bump plugin version.

**Files created:** `agents/prototype-runner.md`, `scripts/gates/gate-prototype.sh`, `reference/prototype-report-template.md`
**Files modified:** `agents/team-lead.md`, `hooks/stage-manifest.json`, `plugin.json`, `marketplace.json`

**Verification:** SCENARIO-10, 11, 12, 13

**Gate:** `gate-build.sh` passes.

---

## Phase 4 — Pivot Protocol + Plan-vs-Actual Reconciliation

**Goal:** Codify mid-Stage-9 design pivots and ensure final handoff documents what actually shipped (vs. what was planned).

**Domain:** plugin-internal

**Effort:** 0.5 day

**Depends on:** Phase 1 (artifacts feed pivot decision)

**Tasks:**
- T4.1 — Create `reference/workflow/pivot-protocol.md`: trigger conditions (iteration ≥ 2 + design-vs-bug indicator), research-revisit step, spec-redraft via spec-writer with N-revision suffix, mandatory `AskUserQuestion` user confirmation gate, historical-banner insertion mandate, post-pivot resumption.
- T4.2 — Update `reference/workflow/implementation-iteration-loop.md`: add the explicit branch ("design wrong → pivot-protocol") to the loop-decision flowchart.
- T4.3 — Update `agents/handoff-writer.md`: require new section "AC Coverage Assessment" with three categories (met-as-planned / met-by-alternative / superseded).
- T4.4 — Create `scripts/gates/gate-handoff.sh`: conditional gate (runs only when implementationPhases > 1 OR Stage 9 review-iterations > 1) that verifies the AC Coverage Assessment section exists.
- T4.5 — Update `hooks/stage-manifest.json` to wire gate-handoff for Stage 11.
- T4.6 — Update `agents/team-lead.md` to spawn doc-validator(gate-handoff) after handoff-writer completes (when condition matches).
- T4.7 — Bump plugin version.

**Files created:** `reference/workflow/pivot-protocol.md`, `scripts/gates/gate-handoff.sh`
**Files modified:** `reference/workflow/implementation-iteration-loop.md`, `agents/handoff-writer.md`, `agents/team-lead.md`, `hooks/stage-manifest.json`, `plugin.json`, `marketplace.json`

**Verification:** SCENARIO-14, 15, 16, 17, 18, 19

**Gate:** `gate-build.sh` passes.

---

## Phase 5 — Lessons Doc + super-dev Skill Checklist

**Goal:** Make the spec-29 lessons part of the plugin's permanent reference material, and surface the pre-flight checklist at the slash-command level.

**Domain:** plugin-internal

**Effort:** 0.25 day

**Tasks:**
- T5.1 — Create `reference/lessons-learned/spec-29-visual-verification.md`: embed the postmortem with anchor sections (`§five-failure-modes`, `§five-tier-ladder`, `§three-disciplines`). Reference-able from team-lead.md and other agents.
- T5.2 — Update `skills/super-dev/SKILL.md` (or `skills/super-dev/skill.md` — match existing case): add "Before starting visual/UI feature" pre-flight checklist as a `<checklist>` block. Also reference `reference/lessons-learned/spec-29-visual-verification.md` for context.
- T5.3 — Update `agents/team-lead.md` to reference the lessons doc when spawning visual-output specs (Stage 1 setup phase).
- T5.4 — Bump plugin version (final).

**Files created:** `reference/lessons-learned/spec-29-visual-verification.md`
**Files modified:** `skills/super-dev/SKILL.md`, `agents/team-lead.md`, `plugin.json`, `marketplace.json`

**Verification:** SCENARIO-20, 21, 22

**Gate:** `gate-build.sh` passes.

---

## Cross-cutting verification (after all 5 phases)

- SCENARIO-23: existing `specification/01-enhance-research-and-stages/` artifacts still pass all original gates
- SCENARIO-24: a backend-only test spec exercises the workflow end-to-end and produces `.non-visual` markers without spawning prototype-runner

## Effort summary

| Phase | Effort |
|---|---|
| 1 — Visual Verification Framework | 1 day |
| 2 — Domain Agent Visual Rules | 0.5 day |
| 3 — Empirical Prototype Agent | 1 day |
| 4 — Pivot Protocol + Reconciliation | 0.5 day |
| 5 — Lessons Doc + Skill Checklist | 0.25 day |
| **Total** | **3.25 days** |

## Implementation order rationale

1. Phase 1 first — establishes the foundation (visual-verifier + gate-visual + Step 9.4) that subsequent phases reference.
2. Phase 2 next — surfaces the new requirement in domain agents so future implementations self-comply.
3. Phase 3 — empirical prototype is independent of 1+2 but benefits from artifact-dir convention.
4. Phase 4 — pivot protocol is most useful AFTER visual-verifier exists (because pivots are most often triggered by visual gaps).
5. Phase 5 — documentation polish; depends on everything else being in place.

Phases 1–4 must commit and pass build before the next phase begins. Phase 5 can run in parallel with Phase 4 if needed (no shared files).
