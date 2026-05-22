#!/bin/bash
# Gate: Implementation Summary Quality
# Validates implementation summary has required content and no excessive placeholders.
#
# Usage: gate-implementation-summary.sh <spec-dir>
# Exit 0 = PASS, Exit 1 = FAIL

set -euo pipefail

SPEC_DIR="${1:?Usage: gate-implementation-summary.sh <spec-dir>}"
source "$(dirname "$0")/gate-lib.sh"

SUMMARY_FILE=$(find_spec_file '*-implementation-summary.md')

if [ -z "$SUMMARY_FILE" ] || [ ! -f "$SUMMARY_FILE" ]; then
    echo "GATE FAIL: No *-implementation-summary.md file found in: ${SPEC_DIR}"
    exit 1
fi

# IS1: Has files changed section
has_files=$(grep -ci "files changed\|file.*action\|created\|modified\|deleted" "$SUMMARY_FILE" || true)
check "Has files changed information" "$([ "$has_files" -gt 0 ] && echo true || echo false)"

# IS2: No excessive placeholders
todo_count=$(grep -ciE 'TODO|FIXME|TBD|PLACEHOLDER|\[INSERT\]|\[FILL' "$SUMMARY_FILE" 2>/dev/null || true)
check "No excessive placeholders (found: ${todo_count}, max: 3)" "$([ "$todo_count" -le 3 ] && echo true || echo false)"

# IS3: Has test results
has_tests=$(grep -ci "test\|passing\|pass\|fail" "$SUMMARY_FILE" || true)
check "Has test results" "$([ "$has_tests" -gt 0 ] && echo true || echo false)"

# IS4: Minimum file size
file_size=$(wc -c < "$SUMMARY_FILE" | tr -d ' ')
check "Summary has substance (>300 chars, actual: ${file_size})" "$([ "$file_size" -gt 300 ] && echo true || echo false)"

gate_report "Implementation Summary Quality"
