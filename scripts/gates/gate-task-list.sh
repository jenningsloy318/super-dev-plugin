#!/bin/bash
# Gate: Task List Quality
# Validates task list exists and has meaningful content.
#
# Usage: gate-task-list.sh <spec-dir>
# Exit 0 = PASS, Exit 1 = FAIL

set -euo pipefail

SPEC_DIR="${1:?Usage: gate-task-list.sh <spec-dir>}"
source "$(dirname "$0")/gate-lib.sh"

TASK_FILE=$(find_spec_file '*-task-list.md')

if [ -z "$TASK_FILE" ] || [ ! -f "$TASK_FILE" ]; then
    echo "GATE FAIL: No *-task-list.md file found in: ${SPEC_DIR}"
    exit 1
fi

# TL1: Has task items (checkboxes or numbered items)
task_count=$(grep -cE '^\s*(-\s*\[|\d+\.)' "$TASK_FILE" 2>/dev/null || true)
check "Has task items (found: ${task_count})" "$([ "$task_count" -ge 1 ] && echo true || echo false)"

# TL2: Has phase references
has_phase=$(grep -ci "phase\|milestone\|stage" "$TASK_FILE" || true)
check "References phases or milestones" "$([ "$has_phase" -gt 0 ] && echo true || echo false)"

# TL3: Minimum file size
file_size=$(wc -c < "$TASK_FILE" | tr -d ' ')
check "Task list has substance (>200 chars, actual: ${file_size})" "$([ "$file_size" -gt 200 ] && echo true || echo false)"

gate_report "Task List Quality"
