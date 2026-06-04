# 01 — Requirements: Visual Verification + Empirical Prototype + Pivot Protocol

## Summary

Add three workflow capabilities to the super-dev plugin so that visual-output specs (UI, dock, web frontend, mobile UI, custom-painted graphics) cannot ship reviewer-approved-but-visually-broken code. Lessons distilled from spec-29 (woo-dock fix-wayland-scale): a custom `findContentBounds + 92%-fill` icon pipeline passed all stage gates and code review, then failed visually on the target compositor — only manual user testing caught the design flaw.

**Out of scope:** "upstream-first scan in Stage 3" (explicitly dropped by user — research-agent stays as-is for this spec).

## Background — three failure modes spec-29 exposed

1. **Plausible-but-wrong domain assumption shipped.** Spec assumed SVG alpha = visible glyph boundary. Real SVGs have alpha bleed (gradients, anti-aliasing, drop-shadows) reaching the canvas edges, defeating the spec's algorithm. Caught only by visually running the dock.
2. **Numeric design constants shipped untested against real input.** The 92% rule and threshold 25 were chosen by reasoning, never tested on representative real icons.
3. **Design-vs-implementation pivot happened ad-hoc.** When live testing revealed the design was wrong, three iterations of pivot happened inside one branch with no protocol; final state required a manual "AC superseded vs met" reconciliation.

The current 13-stage workflow verifies "implementation matches plan" (build, unit tests, code review, adversarial review). It does not verify "plan matches reality."

## Acceptance Criteria

### Visual verification (Updates 3, 6)

**AC-1 — `visual-verifier` agent exists.** A new agent at `agents/visual-verifier.md` with documented input/output contracts.

**AC-2 — `gate-visual.sh` exists.** A new gate script at `scripts/gates/gate-visual.sh` that verifies render-artifact files exist for visual-output phases. Returns exit 0 (PASS) when artifacts exist, exit 1 (FAIL) when missing, or exit 0 with a `SKIPPED` marker when the spec is non-visual.

**AC-3 — Step 9.4 wired in `team-lead.md`.** Implementation flow updated to: 9.1 tdd-guide → 9.2 domain specialist → 9.3 impl-summary-writer → **9.4 visual-verifier (NEW)** → 9.5 qa-agent → 9.6 e2e-runner (Web/UI). Stage 9 phase-complete requires visual-verifier output.

**AC-4 — Render artifact tier ladder documented.** visual-verifier prompt enumerates Tier 1 (pixel/DOM property assertions in unit tests), Tier 2 (render harness binary), Tier 3 (headless compositor screenshot). Selects highest-feasible tier based on project type (auto-detected from CMakeLists.txt / package.json / Cargo.toml / Package.swift / build.gradle).

**AC-5 — Visual-output detection.** visual-verifier identifies if the phase touches rendering by inspecting changed files matched against domain-specific globs (`*.tsx`, `*.swift`, `*.kt`, `view/*`, `*.qml`, `*.fxml`, etc.). If non-visual, emits a `SKIPPED — non-visual phase` artifact and exits PASS.

**AC-6 — Domain-agent visual rules.** Each of `agents/{frontend-developer,ios-developer,android-developer,macos-app-developer,windows-app-developer}.md` has a new mandatory `<process name="Visual Verification">` section requiring render-artifact production before declaring a phase complete. dev-executor (fallback) carries the same rule.

**AC-7 — Stage 10 reviewer prompt update.** code-reviewer + adversarial-reviewer spawn prompts in `team-lead.md` MUST include a list of artifact paths AND instruct reviewers to `Read` each artifact as part of review. Verdicts issued without artifact inspection are invalid.

### Empirical prototype (Update 2)

**AC-8 — `prototype-runner` agent exists.** A new agent at `agents/prototype-runner.md` that executes a small Qt/Node/Python/Swift program implementing the spec's design constants against 5–10 representative real input samples and reports measured-vs-spec deltas.

**AC-9 — `gate-prototype.sh` exists.** A new gate script verifying the prototype-report.md exists and shows measured values within tolerance of spec constants OR documents an accepted delta with rationale.

**AC-10 — Stage 6.5 conditional spawn.** team-lead.md detects design constants in `05-architecture.md` or `06-specification.md` (regex-style detection: numeric thresholds, ratios, percentages, alphas, sizes). When ≥1 constant found, spawn prototype-runner before Stage 9 begins. Skip silently otherwise.

### Pivot protocol (Update 4)

**AC-11 — `pivot-protocol.md` exists.** A new file at `reference/workflow/pivot-protocol.md` documenting the mid-Stage-9 pivot decision tree (when iteration ≥ 2 AND failures indicate spec design is wrong).

**AC-12 — Pivot trigger encoded in iteration loop.** `reference/workflow/implementation-iteration-loop.md` updated with explicit branch: "If failures indicate spec design is fundamentally wrong → invoke pivot-protocol; otherwise → continue tdd → dev cycle."

**AC-13 — Pivot requires user confirmation.** Per protocol, pivot path requires `AskUserQuestion` checkpoint between research-agent revision and spec-writer redraft.

**AC-14 — Historical doc preservation.** Pivot protocol mandates: superseded specs get a "HISTORICAL — superseded by Nth revision" banner inserted at top; revised specs get N-revision suffix.

### Plan-vs-actual reconciliation (Update 5)

**AC-15 — Handoff requires AC coverage table.** `agents/handoff-writer.md` updated to require a section "AC Coverage Assessment" with three categories: ACs met as planned, ACs met by alternative mechanism, ACs superseded.

**AC-16 — `gate-handoff.sh` (NEW) verifies the table.** Runs after handoff-writer; verifies the AC Coverage Assessment section exists when implementationPhases > 1 OR Stage 9 had > 1 review iteration (i.e., a pivot occurred).

### Lessons doc + skill (Updates 7, 8)

**AC-17 — Lessons doc embedded in plugin.** `reference/lessons-learned/spec-29-visual-verification.md` exists, contains the spec-29 postmortem with quote-able anchor sections (`§five-failure-modes`, `§five-tier-ladder`, `§three-disciplines`).

**AC-18 — `super-dev:super-dev` skill checklist update.** `skills/super-dev/SKILL.md` (or equivalent) gains a "Before starting visual/UI feature" pre-flight checklist: representative inputs identified, cheapest pixel assertion defined, render-artifact tier chosen, visual artifact in phase-complete definition.

### Cross-cutting

**AC-19 — Plugin version bumped.** `plugin.json` and `marketplace.json` patch version incremented per update phase (5 phases → 5 patch bumps; consolidated to a single minor bump if more sensible).

**AC-20 — All existing gate scripts still pass.** New agents and gates must not break existing workflows; existing specs (`specification/01-enhance-research-and-stages/`) continue to work unchanged.

**AC-21 — Conditional execution preserved for non-visual specs.** Backend-only / library / CLI-only specs SKIP visual-verifier and prototype-runner cleanly with logged justification.

## Non-Functional Requirements

- **No bloat for non-visual specs.** Stage 6.5 and Step 9.4 must skip silently when not applicable. The 13-stage workflow header doesn't change; Stage 6.5 and 9.4 are sub-step additions.
- **Backward compatible.** No existing agent, gate, hook, or skill is renamed or removed. Additions only.
- **Each phase ships independently.** Each of the 5 implementation phases produces a complete, testable, mergeable change.
- **Self-testing.** The plugin's own test/example specs (`specification/01-enhance-research-and-stages`) must still pass any new gates.

## Out of Scope

- **Upstream-first scan in Stage 3** — explicitly dropped per user instruction.
- **Tier 4 golden-image regression infrastructure** — beyond the scope of this spec; a future spec can add `golden-image-diff.sh` and CI integration.
- **Migration of existing in-flight specs** — only future specs benefit from these updates; running specs continue under old rules.

## Constraints / Compatibility

- Plugin uses minijinja-cli for templates and standard bash for gates. New gates follow the existing `gate-lib.sh` shape.
- All agents are markdown with YAML frontmatter; new agents follow existing structure (`<security-baseline>`, `<purpose>`, `<process>` blocks).
- Per CLAUDE.md project rule: every modification to plugin files requires patch version bump in plugin.json and marketplace.json.

## Assumptions

- Project type detection (CMakeLists.txt / package.json / Cargo.toml / Package.swift / build.gradle) is already used elsewhere in the plugin or is straightforward to add.
- Existing `qa-agent` and `e2e-runner` overlap partially with `visual-verifier` but serve different purposes (qa-agent runs full test suite; e2e-runner does end-to-end browser automation; visual-verifier produces a render artifact for human/agent inspection). All three coexist.

## Open Questions

None — design is settled; implementation is mechanical.

## Glossary

- **Render artifact**: a PNG/screenshot/binary-snapshot file produced by visual-verifier, stored in `spec_directory/artifacts/`.
- **Tier 1/2/3**: increasing levels of visual-verification cost and coverage. See AC-4.
- **Pivot**: mid-implementation discovery that spec's design is fundamentally wrong (vs. implementation being buggy). Triggers pivot-protocol.
- **Plan-vs-actual reconciliation**: the AC-coverage table in the final handoff distinguishing ACs met as planned vs. by alternative mechanism vs. superseded.
