---
name: implementation-summary-template
description: Structured implementation summary template for tracking progress milestones, file changes, technical decisions, and spec change history during development execution.
doc-type: implementation-summary
gate-profile: none
---

<document type="implementation-summary">

<metadata>
  <field name="title">Implementation Summary: [Feature/Fix Name]</field>
  <field name="last-updated">[timestamp]</field>
  <field name="status">In Progress / Complete</field>
</metadata>

<section title="Progress Updates">

  <subsection title="[Timestamp] - Milestone X Complete">
    <paragraph label="Tasks Completed"></paragraph>
    <list type="unordered">
      <task id="TX.1">[description]</task>
      <task id="TX.2">[description]</task>
    </list>

    <paragraph label="Files Changed"></paragraph>
    <table>
      <row header="true">
        <cell>File</cell>
        <cell>Action</cell>
        <cell>Changes</cell>
      </row>
      <row>
        <cell>[path]</cell>
        <cell>Created/Modified/Deleted</cell>
        <cell>[description]</cell>
      </row>
    </table>

    <paragraph label="Technical Decisions"></paragraph>
    <list type="ordered">
      <item>[Decision]: [rationale]</item>
    </list>

    <paragraph label="Challenges Encountered"></paragraph>
    <list type="ordered">
      <item>[Challenge]: [solution]</item>
    </list>
  </subsection>

  <subsection title="[Earlier Timestamp] - Milestone Y Complete">
    <paragraph label="Tasks Completed"></paragraph>
    <list type="unordered">
      <task id="TY.1">[description]</task>
    </list>

    <paragraph label="Files Changed"></paragraph>
    <table>
      <row header="true">
        <cell>File</cell>
        <cell>Action</cell>
        <cell>Changes</cell>
      </row>
      <row>
        <cell>[path]</cell>
        <cell>Created/Modified/Deleted</cell>
        <cell>[description]</cell>
      </row>
    </table>

    <paragraph label="Technical Decisions"></paragraph>
    <list type="ordered">
      <item>[Decision]: [rationale]</item>
    </list>

    <paragraph label="Challenges Encountered"></paragraph>
    <list type="ordered">
      <item>[Challenge]: [solution]</item>
    </list>
  </subsection>

</section>

<section title="Spec Change Log">

  <subsection title="[UPDATED: YYYY-MM-DD] Section X.Y">
    <paragraph label="Original"></paragraph>
    <quote>[What the spec originally said]</quote>

    <paragraph label="Changed to"></paragraph>
    <quote>[New specification]</quote>

    <paragraph label="Reason"></paragraph>
    <paragraph>[Why the change was necessary]</paragraph>

    <paragraph label="Impact"></paragraph>
    <paragraph>[What else this affects]</paragraph>
  </subsection>

</section>

</document>

## Gate Compliance Notes

This template does NOT have a dedicated gate script (gate-profile: null). However, it is consumed by:
- **adversarial-reviewer** (Stage 10): uses as `implementation_summary` input to scope the review
- **code-reviewer** (Stage 10): cross-references changes against this summary
- **qa-agent** (Stage 9): uses to identify files changed and functions to verify

To ensure reliable downstream parsing:
1. Files Changed table MUST list every file modified with action (Created/Modified/Deleted)
2. Phase reference MUST match the phase number from the implementation plan
3. Each key decision MUST reference the specific file:line where it was implemented
4. Deviations from spec MUST be explicitly called out with rationale
