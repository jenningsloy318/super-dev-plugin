#!/bin/bash
# Shared gate utilities — sourced by all gate-*.sh scripts

PASS=0
FAIL=0
ERRORS=""

find_spec_file() {
    local pattern="$1"
    find "$SPEC_DIR" -maxdepth 1 -name "$pattern" -type f 2>/dev/null | head -1
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
