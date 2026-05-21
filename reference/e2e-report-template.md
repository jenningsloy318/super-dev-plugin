---
name: e2e-report-template
description: Structured E2E test report template with journey coverage matrix, cross-browser results, performance metrics, accessibility findings, and artifact inventory.
doc-type: e2e-report
gate-profile: null
---

<document type="e2e-report">

<metadata>
  <field name="title">E2E Test Report: [Feature/Fix Name]</field>
  <field name="date">[timestamp]</field>
  <field name="author">super-dev:e2e-runner</field>
  <field name="status">PASS | FAIL | BLOCKED</field>
  <field name="spec-reference">[path to [doc-index]-specification.md]</field>
  <field name="bdd-reference">[path to [doc-index]-bdd-scenarios.md]</field>
  <field name="implementation-reference">[path to [doc-index]-implementation-summary.md]</field>
</metadata>

<section title="Executive Summary">
  <table>
    <row header="true">
      <cell>Metric</cell>
      <cell>Value</cell>
      <cell>Target</cell>
      <cell>Status</cell>
    </row>
    <row><cell>Journeys Tested</cell><cell>[count]</cell><cell>[total HIGH+MEDIUM priority]</cell><cell>[PASS/FAIL]</cell></row>
    <row><cell>Total Tests</cell><cell>[count]</cell><cell>--</cell><cell>--</cell></row>
    <row><cell>Pass Rate</cell><cell>[percentage]</cell><cell>≥ 95%</cell><cell>[PASS/FAIL]</cell></row>
    <row><cell>Flaky Tests</cell><cell>[count]</cell><cell>< 5%</cell><cell>[PASS/FAIL]</cell></row>
    <row><cell>Suite Duration</cell><cell>[time]</cell><cell>< 10 min</cell><cell>[PASS/FAIL]</cell></row>
    <row><cell>LCP (worst)</cell><cell>[time]</cell><cell>< 2.5s</cell><cell>[PASS/FAIL]</cell></row>
    <row><cell>CLS (worst)</cell><cell>[score]</cell><cell>< 0.1</cell><cell>[PASS/FAIL]</cell></row>
    <row><cell>Accessibility Violations</cell><cell>[count critical]</cell><cell>0 critical</cell><cell>[PASS/FAIL]</cell></row>
  </table>
</section>

<section title="Journey Coverage Matrix">
  <table>
    <row header="true">
      <cell>Scenario ID</cell>
      <cell>Journey Title</cell>
      <cell>Priority</cell>
      <cell>Chromium</cell>
      <cell>Firefox</cell>
      <cell>WebKit</cell>
      <cell>Test File</cell>
    </row>
    <row>
      <cell>SCENARIO-001</cell>
      <cell>[journey title]</cell>
      <cell>HIGH</cell>
      <cell>PASS | FAIL</cell>
      <cell>PASS | FAIL</cell>
      <cell>PASS | FAIL</cell>
      <cell>[test-file.spec.ts]</cell>
    </row>
    <row>
      <cell>SCENARIO-002</cell>
      <cell>[journey title]</cell>
      <cell>HIGH</cell>
      <cell>PASS | FAIL</cell>
      <cell>PASS | FAIL</cell>
      <cell>PASS | FAIL</cell>
      <cell>[test-file.spec.ts]</cell>
    </row>
  </table>

  <subsection title="Coverage Summary">
    <list type="unordered">
      <item name="HIGH Priority">[M/N] covered</item>
      <item name="MEDIUM Priority">[M/N] covered</item>
      <item name="LOW Priority">[M/N] covered (optional)</item>
      <item name="Total Journey Coverage">[percentage]</item>
    </list>
  </subsection>
</section>

<section title="Cross-Browser Results">
  <table>
    <row header="true">
      <cell>Browser</cell>
      <cell>Tests</cell>
      <cell>Passed</cell>
      <cell>Failed</cell>
      <cell>Skipped</cell>
      <cell>Duration</cell>
    </row>
    <row>
      <cell>Chromium</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
      <cell>[time]</cell>
    </row>
    <row>
      <cell>Firefox</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
      <cell>[time]</cell>
    </row>
    <row>
      <cell>WebKit</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
      <cell>[time]</cell>
    </row>
  </table>

  <subsection title="Browser-Specific Issues">
    <paragraph>[Issues that only appear in specific browsers, or "No browser-specific issues found"]</paragraph>
  </subsection>
</section>

<section title="Performance Metrics">
  <table>
    <row header="true">
      <cell>Page/Route</cell>
      <cell>LCP</cell>
      <cell>CLS</cell>
      <cell>TTI</cell>
      <cell>FCP</cell>
      <cell>Verdict</cell>
    </row>
    <row>
      <cell>[route]</cell>
      <cell>[time] (budget: < 2.5s)</cell>
      <cell>[score] (budget: < 0.1)</cell>
      <cell>[time] (budget: < 3.8s)</cell>
      <cell>[time] (budget: < 1.8s)</cell>
      <cell>PASS | FAIL</cell>
    </row>
  </table>

  <subsection title="Budget Violations">
    <finding id="PERF-001" severity="High" location="[route]">
      <paragraph label="Metric">[which metric violated]</paragraph>
      <paragraph label="Measured">[actual value]</paragraph>
      <paragraph label="Budget">[target value]</paragraph>
      <paragraph label="Recommendation">[optimization suggestion]</paragraph>
    </finding>
    <paragraph>[If none: "All pages within performance budgets."]</paragraph>
  </subsection>
</section>

<section title="Accessibility Findings">
  <table>
    <row header="true">
      <cell>Page/Route</cell>
      <cell>Critical</cell>
      <cell>Serious</cell>
      <cell>Moderate</cell>
      <cell>Minor</cell>
    </row>
    <row>
      <cell>[route]</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
      <cell>[count]</cell>
    </row>
  </table>

  <subsection title="Violations Detail">
    <finding id="A11Y-001" severity="[Critical|Serious|Moderate|Minor]" location="[route + selector]">
      <paragraph label="Rule">[axe-core rule ID, e.g., color-contrast]</paragraph>
      <paragraph label="WCAG">[criterion, e.g., WCAG 2.1 AA 1.4.3]</paragraph>
      <paragraph label="Element">[affected element description]</paragraph>
      <paragraph label="Fix">[specific remediation]</paragraph>
    </finding>
    <paragraph>[If none: "No accessibility violations found."]</paragraph>
  </subsection>
</section>

<section title="Failures and Defects">
  <subsection title="DEF-001: [Defect Title]">
    <list type="unordered">
      <item name="Severity">Critical | High | Medium | Low</item>
      <item name="Scenario">SCENARIO-NNN</item>
      <item name="Browser">[which browser(s)]</item>
      <item name="Steps">[steps that triggered the failure]</item>
      <item name="Expected">[expected behavior]</item>
      <item name="Actual">[actual behavior]</item>
      <item name="Screenshot">[path to screenshot]</item>
      <item name="Trace">[path to trace.zip]</item>
      <item name="Status">Open | Fixed | Quarantined</item>
    </list>
  </subsection>
  <paragraph>[If none: "No defects found."]</paragraph>
</section>

<section title="Flaky Tests">
  <table>
    <row header="true">
      <cell>Test</cell>
      <cell>Pass Rate (3 runs)</cell>
      <cell>Cause</cell>
      <cell>Action</cell>
    </row>
    <row>
      <cell>[test name]</cell>
      <cell>[X/3]</cell>
      <cell>[timing/selector/network/state]</cell>
      <cell>[Stabilized/Quarantined with test.fixme()]</cell>
    </row>
  </table>
  <paragraph>[If none: "No flaky tests detected."]</paragraph>
</section>

<section title="Quality Gates Checklist">
  <checklist>
    <item status="open">100% HIGH-priority journeys covered</item>
    <item status="open">Pass rate ≥ 95% across all browsers</item>
    <item status="open">Flaky rate < 5%</item>
    <item status="open">Suite duration < 10 minutes</item>
    <item status="open">All Core Web Vitals within budget</item>
    <item status="open">Zero critical accessibility violations</item>
    <item status="open">All traces recorded</item>
    <item status="open">No critical/high defects unresolved</item>
  </checklist>
</section>

<section title="Artifacts">
  <table>
    <row header="true">
      <cell>Artifact</cell>
      <cell>Path</cell>
      <cell>Notes</cell>
    </row>
    <row><cell>Test traces</cell><cell>[path or N/A]</cell><cell>[count of traces]</cell></row>
    <row><cell>Screenshots</cell><cell>[path or N/A]</cell><cell>[count]</cell></row>
    <row><cell>Videos</cell><cell>[path or N/A]</cell><cell>[HIGH priority journeys only]</cell></row>
    <row><cell>HAR files</cell><cell>[path or N/A]</cell><cell>[if network issues found]</cell></row>
    <row><cell>Playwright HTML report</cell><cell>[path or N/A]</cell><cell></cell></row>
  </table>
</section>

</document>

## Gate Compliance Notes

This template does NOT have a dedicated gate script (gate-profile: null). However, it is consumed by:
- **Team Lead**: uses status field (PASS/FAIL/BLOCKED) for workflow progression
- **adversarial-reviewer** (Stage 10): cross-references journey coverage with BDD scenarios

To ensure reliable downstream parsing:
1. Status MUST be one of: `PASS`, `FAIL`, `BLOCKED`
2. Journey Coverage must reference `SCENARIO-NNN` IDs matching bdd-scenarios document
3. Browser results per cell MUST be exactly `PASS` or `FAIL` (no other text)
4. Performance metrics MUST include numeric values with units (e.g., `2.1s`, `0.05`)
5. Finding IDs use prefixed format: `PERF-NNN`, `A11Y-NNN`, `DEF-NNN`
6. Defect severity MUST be one of: `Critical`, `High`, `Medium`, `Low`
7. Quality Gates checklist uses `status="open"` (not yet verified) or `status="done"` (verified)
