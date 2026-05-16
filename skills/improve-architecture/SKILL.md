---
name: improve-architecture
description: "Find shallow modules and propose deepening opportunities. Use when codebase needs structural improvement, better testability, or when debug-analysis reveals missing test seams."
---

<purpose>Activate the architecture-improver agent to analyze existing code for architectural friction and propose deepening refactors that improve testability and locality.</purpose>

<usage>/super-dev:improve-architecture [optional: specific area or module to focus on]</usage>

<process>
  <step n="1" name="Explore">Walk codebase for friction — shallow modules, leaked abstractions, untestable code</step>
  <step n="2" name="Candidates">Present numbered deepening opportunities with deletion test results</step>
  <step n="3" name="Grill">Walk design tree with user for selected candidate</step>
  <step n="4" name="Design It Twice">Propose 3+ radically different interfaces, compare by depth/locality/seam placement</step>
  <step n="5" name="Document">Architecture improvement doc with migration path and test replacement strategy</step>
</process>

<arguments>
  Optional focus area (module name, directory, or concern like "testability of auth layer").
  Optional trigger context (debug finding, code review feedback).
</arguments>

<output>
  <format>Architecture improvement document (`[doc-index]-architecture-improvement.md`) with: friction analysis, deepening candidates, interface alternatives, migration path, test strategy.</format>
</output>

<constraints>
  <constraint>Analysis only — recommend changes, do not modify code</constraint>
  <constraint>Use deepening vocabulary: module, interface, seam, adapter, depth, leverage, locality</constraint>
  <constraint>Apply deletion test before proposing any deepening</constraint>
  <constraint>Interface alternatives must be radically different, not variations</constraint>
</constraints>
