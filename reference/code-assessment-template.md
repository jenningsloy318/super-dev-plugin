---
name: code-assessment-template
description: Structured code assessment template with architecture evaluation, standards analysis, dependency review, framework patterns, and prioritized recommendations with effort/impact scoring.
doc-type: code-assessment
gate-profile: null
---

<document type="code-assessment">

<metadata>
  <field name="title">Code Assessment: [Scope Description]</field>
  <field name="date">[timestamp]</field>
  <field name="author">super-dev:code-assessor</field>
  <field name="scope">[folders/files assessed]</field>
  <field name="focus">[architecture | standards | dependencies | patterns | all]</field>
</metadata>

<section title="Executive Summary">
  <paragraph>[2-3 sentences: overall health assessment, key findings, primary recommendation]</paragraph>

  <table>
    <row header="true">
      <cell>Dimension</cell>
      <cell>Score (1-5)</cell>
      <cell>Issues</cell>
    </row>
    <row><cell>Architecture</cell><cell>[score]</cell><cell>[count]</cell></row>
    <row><cell>Code Standards</cell><cell>[score]</cell><cell>[count]</cell></row>
    <row><cell>Dependencies</cell><cell>[score]</cell><cell>[count]</cell></row>
    <row><cell>Framework Patterns</cell><cell>[score]</cell><cell>[count]</cell></row>
    <row><cell>Maintainability</cell><cell>[score]</cell><cell>[count]</cell></row>
  </table>

  <paragraph>Scoring: 5=Excellent, 4=Good, 3=Adequate, 2=Needs Improvement, 1=Critical</paragraph>
</section>

<section title="Architecture Evaluation">
  <subsection title="Organization">
    <paragraph>[Module structure, separation of concerns, directory layout]</paragraph>
  </subsection>

  <subsection title="Module Boundaries">
    <table>
      <row header="true">
        <cell>Module</cell>
        <cell>Responsibility</cell>
        <cell>Coupling</cell>
        <cell>Cohesion</cell>
      </row>
      <row>
        <cell>[module name]</cell>
        <cell>[single responsibility description]</cell>
        <cell>[Low/Medium/High]</cell>
        <cell>[Low/Medium/High]</cell>
      </row>
    </table>
  </subsection>

  <subsection title="Data Flow">
    <diagram type="ascii">
[ASCII diagram showing data flow between modules]
    </diagram>
  </subsection>

  <subsection title="Error Handling Consistency">
    <paragraph>[Pattern analysis: how errors are handled across modules, inconsistencies found]</paragraph>
  </subsection>

  <subsection title="Findings">
    <finding id="ARCH-001" severity="[Critical|High|Medium|Low]" location="[file:line]">
      <paragraph label="Issue">[description]</paragraph>
      <paragraph label="Impact">[concrete impact: maintenance burden, bug risk, performance cost]</paragraph>
      <paragraph label="Recommendation">[specific fix]</paragraph>
    </finding>
  </subsection>
</section>

<section title="Code Standards">
  <subsection title="Tooling Inventory">
    <table>
      <row header="true">
        <cell>Tool</cell>
        <cell>Config File</cell>
        <cell>Status</cell>
      </row>
      <row>
        <cell>[Linter: ESLint/Biome/clippy]</cell>
        <cell>[path]</cell>
        <cell>[Active/Missing/Misconfigured]</cell>
      </row>
      <row>
        <cell>[Formatter: Prettier/rustfmt/gofmt]</cell>
        <cell>[path]</cell>
        <cell>[Active/Missing/Misconfigured]</cell>
      </row>
      <row>
        <cell>[Type Checker: TypeScript/mypy]</cell>
        <cell>[path]</cell>
        <cell>[Active/Missing/Misconfigured]</cell>
      </row>
    </table>
  </subsection>

  <subsection title="Conventions Observed">
    <list type="unordered">
      <item name="Naming">[camelCase/snake_case/PascalCase — with file:line examples]</item>
      <item name="File Organization">[pattern description with examples]</item>
      <item name="Import Ordering">[pattern description]</item>
      <item name="Comment Style">[pattern description]</item>
    </list>
  </subsection>

  <subsection title="Findings">
    <finding id="STD-001" severity="[severity]" location="[file:line]">
      <paragraph label="Issue">[description]</paragraph>
      <paragraph label="Impact">[impact]</paragraph>
      <paragraph label="Recommendation">[fix]</paragraph>
    </finding>
  </subsection>
</section>

<section title="Dependencies">
  <subsection title="Manifest Analysis">
    <table>
      <row header="true">
        <cell>Package</cell>
        <cell>Current</cell>
        <cell>Latest</cell>
        <cell>Status</cell>
        <cell>Risk</cell>
      </row>
      <row>
        <cell>[package name]</cell>
        <cell>[current version]</cell>
        <cell>[latest version]</cell>
        <cell>[Current/Outdated/Deprecated/Vulnerable]</cell>
        <cell>[Low/Medium/High]</cell>
      </row>
    </table>
  </subsection>

  <subsection title="Security Advisories">
    <paragraph>[Known vulnerabilities in current dependency tree, or "None found"]</paragraph>
  </subsection>

  <subsection title="Bundle/Binary Size Concerns">
    <paragraph>[Unnecessary deps, tree-shaking opportunities, or "No concerns"]</paragraph>
  </subsection>

  <subsection title="Findings">
    <finding id="DEP-001" severity="[severity]" location="[manifest:line]">
      <paragraph label="Issue">[description]</paragraph>
      <paragraph label="Impact">[impact]</paragraph>
      <paragraph label="Recommendation">[fix]</paragraph>
    </finding>
  </subsection>
</section>

<section title="Framework Patterns">
  <subsection title="Patterns Inventory">
    <table>
      <row header="true">
        <cell>Pattern</cell>
        <cell>Usage</cell>
        <cell>Location</cell>
        <cell>Assessment</cell>
      </row>
      <row>
        <cell>[State Management / Routing / API Integration / etc.]</cell>
        <cell>[library or custom]</cell>
        <cell>[file:line]</cell>
        <cell>[Appropriate/Overcomplicated/Outdated]</cell>
      </row>
    </table>
  </subsection>

  <subsection title="Test Structure">
    <paragraph>[Test framework, coverage approach, test organization pattern]</paragraph>
  </subsection>

  <subsection title="Findings">
    <finding id="PAT-001" severity="[severity]" location="[file:line]">
      <paragraph label="Issue">[description]</paragraph>
      <paragraph label="Impact">[impact]</paragraph>
      <paragraph label="Recommendation">[fix]</paragraph>
    </finding>
  </subsection>
</section>

<section title="Better Options Analysis">
  <table>
    <row header="true">
      <cell>Current Approach</cell>
      <cell>Better Option</cell>
      <cell>Benefit</cell>
      <cell>Migration Effort</cell>
    </row>
    <row>
      <cell>[current library/pattern]</cell>
      <cell>[alternative]</cell>
      <cell>[why better: simpler, faster, maintained]</cell>
      <cell>[S/M/L]</cell>
    </row>
  </table>
</section>

<section title="Technical Debt Inventory">
  <table>
    <row header="true">
      <cell>ID</cell>
      <cell>Description</cell>
      <cell>Location</cell>
      <cell>Severity</cell>
      <cell>Effort to Fix</cell>
    </row>
    <row>
      <cell>TD-001</cell>
      <cell>[description]</cell>
      <cell>[file:line]</cell>
      <cell>[High/Medium/Low]</cell>
      <cell>[S/M/L]</cell>
    </row>
  </table>
</section>

<section title="Prioritized Recommendations">
  <table>
    <row header="true">
      <cell>Priority</cell>
      <cell>ID</cell>
      <cell>Recommendation</cell>
      <cell>Effort</cell>
      <cell>Impact</cell>
    </row>
    <row>
      <cell>1</cell>
      <cell>REC-001</cell>
      <cell>[actionable recommendation]</cell>
      <cell>[S/M/L]</cell>
      <cell>[S/M/L]</cell>
    </row>
    <row>
      <cell>2</cell>
      <cell>REC-002</cell>
      <cell>[actionable recommendation]</cell>
      <cell>[S/M/L]</cell>
      <cell>[S/M/L]</cell>
    </row>
  </table>

  <paragraph>Priority ordering: High Impact + Low Effort first, then High Impact + High Effort, then Low Impact + Low Effort. Skip Low Impact + High Effort.</paragraph>
</section>

<section title="File Coverage Report">
  <table>
    <row header="true">
      <cell>Category</cell>
      <cell>Files Analyzed</cell>
      <cell>Total Files</cell>
      <cell>Coverage</cell>
    </row>
    <row>
      <cell>[source category]</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
      <cell>[percentage]</cell>
    </row>
  </table>

  <subsection title="Exclusions">
    <list type="unordered">
      <item>[excluded path]: [reason — e.g., generated code, vendor, test fixtures]</item>
    </list>
  </subsection>
</section>

</document>

## Gate Compliance Notes

This template does NOT have a dedicated gate script (gate-profile: null). However, it is consumed by:
- **architecture-designer** (Stage 6): parses Architecture Evaluation, Module Boundaries, and Recommendations
- **spec-writer** (Stage 7): parses Framework Patterns, Dependencies, and Technical Debt

To ensure reliable downstream parsing:
1. Finding IDs MUST use prefixed format: `ARCH-NNN`, `STD-NNN`, `DEP-NNN`, `PAT-NNN`, `TD-NNN`, `REC-NNN`
2. Severity values MUST be one of: `Critical`, `High`, `Medium`, `Low`
3. Effort/Impact values MUST be one of: `S` (small), `M` (medium), `L` (large)
4. Score values MUST be integers 1-5
5. All findings MUST include `location` with `file:line` format
6. File Coverage section MUST be present (even if 100% coverage)
