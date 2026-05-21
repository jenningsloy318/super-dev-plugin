---
name: debug-analysis-template
description: Structured debug analysis template with reproduction strategy, falsifiable hypotheses, verified root cause, and actionable fix recommendations with regression test strategy.
doc-type: debug-analysis
gate-profile: null
---

<document type="debug-analysis">

<metadata>
  <field name="title">Debug Analysis: [Issue Summary]</field>
  <field name="date">[timestamp]</field>
  <field name="author">super-dev:debug-analyzer</field>
  <field name="status">Root Cause Verified | Hypotheses Pending | Reproduction Blocked</field>
  <field name="severity">Critical | High | Medium | Low</field>
</metadata>

<section title="Issue Summary">
  <table>
    <row header="true">
      <cell>Field</cell>
      <cell>Value</cell>
    </row>
    <row><cell>Symptom</cell><cell>[what the user observes]</cell></row>
    <row><cell>Expected Behavior</cell><cell>[what should happen]</cell></row>
    <row><cell>Actual Behavior</cell><cell>[what actually happens]</cell></row>
    <row><cell>First Observed</cell><cell>[when / after which change]</cell></row>
    <row><cell>Frequency</cell><cell>[always / intermittent (X/Y attempts) / specific conditions]</cell></row>
    <row><cell>Environment</cell><cell>[OS, runtime version, config]</cell></row>
  </table>
</section>

<section title="Evidence Collected">
  <subsection title="Error Messages">
    <code lang="text">
[exact error messages, stack traces, error codes]
    </code>
  </subsection>

  <subsection title="Logs">
    <code lang="text">
[relevant log entries with timestamps]
    </code>
  </subsection>

  <subsection title="Visual Evidence">
    <paragraph>[screenshots, recordings, network captures — paths or descriptions]</paragraph>
  </subsection>

  <subsection title="Context">
    <list type="unordered">
      <item name="Recent Changes">[commits, deploys, config changes that may relate]</item>
      <item name="Affected Scope">[which users/features/environments]</item>
      <item name="Related Issues">[links to similar past bugs if any]</item>
    </list>
  </subsection>
</section>

<section title="Reproduction Strategy">
  <field name="technique">[Existing test | Curl/HTTP | CLI invocation | Dev workflow | Browser | Log replay | Git bisect | Differential comparison]</field>
  <field name="deterministic">[Yes | No — if no, state reproduction rate: X/Y]</field>

  <subsection title="Steps to Reproduce">
    <list type="ordered">
      <item>[Step 1]</item>
      <item>[Step 2]</item>
      <item>[Step 3]</item>
    </list>
  </subsection>

  <subsection title="Minimal Reproduction">
    <paragraph>[Reduced case that still triggers the bug, or "Same as steps above"]</paragraph>
  </subsection>

  <subsection title="Reproduction Confirmation">
    <paragraph>[Confirmed: bug appears on X/Y runs with exact symptom matching user report]</paragraph>
  </subsection>
</section>

<section title="Code Execution Path">
  <diagram type="ascii">
[Entry Point] → [Function A] → [Function B] → [Error Location]
                                     ↓
                              [Branch/Condition]
  </diagram>

  <subsection title="Trace">
    <table>
      <row header="true">
        <cell>Step</cell>
        <cell>Location</cell>
        <cell>Action</cell>
        <cell>Data State</cell>
      </row>
      <row>
        <cell>1</cell>
        <cell>[file:line]</cell>
        <cell>[what happens]</cell>
        <cell>[relevant variable values]</cell>
      </row>
      <row>
        <cell>2</cell>
        <cell>[file:line]</cell>
        <cell>[what happens]</cell>
        <cell>[relevant variable values]</cell>
      </row>
    </table>
  </subsection>
</section>

<section title="Hypotheses">
  <paragraph>Ranked by likelihood. Each hypothesis has a falsifiable prediction.</paragraph>

  <subsection title="HYP-001: [Hypothesis Title]">
    <field name="likelihood">High | Medium | Low</field>
    <field name="prediction">If [this] is the cause, then [changing X] will make the bug disappear / [changing Y] will make it worse.</field>
    <field name="supporting-evidence">[evidence that supports this hypothesis]</field>
    <field name="contradicting-evidence">[evidence against, or "None"]</field>
    <field name="verification-method">[how to test: trace logic / add instrumentation / change one variable]</field>
    <field name="result">CONFIRMED | REJECTED | UNVERIFIED</field>
    <field name="result-evidence">[what was observed when tested]</field>
  </subsection>

  <subsection title="HYP-002: [Hypothesis Title]">
    <field name="likelihood">High | Medium | Low</field>
    <field name="prediction">[falsifiable prediction]</field>
    <field name="supporting-evidence">[evidence]</field>
    <field name="contradicting-evidence">[evidence or "None"]</field>
    <field name="verification-method">[method]</field>
    <field name="result">CONFIRMED | REJECTED | UNVERIFIED</field>
    <field name="result-evidence">[observation]</field>
  </subsection>

  <subsection title="HYP-003: [Hypothesis Title]">
    <field name="likelihood">High | Medium | Low</field>
    <field name="prediction">[falsifiable prediction]</field>
    <field name="supporting-evidence">[evidence]</field>
    <field name="contradicting-evidence">[evidence or "None"]</field>
    <field name="verification-method">[method]</field>
    <field name="result">CONFIRMED | REJECTED | UNVERIFIED</field>
    <field name="result-evidence">[observation]</field>
  </subsection>

  <!-- Minimum 3 hypotheses required. Add HYP-004, HYP-005 if needed. -->
</section>

<section title="Verified Root Cause">
  <field name="confirmed-hypothesis">HYP-NNN</field>
  <field name="root-cause">[One-sentence root cause statement]</field>
  <field name="location">[file:line where the bug exists]</field>

  <subsection title="Evidence Chain">
    <list type="ordered">
      <item>[Evidence 1 that confirms this is the root cause]</item>
      <item>[Evidence 2]</item>
      <item>[Evidence 3]</item>
    </list>
  </subsection>

  <subsection title="Why It Wasn't Caught">
    <paragraph>[Gap in testing, monitoring, or review process that allowed this bug]</paragraph>
  </subsection>
</section>

<section title="Recommended Fix">
  <subsection title="Fix Approach">
    <paragraph>[Description of what to change and why]</paragraph>
  </subsection>

  <subsection title="Code Locations">
    <table>
      <row header="true">
        <cell>File</cell>
        <cell>Line</cell>
        <cell>Change</cell>
      </row>
      <row>
        <cell>[file path]</cell>
        <cell>[line number]</cell>
        <cell>[what to modify]</cell>
      </row>
    </table>
  </subsection>

  <subsection title="Alternative Approaches">
    <list type="unordered">
      <item>[Alternative 1]: [trade-off]</item>
      <item>[Alternative 2]: [trade-off]</item>
    </list>
  </subsection>
</section>

<section title="Regression Test Strategy">
  <subsection title="Test Seam">
    <paragraph>[Where to test: unit level / integration level / E2E level, and why this seam]</paragraph>
  </subsection>

  <subsection title="Test Cases">
    <table>
      <row header="true">
        <cell>Test Name</cell>
        <cell>Input</cell>
        <cell>Expected Output</cell>
        <cell>Verifies</cell>
      </row>
      <row>
        <cell>[test_name]</cell>
        <cell>[triggering input]</cell>
        <cell>[correct behavior]</cell>
        <cell>[which hypothesis/root cause this prevents]</cell>
      </row>
    </table>
  </subsection>
</section>

<section title="Prevention Recommendations">
  <list type="unordered">
    <item name="Process">[what review/CI check would have caught this]</item>
    <item name="Monitoring">[what alert/log would surface this earlier]</item>
    <item name="Architecture">[what structural change would prevent this class of bug]</item>
  </list>
</section>

</document>

## Gate Compliance Notes

This template does NOT have a dedicated gate script (gate-profile: null). However, it is consumed by:
- **spec-writer** (Stage 7): parses Verified Root Cause, Code Locations, and Regression Test Strategy

To ensure reliable downstream parsing:
1. Hypothesis IDs MUST use format: `HYP-NNN` (zero-padded, e.g., HYP-001)
2. Hypothesis results MUST be one of: `CONFIRMED`, `REJECTED`, `UNVERIFIED`
3. Status MUST be one of: `Root Cause Verified`, `Hypotheses Pending`, `Reproduction Blocked`
4. All code locations MUST use `file:line` format
5. Minimum 3 hypotheses required (even if 2 are quickly rejected)
6. Verified Root Cause section MUST reference a confirmed HYP-NNN
7. Reproduction Strategy technique MUST be one of the listed enum values
