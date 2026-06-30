#!/bin/bash
# Post-Workflow Memory Persistence
#
# Extracts key decisions from workflow spec artifacts for project memory.
# Output goes to stdout as structured markdown suitable for memory storage.
#
# Usage: persist-workflow-memory.sh <spec-directory> <worktree-path>

set -uo pipefail

SPEC_DIR="${1:?Usage: persist-workflow-memory.sh <spec-directory> <worktree-path>}"
WORKTREE="${2:?Usage: persist-workflow-memory.sh <spec-directory> <worktree-path>}"

# Extract the feature/task name from specification
SPEC_FILE=$(find "$SPEC_DIR" -name "*specification*" -type f | head -1)
FEATURE_NAME="unknown"
if [ -n "$SPEC_FILE" ]; then
  FEATURE_NAME=$(grep -m1 "^# " "$SPEC_FILE" 2>/dev/null | sed 's/^# //' | sed 's/Specification: //' || echo "unknown")
fi

DATE=$(date +%Y-%m-%d)

# Start output
cat <<EOF
---
name: workflow-${DATE}-$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-' | head -c 40)
description: "Workflow decisions for: ${FEATURE_NAME}"
metadata:
  type: project
  date: ${DATE}
---

# Workflow Decisions: ${FEATURE_NAME}
## Date: ${DATE}

EOF

# --- Architecture Choices ---
ARCH_FILE=$(find "$SPEC_DIR" -name "*architecture*" -type f | head -1)
if [ -n "$ARCH_FILE" ]; then
  echo "### Architecture Choices"
  echo ""
  # Extract key headings and their first paragraph
  grep "^##\|^###" "$ARCH_FILE" 2>/dev/null | head -10 | while read -r line; do
    echo "- $line"
  done
  echo ""
fi

# --- Design Decisions (from spec) ---
if [ -n "$SPEC_FILE" ]; then
  echo "### Key Design Decisions"
  echo ""
  # Look for decision-related sections
  grep -A2 "Decision\|Approach\|Choice\|Trade-off\|Alternative" "$SPEC_FILE" 2>/dev/null | grep -v "^--$" | head -20
  echo ""
fi

# --- Rejected Alternatives (from spec review) ---
REVIEW_FILE=$(find "$SPEC_DIR" -name "*spec-review*" -o -name "*review*" -type f | head -1)
if [ -n "$REVIEW_FILE" ]; then
  echo "### Review Findings & Rejected Alternatives"
  echo ""
  grep -A1 "reject\|concern\|issue\|risk\|alternative" "$REVIEW_FILE" 2>/dev/null | grep -v "^--$" | head -15
  echo ""
fi

# --- Implementation Summary (key patterns established) ---
IMPL_SUMMARIES=$(find "$SPEC_DIR" -name "*implementation-summary*" -type f | sort)
if [ -n "$IMPL_SUMMARIES" ]; then
  echo "### Implementation Patterns Established"
  echo ""
  for f in $IMPL_SUMMARIES; do
    PHASE_NAME=$(grep -m1 "^# \|^## " "$f" 2>/dev/null | sed 's/^#* //')
    echo "- **${PHASE_NAME}**"
    # Extract key files created
    grep -oP '(?<=Created|Modified|Added):\s*.+' "$f" 2>/dev/null | head -3 | while read -r line; do
      echo "  - $line"
    done
  done
  echo ""
fi

# --- Test Patterns ---
echo "### Test Patterns"
echo ""
# Find test files created in this workflow
cd "$WORKTREE"
TEST_FILES=$(git diff --name-only --diff-filter=A HEAD~10..HEAD 2>/dev/null | grep -i "test\|spec\|_test\.\|\.test\." | head -10)
if [ -n "$TEST_FILES" ]; then
  echo "Test files created:"
  echo "$TEST_FILES" | while read -r f; do
    echo "- \`$f\`"
  done
else
  echo "No new test files detected in recent commits."
fi
echo ""

# --- Files Modified Summary ---
echo "### Files Modified"
echo ""
MODIFIED=$(git diff --stat HEAD~10..HEAD 2>/dev/null | tail -1)
echo "$MODIFIED"
echo ""
