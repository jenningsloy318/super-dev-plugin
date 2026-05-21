---
name: architecture-improvement-template
description: Structured architecture improvement template with friction analysis, deepening candidates, interface alternatives, migration path, and test replacement strategy.
doc-type: architecture-improvement
gate-profile: null
---

<document type="architecture-improvement">

<metadata>
  <field name="title">Architecture Improvement: [Scope/Area]</field>
  <field name="date">[timestamp]</field>
  <field name="author">super-dev:architecture-improver</field>
  <field name="scope">[modules/areas analyzed]</field>
</metadata>

<section title="Friction Analysis">
  <paragraph>[Summary of where architectural friction was found and why it matters]</paragraph>

  <subsection title="Shallow Modules Identified">
    <table>
      <row header="true">
        <cell>Module</cell>
        <cell>Files</cell>
        <cell>Symptom</cell>
        <cell>Deletion Test</cell>
      </row>
      <row>
        <cell>[module name]</cell>
        <cell>[file paths]</cell>
        <cell>[what friction manifests as: leaky abstraction / pass-through / low leverage]</cell>
        <cell>[Pass: callers simplify / Fail: callers unchanged]</cell>
      </row>
    </table>
  </subsection>

  <subsection title="Depth Assessment">
    <table>
      <row header="true">
        <cell>Module</cell>
        <cell>Interface Width</cell>
        <cell>Implementation Depth</cell>
        <cell>Leverage</cell>
        <cell>Verdict</cell>
      </row>
      <row>
        <cell>[module]</cell>
        <cell>[count of entry points]</cell>
        <cell>[lines / complexity hidden]</cell>
        <cell>[High/Medium/Low]</cell>
        <cell>[Deep / Shallow / Borderline]</cell>
      </row>
    </table>
  </subsection>
</section>

<section title="Deepening Candidates">

  <subsection title="CAND-001: [Candidate Title]">
    <list type="unordered">
      <item name="Files">[modules involved — file:line references]</item>
      <item name="Problem">[why current architecture causes friction — use shallow/deep/seam/leverage vocabulary]</item>
      <item name="Dependency Category">[in-process / local-substitutable / remote-owned / true-external]</item>
      <item name="Solution">[plain English description of what would change]</item>
      <item name="Benefits">[locality improvement, leverage gain, test quality improvement]</item>
      <item name="Effort">[S/M/L]</item>
      <item name="Impact">[S/M/L]</item>
      <item name="Risk">[Low/Medium/High]</item>
    </list>
  </subsection>

  <subsection title="CAND-002: [Candidate Title]">
    <list type="unordered">
      <item name="Files">[modules involved]</item>
      <item name="Problem">[friction description]</item>
      <item name="Dependency Category">[category]</item>
      <item name="Solution">[description]</item>
      <item name="Benefits">[benefits]</item>
      <item name="Effort">[S/M/L]</item>
      <item name="Impact">[S/M/L]</item>
      <item name="Risk">[Low/Medium/High]</item>
    </list>
  </subsection>

  <!-- Add CAND-003+ as needed -->

</section>

<section title="Selected Candidate">
  <field name="selected">CAND-NNN</field>
  <field name="rationale">[why this candidate was selected — effort/impact/risk reasoning]</field>
</section>

<section title="Interface Alternatives (Design It Twice)">

  <subsection title="Option A: Minimize Interface">
    <list type="unordered">
      <item name="Interface Shape">[1-3 entry points, signatures]</item>
      <item name="Usage Example">[how callers would use it]</item>
      <item name="What Implementation Hides">[complexity behind the seam]</item>
      <item name="Dependency Strategy">[how deps are handled]</item>
      <item name="Trade-offs">[what you give up]</item>
    </list>
  </subsection>

  <subsection title="Option B: Maximize Flexibility">
    <list type="unordered">
      <item name="Interface Shape">[multiple entry points, extension points]</item>
      <item name="Usage Example">[how callers would use it]</item>
      <item name="What Implementation Hides">[complexity behind the seam]</item>
      <item name="Dependency Strategy">[how deps are handled]</item>
      <item name="Trade-offs">[what you give up]</item>
    </list>
  </subsection>

  <subsection title="Option C: Optimize for Common Caller">
    <list type="unordered">
      <item name="Interface Shape">[default case trivial, rare cases possible]</item>
      <item name="Usage Example">[how callers would use it]</item>
      <item name="What Implementation Hides">[complexity behind the seam]</item>
      <item name="Dependency Strategy">[how deps are handled]</item>
      <item name="Trade-offs">[what you give up]</item>
    </list>
  </subsection>

  <subsection title="Comparison">
    <table>
      <row header="true">
        <cell>Criterion</cell>
        <cell>Option A</cell>
        <cell>Option B</cell>
        <cell>Option C</cell>
      </row>
      <row><cell>Depth (leverage per entry point)</cell><cell>[1-5]</cell><cell>[1-5]</cell><cell>[1-5]</cell></row>
      <row><cell>Locality (change concentration)</cell><cell>[1-5]</cell><cell>[1-5]</cell><cell>[1-5]</cell></row>
      <row><cell>Seam Placement</cell><cell>[1-5]</cell><cell>[1-5]</cell><cell>[1-5]</cell></row>
      <row><cell>Testability</cell><cell>[1-5]</cell><cell>[1-5]</cell><cell>[1-5]</cell></row>
      <row><cell>Migration Cost</cell><cell>[1-5]</cell><cell>[1-5]</cell><cell>[1-5]</cell></row>
      <row><cell>TOTAL</cell><cell>[sum]</cell><cell>[sum]</cell><cell>[sum]</cell></row>
    </table>
  </subsection>
</section>

<section title="Recommended Interface">
  <field name="selected-option">[Option A/B/C]</field>
  <field name="rationale">[why — referencing depth, locality, and seam placement]</field>

  <subsection title="Interface Definition">
    <code lang="[language]">
[Full interface/type definition for the recommended deepened module]
    </code>
  </subsection>
</section>

<section title="Migration Path">
  <paragraph>Incremental steps from current state to target architecture:</paragraph>
  <list type="ordered">
    <item name="Step 1">[first incremental change — must compile and pass tests after this step]</item>
    <item name="Step 2">[second change]</item>
    <item name="Step 3">[third change]</item>
  </list>

  <subsection title="Dependency Handling">
    <table>
      <row header="true">
        <cell>Dependency</cell>
        <cell>Category</cell>
        <cell>Strategy</cell>
      </row>
      <row>
        <cell>[dependency name]</cell>
        <cell>[in-process / local-substitutable / remote-owned / true-external]</cell>
        <cell>[inline / wrap / abstract / accept]</cell>
      </row>
    </table>
  </subsection>
</section>

<section title="Test Replacement Strategy">
  <paragraph>Replace shallow tests, don't layer new tests on top:</paragraph>

  <table>
    <row header="true">
      <cell>Current Test</cell>
      <cell>Problem</cell>
      <cell>Replacement</cell>
      <cell>Tests At</cell>
    </row>
    <row>
      <cell>[existing test file:name]</cell>
      <cell>[why it's shallow — testing implementation not behavior]</cell>
      <cell>[new test approach]</cell>
      <cell>[new interface seam]</cell>
    </row>
  </table>
</section>

</document>

## Gate Compliance Notes

This template does NOT have a dedicated gate script (gate-profile: null). However, it is consumed by:
- **spec-writer** (Stage 7): uses selected interface and migration path for specification
- **team-lead**: uses to decide scope of implementation

To ensure reliable downstream parsing:
1. Candidate IDs MUST use format: `CAND-NNN` (zero-padded sequential)
2. Effort/Impact values MUST be one of: `S` (small), `M` (medium), `L` (large)
3. Risk values MUST be one of: `Low`, `Medium`, `High`
4. Interface alternatives MUST include at least 3 options (A, B, C)
5. Comparison table MUST use numeric scores (1-5) with TOTAL row
6. Migration steps MUST each be independently compilable/testable
7. All file references MUST use `file:line` format verified against actual codebase
