#!/usr/bin/env bash
# Gate: Quality Score (Informational — does NOT fail the pipeline)
#
# Computes a quality score (0-100) from measurable code metrics.
# Output: JSON to stdout with score breakdown.
# Always exits 0 — this is informational, not pass/fail.
#
# Usage: gate-quality-score.sh <worktree-path> [base-sha]

set -uo pipefail

WORKTREE="${1:?Usage: gate-quality-score.sh <worktree-path> [base-sha]}"
BASE_SHA="${2:-HEAD~1}"
cd "$WORKTREE"

SCORE=100
PENALTIES=""

# --- Determine changed files ---
CHANGED_FILES=$(git diff --name-only --diff-filter=ACMR "$BASE_SHA"..HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|go|rs|py|kt|swift)$' || true)
if [ -z "$CHANGED_FILES" ]; then
  echo '{"score": 100, "max": 100, "breakdown": {"no_source_changes": true}, "penalties": []}'
  exit 0
fi

FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')

# --- Check 1: TODO/FIXME/HACK count (-2 each, max -20) ---
TODO_COUNT=0
while IFS= read -r f; do
  if [ -f "$f" ]; then
    C=$(grep -ci "TODO\|FIXME\|HACK\|XXX" "$f" 2>/dev/null || true)
    C=$(echo "$C" | tr -d '[:space:]')
    [ -n "$C" ] && TODO_COUNT=$((TODO_COUNT + C))
  fi
done <<< "$CHANGED_FILES"
if [ "$TODO_COUNT" -gt 0 ]; then
  PENALTY=$((TODO_COUNT * 2))
  [ "$PENALTY" -gt 20 ] && PENALTY=20
  SCORE=$((SCORE - PENALTY))
  PENALTIES="${PENALTIES}\"todo_fixme: -${PENALTY} (${TODO_COUNT} occurrences)\","
fi

# --- Check 2: Large files >500 lines (-1 per 100 lines over, max -10 per file) ---
LARGE_FILE_PENALTY=0
while IFS= read -r f; do
  if [ -f "$f" ]; then
    LINES=$(wc -l < "$f" 2>/dev/null || echo 0)
    if [ "$LINES" -gt 500 ]; then
      OVER=$((LINES - 500))
      PEN=$((OVER / 100))
      [ "$PEN" -gt 10 ] && PEN=10
      LARGE_FILE_PENALTY=$((LARGE_FILE_PENALTY + PEN))
    fi
  fi
done <<< "$CHANGED_FILES"
if [ "$LARGE_FILE_PENALTY" -gt 0 ]; then
  [ "$LARGE_FILE_PENALTY" -gt 20 ] && LARGE_FILE_PENALTY=20
  SCORE=$((SCORE - LARGE_FILE_PENALTY))
  PENALTIES="${PENALTIES}\"large_files: -${LARGE_FILE_PENALTY}\","
fi

# --- Check 3: Deep nesting >4 levels (-3 each, max -15) ---
NESTING_COUNT=0
while IFS= read -r f; do
  if [ -f "$f" ]; then
    DEEP=$(grep -c '                ' "$f" 2>/dev/null || true)
    DEEP=$(echo "$DEEP" | tr -d '[:space:]')
    [ -z "$DEEP" ] && DEEP=0
    if [ "$DEEP" -gt 5 ]; then
      NESTING_COUNT=$((NESTING_COUNT + 1))
    fi
  fi
done <<< "$CHANGED_FILES"
if [ "$NESTING_COUNT" -gt 0 ]; then
  PENALTY=$((NESTING_COUNT * 3))
  [ "$PENALTY" -gt 15 ] && PENALTY=15
  SCORE=$((SCORE - PENALTY))
  PENALTIES="${PENALTIES}\"deep_nesting: -${PENALTY} (${NESTING_COUNT} files)\","
fi

# --- Check 4: Test file ratio ---
TEST_FILES=$(echo "$CHANGED_FILES" | grep -ci "test\|_test\.\|\.test\.\|spec\." || true)
TEST_FILES=$(echo "$TEST_FILES" | tr -d '[:space:]')
[ -z "$TEST_FILES" ] && TEST_FILES=0
SRC_FILES=$((FILE_COUNT - TEST_FILES))
if [ "$SRC_FILES" -gt 0 ] && [ "$TEST_FILES" -eq 0 ]; then
  PENALTY=10
  SCORE=$((SCORE - PENALTY))
  PENALTIES="${PENALTIES}\"no_tests: -${PENALTY} (${SRC_FILES} source files, 0 test files)\","
fi

# --- Check 5: Console.log / print debugging (-1 each, max -10) ---
DEBUG_COUNT=0
while IFS= read -r f; do
  if [ -f "$f" ] && ! echo "$f" | grep -qi "test"; then
    C=$(grep -ci "console\.log\|fmt\.Print\|println!\|print(" "$f" 2>/dev/null || true)
    C=$(echo "$C" | tr -d '[:space:]')
    [ -n "$C" ] && DEBUG_COUNT=$((DEBUG_COUNT + C))
  fi
done <<< "$CHANGED_FILES"
if [ "$DEBUG_COUNT" -gt 0 ]; then
  PENALTY=$DEBUG_COUNT
  [ "$PENALTY" -gt 10 ] && PENALTY=10
  SCORE=$((SCORE - PENALTY))
  PENALTIES="${PENALTIES}\"debug_prints: -${PENALTY} (${DEBUG_COUNT} occurrences)\","
fi

# --- Ensure score doesn't go below 0 ---
[ "$SCORE" -lt 0 ] && SCORE=0

# --- Remove trailing comma from penalties ---
PENALTIES=$(echo "$PENALTIES" | sed 's/,$//')

# --- Output JSON ---
cat <<EOF
{
  "score": ${SCORE},
  "max": 100,
  "breakdown": {
    "file_count": ${FILE_COUNT},
    "test_files": ${TEST_FILES},
    "src_files": ${SRC_FILES},
    "todo_count": ${TODO_COUNT},
    "large_file_penalty": ${LARGE_FILE_PENALTY},
    "deeply_nested_files": ${NESTING_COUNT},
    "debug_prints": ${DEBUG_COUNT}
  },
  "penalties": [${PENALTIES}]
}
EOF

exit 0
