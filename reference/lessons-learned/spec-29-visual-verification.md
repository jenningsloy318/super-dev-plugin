# Lessons Learned — Spec-29 Visual Verification

> Reference document. Cited by `agents/team-lead.md`, `agents/visual-verifier.md`,
> `agents/prototype-runner.md`, `reference/workflow/pivot-protocol.md`, and
> `skills/super-dev/SKILL.md`. The plugin's spec-29-driven additions
> (Stage 6.5, Step 9.4, pivot-protocol, AC-coverage handoff section) all
> exist to prevent the failure modes documented here.

## Background

A real spec ("woo-dock spec-29 fix-wayland-scale") proposed a custom
DPR-aware icon pipeline using `findContentBounds + 92%-fill` as the
mechanism to keep dock icons consistently sized at HiDPI. The spec was
internally consistent, passed all 13 workflow stages including code review
and adversarial review, and shipped 5 implementation phases with all unit
tests green. **Then it was visually broken when run on the target
compositor.** Three ad-hoc pivots inside one branch were required to land
the working solution (which turned out to be the upstream sister project's
already-published pattern, found late).

This document distills what failed, why every check missed it, and what
the plugin now does to prevent recurrence.

---

## §five-failure-modes

Five universal failure modes for visual code (apply to UI, web, mobile,
games, custom-painted graphics):

1. **Plausible-but-wrong domain assumption.** Spec assumed SVG alpha = visible
   glyph boundary. Real SVGs have alpha bleed (gradients, anti-aliasing,
   drop-shadows, outer-shape definitions) reaching the canvas edges, defeating
   the spec's algorithm. Not catchable from the spec alone — only from running
   the algorithm against representative real icons.

2. **Numeric design constants shipped untested against real input.** The
   92% rule and `kAlphaThreshold = 25` were chosen by reasoning, never
   tested on the real SVG icons users actually have installed.

3. **Framework abstraction not honored.** Qt 6.8 doesn't honor
   `wp_fractional_scale_v1` for layer-shell surfaces on wlroots — fractional
   scale 1.2 gets rounded by Qt to integer DPR=2. The threaded `targetDpr`
   parameter was getting fed the wrong value.

4. **Event/signal not delivered as documented.** `QEvent::DevicePixelRatioChange`
   not reliably fired on wlroots layer-shell surfaces. We had to add
   `QScreen::geometryChanged` as the actual primary trigger.

5. **Default values look fine in design tool, fail with real content.**
   Background alpha 0.35 → indicator dots invisible against busy wallpapers.
   The value was reasonable in isolation, broken in production environments.

These failure modes generalize: any visual system has analogues. CSS `vh`
on iOS Safari, `resize` on cross-origin iframes, `width: 100%` on flex
items, custom virtual scrollers reimplementing IntersectionObserver — same
shape of bug.

---

## §five-tier-ladder

Five-tier verification ladder, lowest cost first. Pick the highest-tier
feasible for the change; document why if escalating beyond Tier 1.

1. **Pixel/DOM property assertions in unit tests** (cheapest, deterministic, in CI).
   - Qt: `QImage` byte sampling, opaque-pixel counting, bbox checks.
   - Web: `getBoundingClientRect()`, `getComputedStyle()`, `getContext('2d').getImageData()`.
   - SwiftUI: `view.snapshot()` + `XCImage` byte sampling.
   - Compose: `composeRule.captureToImage().asAndroidBitmap()` + opaque-ratio.
   - WPF: `RenderTargetBitmap` byte sampling.

2. **Render-only harness binary** — small program that exercises the
   pipeline and dumps a PNG. No display server, no compositor, no E2E
   infrastructure. AI agents read PNGs via the `Read` tool.

3. **Headless compositor / browser screenshot** — real binary, real env,
   no display. `sway --headless` + `grim` for desktop, Playwright headless
   for web, `xcrun simctl io booted screenshot` for iOS, `adb shell screencap`
   for Android.

4. **Golden-image regression** — committed reference images, perceptual
   diff per PR. Standard pattern in KDE/Plasma, Storybook+Chromatic, Percy,
   Reg-Suit, Playwright `toHaveScreenshot()`.

5. **Real-data, real-environment matrix** — what humans currently do.
   Cannot be fully automated; scope shrinks dramatically when 1-4 catch
   most regressions.

The plugin's `agents/visual-verifier.md` formalizes the choice between
Tiers 1/2/3 per phase. Tiers 4/5 are out of scope for now.

---

## §three-disciplines

Three disciplines that the workflow now enforces. These transcend tools
and frameworks; they are the actual lessons.

### A. Empirical-first design

**Before committing to a design with numeric constants (thresholds, ratios,
sizes, alpha values, percentages), run 5-10 representative real inputs
through a 30-line prototype.** If a constant arrived from reasoning alone,
you're about to ship a bug.

For spec-29: a 30-line script feeding 5 real SVG icons through `findContentBounds`
would have surfaced "all icons report 256×256 content" in 10 minutes.
Reasoning alone produced a wrong constant.

The plugin's enforcement:
- **Stage 6.5 (`agents/prototype-runner.md`)** — when team-lead detects
  numeric design constants in `05-architecture.md` or `06-specification.md`,
  it spawns prototype-runner BEFORE Stage 7 spec writing. The prototype
  measures actual outcomes against representative real input and reports
  measured-vs-spec deltas. On FAIL, recommends pivot-protocol.
- **`scripts/gates/gate-prototype.sh`** — verifies the report has
  Constants / Measurement Results / Verdict / Recommendation sections.

### B. Visual verification at every phase boundary

**Each implementation phase produces a screenshot/PNG/snapshot as a
deliverable artifact, not as a follow-up.** Reviewer approval requires
inspecting that artifact, not just the diff. No phase is "complete" without
the artifact; no review verdict is valid without reading it.

For spec-29: stages 9 and 10 verified "implementation matches spec" but
never verified "spec matches reality." The first reality-check was manual
user testing AFTER merge.

The plugin's enforcement:
- **Step 9.4 (`agents/visual-verifier.md`)** — runs after impl-summary-writer
  and before qa-agent. Detects visual scope from the implementation summary's
  changed-files list, picks Tier 1/2/3, writes artifacts to
  `{spec_directory}/artifacts/`. Non-visual phases drop a `.non-visual`
  marker and skip cleanly.
- **`scripts/gates/gate-visual.sh`** — verifies artifacts (or skip marker)
  exist + visual-report.md + tier choice + reviewer instructions.
- **Domain agents** (frontend, ios, android, macos, windows, dev-executor)
  each carry a `<process name="Visual Verification">` block referencing
  Tier 1/2/3 cookbook examples for their platform.
- **Stage 10 reviewer prompts** require code-reviewer and adversarial-reviewer
  to `Read` each artifact before issuing verdict — verdicts without artifact
  inspection are invalid.

### C. Plan-vs-actual reconciliation

**When implementation reveals the spec design is wrong, that pivot is a
deliberate, documented decision — not an ad-hoc inline edit.** The final
handoff documents what shipped vs. what was planned, with explicit
"superseded" markers on docs that no longer reflect reality.

For spec-29: three pivots happened inline in one branch. Final state
required manual reconciliation between original spec and shipped code.
Future maintainers reading the spec dir would have been misled by the
historical docs that looked authoritative.

The plugin's enforcement:
- **`reference/workflow/pivot-protocol.md`** — formal procedure: pause
  iteration, capture diagnostics, research-agent in pivot mode, mandatory
  AskUserQuestion confirmation, spec redraft with `-rN.md` suffix,
  historical banners on originals, resumed Stage 9 with reset iteration.
- **`reference/workflow/implementation-iteration-loop.md` Pivot branch
  section** — four trigger conditions that switch ordinary iteration to
  pivot-protocol.
- **`agents/handoff-writer.md` Step 2.5** — when iteration.loops > 0 OR
  implementationPhases > 1 OR pivot artifacts present, the handoff MUST
  include `## AC Coverage Assessment` with three subsections:
  ACs met as planned / met by alternative mechanism / superseded.
- **`scripts/gates/gate-handoff.sh`** — enforces the section conditionally.

---

## How to use this document

In agent prompts and skill instructions, link to anchor sections:

- `{plugin_root}/reference/lessons-learned/spec-29-visual-verification.md#five-failure-modes`
- `{plugin_root}/reference/lessons-learned/spec-29-visual-verification.md#five-tier-ladder`
- `{plugin_root}/reference/lessons-learned/spec-29-visual-verification.md#three-disciplines`

When starting a new visual feature spec, ask:

1. Does the spec contain numeric design constants? If yes → Stage 6.5
   prototype-runner will be triggered. (Discipline A)
2. What's the cheapest pixel/DOM assertion that would fail if the design
   were wrong? Write it FIRST. (Discipline B, Tier 1)
3. Is the visual artifact part of every phase's "done" definition?
   (Discipline B)
4. If iteration reveals the spec is wrong, will the protocol catch it?
   (Discipline C, pivot-protocol)

Skipping any of these is the tell that you're about to repeat spec-29.

---

## Source

Original postmortem: stored in the woo-dock project's memory at
`~/.claude/projects/-home-jenningsl-development-personal-wooFoundations-woo-dock/memory/spec-29-plan-vs-actual-postmortem.md`
and the generalized lesson at `~/.claude/memory/visual-development-discipline.md`.

This in-plugin reference is the canonical version for the super-dev
workflow.
