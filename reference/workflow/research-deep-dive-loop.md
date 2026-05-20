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
