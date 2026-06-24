#!/bin/bash
# Gate: Empirical Prototype Report
# Verifies that prototype-runner produced a report with the expected structure
# and a verdict consistent with its measured data. Pairs with
# agents/prototype-runner.md (Stage 6.5).
#
# Usage: gate-prototype.sh <spec-dir>
# Exit 0 = PASS (report exists and is well-formed OR prototype-skipped marker present)
# Exit 1 = FAIL (report missing, malformed, or verdict-data inconsistent)

set -euo pipefail

SPEC_DIR="${1:?Usage: gate-prototype.sh <spec-dir>}"
source "$(dirname "$0")/gate-lib.sh"

if [ ! -d "$SPEC_DIR" ]; then
    echo "GATE FAIL: Spec directory not found: ${SPEC_DIR}"
    exit 1
fi

# P1: report file exists
report_file=$(find "$SPEC_DIR" -maxdepth 1 -name '*-prototype-report.md' -type f 2>/dev/null | head -1 || true)

# Skip case: explicit "no constants" marker
if [ -f "${SPEC_DIR}/.prototype-skipped" ]; then
    echo "  SKIPPED — no design constants in spec"
    check ".prototype-skipped marker present" "true"
    gate_report "Empirical Prototype Report"
fi

if [ -z "$report_file" ] || [ ! -f "$report_file" ]; then
    check "prototype-report.md exists" "false"
    gate_report "Empirical Prototype Report"
fi
check "prototype-report.md exists" "true"

# P2: report has Constants section
has_constants=$(grep -ciE 'constants under test|## Constants|## Constants Under Test' "$report_file" 2>/dev/null || echo 0)
check "report has Constants section" "$([ "$has_constants" -gt 0 ] && echo true || echo false)"

# P3: report has Measurement Results section
has_results=$(grep -ciE 'measurement|measured|results|## Results' "$report_file" 2>/dev/null || echo 0)
check "report has Measurement Results section" "$([ "$has_results" -gt 0 ] && echo true || echo false)"

# P4: report has a Verdict
has_verdict=$(grep -ciE 'verdict|VERDICT|## Verdict|overall.*(pass|fail)' "$report_file" 2>/dev/null || echo 0)
check "report has overall verdict" "$([ "$has_verdict" -gt 0 ] && echo true || echo false)"

# P5: report has Recommendation
has_recommendation=$(grep -ciE 'recommendation|## Recommendation|recommend' "$report_file" 2>/dev/null || echo 0)
check "report has recommendation (proceed / caveats / pivot)" \
      "$([ "$has_recommendation" -gt 0 ] && echo true || echo false)"

# P6: report has reference to prototype source location
has_prototype_dir=$(grep -ciE 'prototype/|prototype directory|prototype source' "$report_file" 2>/dev/null || echo 0)
check "report references prototype source location" \
      "$([ "$has_prototype_dir" -gt 0 ] && echo true || echo false)"

# P7: prototype directory exists with at least one file (proof we ran something)
PROTOTYPE_DIR="${SPEC_DIR}/prototype"
if [ -d "$PROTOTYPE_DIR" ]; then
    file_count=$(find "$PROTOTYPE_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
    check "prototype/ directory has files (count: ${file_count})" \
          "$([ "$file_count" -ge 1 ] && echo true || echo false)"
else
    check "prototype/ directory exists" "false"
fi

# P8: if verdict is FAIL, recommendation must mention pivot-protocol
# Use word boundary (\b) to prevent "failures" from matching "FAIL" as a substring
if grep -qiP '\bverdict\b.*\bFAIL\b' "$report_file" 2>/dev/null; then
    has_pivot=$(grep -ciE 'pivot.protocol|pivot protocol|invoke pivot' "$report_file" 2>/dev/null || echo 0)
    check "FAIL verdict references pivot-protocol" \
          "$([ "$has_pivot" -gt 0 ] && echo true || echo false)"
fi

gate_report "Empirical Prototype Report"
