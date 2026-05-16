---
name: debug-analysis
description: Perform systematic root cause analysis using feedback-loop-first methodology — build a fast pass/fail signal before hypothesizing
---

<purpose>Activate the debug-analyzer agent for feedback-loop-first debugging. Builds a deterministic pass/fail signal first, then methodically tests falsifiable hypotheses one variable at a time.</purpose>

<usage>/super-dev:debug-analysis [bug description or error details]</usage>

<process name="Feedback-Loop-First Process">
  1. Identify Reproduction Strategy: Find a fast, deterministic pass/fail signal using ranked approaches (existing test → curl/HTTP → CLI invocation → dev workflow → browser reproduction → log replay → git bisect → differential comparison).
  2. Reproduce and Confirm: Run the reproduction, confirm it matches the user's reported symptom.
  3. Codebase Analysis: Trace execution path from entry point to error.
  4. Multi-Hypothesis: Generate 3-5 ranked falsifiable hypotheses with predictions before testing any.
  5. Verify Hypotheses: One variable at a time, trace code logic to confirm/deny predictions.
  6. Document Root Cause: Verified root cause, recommended fix, regression test strategy, prevention recommendation.
</process>

<arguments>
  Error messages or stack traces, description of unexpected behavior, steps already attempted, context about when the issue occurs.
</arguments>

<output>
  <format>Debug analysis report (`[doc-index]-debug-analysis.md`) with: reproduction strategy, reproduction confirmation, hypotheses with predictions, verified root cause, recommended fix with code locations, regression test strategy, prevention recommendation.</format>
</output>

<constraints>
  <constraint>NEVER proceed to hypotheses without a confirmed reproduction</constraint>
  <constraint>Each hypothesis must be falsifiable with a stated prediction</constraint>
  <constraint>Verify one variable at a time</constraint>
  <constraint>Analysis only — do not modify project code, recommend fixes instead</constraint>
</constraints>
