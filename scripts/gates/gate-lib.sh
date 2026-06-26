#!/bin/bash
# Shared gate utilities — sourced by all gate-*.sh scripts
#
# Input resolution (handled automatically):
#   - If $1 is a file path: GATE_FILE = that file, SPEC_DIR = its parent
#   - If $1 is a directory: SPEC_DIR = that directory, GATE_FILE = "" (legacy mode)
#
# Gate scripts should use GATE_FILE when set. Only fall back to
# find_spec_file() when GATE_FILE is empty (directory-level gates
# like gate-spec-trace, gate-docs-drift, gate-implementation-complete).

PASS=0
FAIL=0
ERRORS=""

# Resolve input: file vs directory
if [ -f "$SPEC_DIR" ]; then
    GATE_FILE="$SPEC_DIR"
    SPEC_DIR="$(dirname "$SPEC_DIR")"
elif [ -d "$SPEC_DIR" ]; then
    GATE_FILE=""
else
    GATE_FILE=""
fi

# Fallback search — only used by directory-level gates that scan multiple files.
# Picks the most recently modified match (handles multi-iteration naming).
find_spec_file() {
    local pattern="$1"
    local files
    files=$(find "$SPEC_DIR" -maxdepth 1 -name "$pattern" -type f 2>/dev/null)
    if [ -z "$files" ]; then return; fi
    echo "$files" | xargs ls -t 2>/dev/null | head -1
}

check() {
    local desc="$1"
    local result="$2"
    if [ "$result" = "true" ]; then
        PASS=$((PASS + 1))
    else
        FAIL=$((FAIL + 1))
        ERRORS="${ERRORS}\n  FAIL: ${desc}"
    fi
}

gate_report() {
    local gate_name="$1"
    TOTAL=$((PASS + FAIL))
    echo "GATE: ${gate_name}"
    echo "  Score: ${PASS}/${TOTAL} checks passed"

    if [ "$FAIL" -gt 0 ]; then
        echo -e "  Failures:${ERRORS}"
        echo "GATE RESULT: FAIL"
        exit 1
    else
        echo "GATE RESULT: PASS"
        exit 0
    fi
}
