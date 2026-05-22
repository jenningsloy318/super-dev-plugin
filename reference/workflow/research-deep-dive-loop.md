# Research Deep-Dive Loop Protocol (Stage 3)

Loaded by: team-lead when Stage 3 research report contains an ISSUES, FLAWS, AMBIGUITIES, or CONCERNS section listing unresolved items.

## Steps

1. **Trigger** — Stage 3 research report flags unresolved items.
2. **Extract** — Read Stage 3 report. For each flagged issue list: topic, description, why it's unclear, what specifically needs deeper investigation.
3. **Spawn deep research** — Spawn research-agent in deep-research mode. Prompt MUST include: (a) the specific issues extracted, (b) what is already known vs what remains unclear, (c) instruction to investigate root causes, resolution paths, and alternative approaches per issue.
4. **Review output** — Read deep-research report. Are all flagged issues now clearly understood? Any new ambiguities surfaced?
5. **Loop decision**:
   - Remaining unclear / new ambiguities → extract them and go to step 3.
   - All issues understood → proceed to Stage 4/5.
6. **Exit criteria** — All issues have clear resolution paths with sufficient evidence.
7. **Cap** — Max 3 iterations. After 3, present remaining ambiguities to user for decision.

## Document naming

Each iteration produces a separate document: `[XX]-deep-research-report-N.md` where N is the iteration number (1, 2, 3). **Pre-compute filenames before spawning** — see `document-naming.md`.

## Competing Hypotheses Variant

When a research topic is complex or contentious (multiple valid approaches, rapidly evolving ecosystem, high-stakes architectural decisions), the team-lead MAY spawn 2-3 research-agent instances investigating different angles simultaneously.

### When to use multi-agent research vs. single deep-dive

Use **competing hypotheses** when:
- The topic has 2+ fundamentally different approaches (e.g., performance-first vs DX-first vs innovation-first)
- Initial research yielded contradictory recommendations from high-authority sources
- The decision is high-stakes and difficult to reverse (architecture, framework choice)
- Different stakeholder priorities suggest different optimal solutions

Use **single deep-dive** when:
- The issue is narrow and well-defined (specific bug, API usage question)
- One approach is clearly dominant but needs verification
- Time constraints favor depth over breadth

### Execution

1. **Angle assignment** — Team-lead assigns each research-agent a distinct perspective:
   - Agent A: Performance and scalability angle
   - Agent B: Developer experience and maintainability angle
   - Agent C: Innovation and future-proofing angle
   (Angles vary by topic — these are examples)

2. **Independent research** — Each agent conducts full research independently, unaware of the others' findings. Each produces its own research report.

3. **Synthesis** — Team-lead (or a dedicated synthesis pass) compares all reports:
   - **Agreement zones** — Where 2+ agents converge on the same recommendation → high confidence
   - **Disagreement zones** — Where agents diverge → document trade-offs explicitly, present to user
   - **Gap detection** — Findings in one report absent from others → investigate whether gap is because the angle excludes it or because it was missed
   - **Strongest findings** — Final consolidated report takes the strongest-evidenced finding from each angle

4. **Output** — Produce a single merged research report incorporating the strongest findings, with disagreements explicitly labeled as decision points requiring user input.

## Community Deep-Dive Option

When community signals from the initial research pass (Step 3.5) are unresolved or conflicting:

1. **Trigger** — Community Discoveries section has unresolved items, low consensus, or contradictory community opinions on a critical decision point.
2. **Focused re-search** — Spawn research-agent with targeted community search on specific platforms where initial signals were strongest (e.g., if Reddit had strong but conflicting opinions, deep-dive Reddit specifically).
3. **Resolution** — Updated community findings replace the initial conflicting entries. Momentum scores are recalculated with the deeper evidence.
4. **Team-lead decides** — This is optional. Use only when community consensus is load-bearing for the decision (not for nice-to-have context).
