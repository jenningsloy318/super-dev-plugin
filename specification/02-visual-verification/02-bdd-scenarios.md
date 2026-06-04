# 02 — BDD Scenarios

## Feature: Visual Verification

### SCENARIO-1: visual-verifier agent file exists and has required structure
Covers: AC-1
Verification: file existence + frontmatter check
- **Given** the plugin repo
- **When** I check `agents/visual-verifier.md`
- **Then** the file exists
- **And** it has YAML frontmatter with `name: visual-verifier`
- **And** it has a `<purpose>` block describing render-artifact production
- **And** it has a `<process>` block enumerating Tier 1/2/3 selection logic

### SCENARIO-2: gate-visual.sh exists and is executable
Covers: AC-2
Verification: shell script test
- **Given** the plugin repo
- **When** I run `test -x scripts/gates/gate-visual.sh`
- **Then** exit code is 0
- **And** running `gate-visual.sh /tmp/empty-spec-dir` exits non-zero (missing artifacts)
- **And** running `gate-visual.sh /path/with/artifacts/` and skip-marker exits 0

### SCENARIO-3: gate-visual.sh handles SKIPPED non-visual phase
Covers: AC-2, AC-5
- **Given** a spec directory with `artifacts/.non-visual` marker file
- **When** I run `gate-visual.sh <spec-dir>`
- **Then** exit code is 0
- **And** stdout contains `SKIPPED — non-visual phase`

### SCENARIO-4: Step 9.4 wired in team-lead.md
Covers: AC-3
- **Given** `agents/team-lead.md`
- **When** I grep for the implementation flow
- **Then** the document mentions Step 9.4 as `visual-verifier` between impl-summary-writer and qa-agent
- **And** the writer-validator paired-spawn list includes `visual-verifier + doc-validator(gate-visual)`

### SCENARIO-5: visual-verifier prompt enumerates Tier 1/2/3
Covers: AC-4
- **Given** `agents/visual-verifier.md`
- **When** I read the `<process>` block
- **Then** the prompt describes Tier 1 (pixel/DOM property assertions), Tier 2 (render harness binary), Tier 3 (headless compositor screenshot)
- **And** each tier has a project-type-detection rule (CMakeLists.txt → Qt/Cpp, package.json → web, Cargo.toml → Rust, etc.)

### SCENARIO-6: visual-output detection works
Covers: AC-5
- **Given** a phase implementation summary listing files changed: `src/view/dock_panel.cc`
- **When** visual-verifier runs
- **Then** it identifies the phase as visual (matches `view/*` glob)
- **And** produces a render artifact

### SCENARIO-7: Non-visual phase skipped cleanly
Covers: AC-5, AC-21
- **Given** a phase implementation summary listing files changed: `src/dbus/launcher_adaptor.cc`
- **When** visual-verifier runs
- **Then** it determines the phase is non-visual (no view/UI globs match)
- **And** writes `artifacts/.non-visual` marker
- **And** exits PASS

### SCENARIO-8: Domain agents have visual rules section
Covers: AC-6
- **Given** each of `agents/{frontend-developer,ios-developer,android-developer,macos-app-developer,windows-app-developer,dev-executor}.md`
- **When** I grep for the visual-verification process
- **Then** a `<process name="Visual Verification">` block exists
- **And** it specifies Tier 1/2/3 produce-render-artifact requirement before phase-complete

### SCENARIO-9: Stage 10 reviewer prompts reference artifacts
Covers: AC-7
- **Given** `agents/team-lead.md` Stage 10 spawn pattern
- **When** I read the code-reviewer + adversarial-reviewer spawn prompt template
- **Then** the prompts include `artifact_paths` field
- **And** include explicit instruction "Read each artifact via the Read tool before issuing verdict"

## Feature: Empirical Prototype

### SCENARIO-10: prototype-runner agent file exists
Covers: AC-8
- **Given** the plugin repo
- **When** I check `agents/prototype-runner.md`
- **Then** the file exists with required frontmatter and process blocks

### SCENARIO-11: gate-prototype.sh exists and validates report
Covers: AC-9
- **Given** a `prototype-report.md` with measured-vs-spec deltas table
- **When** I run `gate-prototype.sh <spec-dir>`
- **Then** exit 0 if all deltas within tolerance OR documented
- **And** exit 1 if undocumented deltas exceed tolerance

### SCENARIO-12: Stage 6.5 spawns when constants detected
Covers: AC-10
- **Given** `06-specification.md` containing the literal `0.92` or `92%` or `threshold = 25` or alpha values
- **When** team-lead processes Stage 6 → Stage 7 transition
- **Then** team-lead spawns prototype-runner before Stage 9
- **And** writes `prototype-report.md` to spec dir

### SCENARIO-13: Stage 6.5 skipped when no constants
Covers: AC-10
- **Given** `06-specification.md` with no numeric design constants
- **When** team-lead processes the transition
- **Then** Stage 6.5 is marked `skipped` in tracking JSON
- **And** workflow proceeds directly to Stage 7

## Feature: Pivot Protocol

### SCENARIO-14: pivot-protocol.md exists
Covers: AC-11
- **Given** the plugin repo
- **When** I check `reference/workflow/pivot-protocol.md`
- **Then** the file exists
- **And** contains decision-tree headings: trigger conditions, research-pivot, spec-redraft, user-confirmation, historical-banner

### SCENARIO-15: Iteration loop references pivot
Covers: AC-12
- **Given** `reference/workflow/implementation-iteration-loop.md`
- **When** I read the loop-decision section
- **Then** it includes a branch: "If failures indicate spec design wrong → invoke pivot-protocol"

### SCENARIO-16: Pivot requires user confirmation
Covers: AC-13
- **Given** pivot-protocol.md
- **When** I read the steps
- **Then** step "user confirmation via AskUserQuestion" is mandatory before spec redraft

### SCENARIO-17: Historical banner mandated
Covers: AC-14
- **Given** pivot-protocol.md
- **When** I read the steps
- **Then** the protocol mandates inserting `**HISTORICAL — superseded by Nth revision**` banner at top of superseded spec docs

## Feature: Plan-vs-Actual Reconciliation

### SCENARIO-18: handoff-writer requires AC table
Covers: AC-15
- **Given** `agents/handoff-writer.md`
- **When** I read the agent's output requirements
- **Then** the prompt requires section "AC Coverage Assessment" with three categories

### SCENARIO-19: gate-handoff.sh verifies the table conditionally
Covers: AC-16
- **Given** a handoff doc and tracking JSON with implementationPhases > 1 OR review-iterations > 1
- **When** gate-handoff.sh runs
- **Then** it checks the AC Coverage Assessment section exists; exit 0 if found, exit 1 if missing
- **Given** a single-phase, single-iteration tracking
- **When** gate-handoff.sh runs
- **Then** it skips the AC-table check (exit 0)

## Feature: Lessons Doc + Skill Update

### SCENARIO-20: lessons-learned doc exists
Covers: AC-17
- **Given** the plugin repo
- **When** I check `reference/lessons-learned/spec-29-visual-verification.md`
- **Then** the file exists
- **And** contains anchor sections: "Five universal failure modes for visual code", "Five-tier verification ladder", "Three universal disciplines"

### SCENARIO-21: super-dev skill checklist updated
Covers: AC-18
- **Given** `skills/super-dev/SKILL.md`
- **When** I read the skill description
- **Then** it includes a "Before starting visual/UI feature" pre-flight checklist with: representative inputs identified, cheapest pixel assertion defined, render-artifact tier chosen, visual artifact in phase-complete definition

## Feature: Cross-cutting

### SCENARIO-22: plugin version bumped
Covers: AC-19
- **Given** plugin.json before this spec
- **When** the spec is fully merged
- **Then** plugin.json version is incremented (patch bumps OR consolidated minor bump)
- **And** marketplace.json version matches plugin.json

### SCENARIO-23: Existing gates still pass on existing spec
Covers: AC-20
- **Given** `specification/01-enhance-research-and-stages/` existing artifacts
- **When** I run all existing gate scripts against them
- **Then** all gates that were passing before still pass

### SCENARIO-24: Non-visual specs skip new gates
Covers: AC-21
- **Given** a backend-only spec (e.g., DBus interface change)
- **When** the workflow runs end-to-end
- **Then** visual-verifier produces a `.non-visual` marker, gate-visual skips with PASS
- **And** prototype-runner is not spawned (no constants in spec)
- **And** workflow completes normally
