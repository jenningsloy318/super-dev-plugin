#!/bin/bash
# Gate: Specification Quality
# Validates specification has BDD scenario references and testing strategy.
# Does NOT check companion files (plan, task-list) — they have their own gates.
#
# Usage: gate-specification.sh <file-or-spec-dir>
# Exit 0 = PASS, Exit 1 = FAIL

set -euo pipefail

SPEC_DIR="${1:?Usage: gate-specification.sh <file-or-spec-dir>}"
source "$(dirname "$0")/gate-lib.sh"

SPEC_FILE="${GATE_FILE:-$(find_spec_file '*-specification.md')}"

if [ -z "$SPEC_FILE" ] || [ ! -f "$SPEC_FILE" ]; then
    echo "GATE FAIL: No specification file found in: ${SPEC_DIR}"
    exit 1
fi

# S1: Contains SCENARIO-NNN references (traceability to BDD)
scenario_refs=$(grep -cE 'SCENARIO-[0-9]+' "$SPEC_FILE" 2>/dev/null || true)
check "Has BDD scenario references (found: ${scenario_refs})" "$([ "$scenario_refs" -ge 1 ] && echo true || echo false)"

# S2: Contains testing strategy text
has_testing=$(grep -ci "testing strategy\|test plan\|test approach\|test coverage\|unit test\|integration test\|e2e test" "$SPEC_FILE" || true)
check "Has testing strategy section (found: ${has_testing} refs)" "$([ "$has_testing" -gt 0 ] && echo true || echo false)"

# S3: Minimum file size (not a stub)
file_size=$(wc -c < "$SPEC_FILE" | tr -d ' ')
check "Specification has substance (>500 chars, actual: ${file_size})" "$([ "$file_size" -gt 500 ] && echo true || echo false)"

# S4: Has architecture section
has_arch=$(grep -ci "architecture\|system design\|component" "$SPEC_FILE" || true)
check "Has architecture content" "$([ "$has_arch" -gt 0 ] && echo true || echo false)"

gate_report "Specification Quality"
