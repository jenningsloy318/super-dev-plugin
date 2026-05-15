---
name: e2e
description: Generate and run end-to-end tests with Playwright including test journeys, performance budgets, accessibility, and cross-browser validation
---

<purpose>Invoke the e2e-runner agent to generate, maintain, and execute end-to-end tests using Playwright. Creates test journeys from BDD scenarios, validates performance budgets and accessibility, runs across browsers, captures artifacts, and quarantines flaky tests. In the full workflow, runs as Step 9.4 (Web/UI features only).</purpose>

<usage>/super-dev:e2e [feature or user flow to test]</usage>

<output name="What It Does">
  Test Generation: Create Playwright tests from BDD scenarios with Page Object Model. Cross-Browser: Run across Chromium, Firefox, WebKit. Performance: Validate Core Web Vitals (LCP < 2.5s, CLS < 0.1, TTI < 3.8s). Accessibility: axe-core WCAG 2.1 AA scan on every page state. Artifacts: Screenshots on failure, video for critical flows, traces for debugging. Flaky Handling: Detect, quarantine, and stabilize intermittent failures.
</output>

<process>
  <step n="1" name="Plan">Read BDD scenarios. Classify flows by risk: HIGH (auth, payments) → MEDIUM (CRUD, search) → LOW (polish).</step>
  <step n="2" name="Generate">Create Playwright tests with POM. Semantic selectors, isolated contexts, explicit waits.</step>
  <step n="3" name="Execute">Run headless across 3 browsers. Record traces, screenshots, network.</step>
  <step n="4" name="Validate">Check performance budgets and accessibility. Flag violations.</step>
  <step n="5" name="Report">Pass/fail per browser, performance metrics, accessibility findings, journey coverage matrix.</step>
</process>

<success-metrics>
  Journey Coverage: 100% HIGH-priority scenarios. Pass Rate: ≥ 95%. Flaky Rate: < 5%. Duration: < 10min. Performance: All CWV within budget. Accessibility: Zero critical violations.
</success-metrics>

<constraints>
  <constraint>Semantic selectors: data-testid > role > text > CSS > XPath</constraint>
  <constraint>Each test independent — isolated browser context, no shared state</constraint>
  <constraint>Wait for conditions, never time</constraint>
  <constraint>Traces recorded for all CI runs</constraint>
  <constraint>axe-core accessibility scan on every navigation</constraint>
</constraints>
