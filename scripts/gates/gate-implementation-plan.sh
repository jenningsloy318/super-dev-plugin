#!/bin/bash
# Gate: Implementation Plan Quality
# Validates implementation plan has Phase headings and structure.
# Does NOT check companion files — they have their own gates.
#
# Usage: gate-implementation-plan.sh <file-or-spec-dir>
# Exit 0 = PASS, Exit 1 = FAIL

set -euo pipefail

SPEC_DIR="${1:?Usage: gate-implementation-plan.sh <file-or-spec-dir>}"
source "$(dirname "$0")/gate-lib.sh"

PLAN_FILE="${GATE_FILE:-$(find_spec_file '*-implementation-plan.md')}"

if [ -z "$PLAN_FILE" ] || [ ! -f "$PLAN_FILE" ]; then
    echo "GATE FAIL: No implementation plan file found in: ${SPEC_DIR}"
    exit 1
fi

# IP1: Has Phase headings (supports multiple formats)
phase_count=$(grep -cE '(Phase [0-9]+[[:space:]]*:|\bPhase [0-9]+\b)' "$PLAN_FILE" 2>/dev/null || true)
if [ "$phase_count" -eq 0 ]; then
    phase_count=$(grep -cE '(## Phase [0-9]+|### Phase [0-9]+)' "$PLAN_FILE" 2>/dev/null || true)
fi
check "Has Phase headings (found: ${phase_count})" "$([ "$phase_count" -ge 1 ] && echo true || echo false)"

# IP2: Has domain tags
has_domain=$(grep -ci "domain\|rust\|go\|frontend\|backend\|mixed" "$PLAN_FILE" || true)
check "Has domain information" "$([ "$has_domain" -gt 0 ] && echo true || echo false)"

# IP3: Has effort/timeline information
has_effort=$(grep -ci "effort\|timeline\|days\|hours\|weeks\|sprint" "$PLAN_FILE" || true)
check "Has effort estimates" "$([ "$has_effort" -gt 0 ] && echo true || echo false)"

# IP4: Minimum file size
file_size=$(wc -c < "$PLAN_FILE" | tr -d ' ')
check "Plan has substance (>300 chars, actual: ${file_size})" "$([ "$file_size" -gt 300 ] && echo true || echo false)"

gate_report "Implementation Plan Quality"
