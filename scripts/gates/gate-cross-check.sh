#!/bin/bash
# Gate: Cross-Check (Spec vs Implementation Contradiction Detection)
#
# Detects structural contradictions between spec artifacts and actual implementation:
# 1. Task completion vs files: tasks marked done should have corresponding file changes
# 2. API routes in spec vs router: defined endpoints should exist in handler/router files
# 3. Module boundaries: architecture-defined modules should exist in file tree
# 4. Router wiring: handlers should be registered in router files
#
# Usage: gate-cross-check.sh <spec-directory> <worktree-path>
# Exit 0 = PASS, Exit 1 = FAIL

set -uo pipefail

SPEC_DIR="${1:?Usage: gate-cross-check.sh <spec-directory> <worktree-path>}"
WORKTREE="${2:?Usage: gate-cross-check.sh <spec-directory> <worktree-path>}"
source "$(dirname "$0")/gate-lib.sh"

FINDINGS=0

# --- Check 1: Task-list files vs actual files ---
TASK_LIST=$(find "$SPEC_DIR" -name "*task-list*" -type f | head -1)
if [ -n "$TASK_LIST" ]; then
  # Extract file paths from task-list (lines matching "Files: ..." or "- Files: ...")
  SPEC_FILES=$(grep -i "Files:" "$TASK_LIST" 2>/dev/null | sed 's/.*Files:[[:space:]]*//' | tr ',' '\n' | sed 's/^ *//;s/ *$//' | grep -v '^$' | sort -u || true)

  if [ -n "$SPEC_FILES" ]; then
    MISSING_FILES=""
    while IFS= read -r f; do
      # Strip backticks and leading/trailing whitespace
      f=$(echo "$f" | tr -d '`' | sed 's/^ *//;s/ *$//')
      [ -z "$f" ] && continue
      # Check if file exists in worktree (resolve relative paths)
      if [ ! -f "$WORKTREE/$f" ] && [ ! -d "$WORKTREE/$f" ]; then
        MISSING_FILES="$MISSING_FILES\n  - $f"
      fi
    done <<< "$SPEC_FILES"

    if [ -n "$MISSING_FILES" ]; then
      echo "⚠️  CROSS-CHECK: Files listed in task-list but missing from implementation:"
      echo -e "$MISSING_FILES"
      FINDINGS=$((FINDINGS + 1))
    else
      echo "✓ All task-list files exist in worktree"
    fi
  fi
else
  echo "⚠️  No task-list found in spec directory — skipping file check"
fi

# --- Check 2: API routes in spec vs implementation ---
SPEC_FILE=$(find "$SPEC_DIR" -name "*specification*" -type f | head -1)
if [ -n "$SPEC_FILE" ]; then
  # Extract API endpoint patterns (GET /api/..., POST /api/..., etc.)
  API_ENDPOINTS=$(grep -oE '(GET|POST|PUT|PATCH|DELETE)[[:space:]]+/[a-zA-Z0-9/_:{}.-]+' "$SPEC_FILE" 2>/dev/null | sort -u || true)

  if [ -n "$API_ENDPOINTS" ]; then
    MISSING_ROUTES=""
    while IFS= read -r endpoint; do
      [ -z "$endpoint" ] && continue
      METHOD=$(echo "$endpoint" | awk '{print $1}')
      PATH_PATTERN=$(echo "$endpoint" | awk '{print $2}' | sed 's/{[^}]*}//g' | sed 's|/:|/|g' | tr -d '{}')
      # Strip path params to get a searchable fragment
      SEARCH_FRAGMENT=$(echo "$PATH_PATTERN" | grep -oP '/[a-zA-Z0-9_-]+' | tail -1)
      [ -z "$SEARCH_FRAGMENT" ] && continue

      # Search for this route fragment in Go/TS/Python router files
      if ! grep -rl "$SEARCH_FRAGMENT" "$WORKTREE" --include="*.go" --include="*.ts" --include="*.py" --include="*.js" 2>/dev/null | grep -qi "rout\|handler\|controller\|app\." >/dev/null 2>&1; then
        # Broader search
        if ! grep -rl "$SEARCH_FRAGMENT" "$WORKTREE" --include="*.go" --include="*.ts" --include="*.py" --include="*.js" 2>/dev/null | head -1 >/dev/null 2>&1; then
          MISSING_ROUTES="$MISSING_ROUTES\n  - $endpoint"
        fi
      fi
    done <<< "$API_ENDPOINTS"

    if [ -n "$MISSING_ROUTES" ]; then
      echo "⚠️  CROSS-CHECK: API endpoints in spec but not found in implementation:"
      echo -e "$MISSING_ROUTES"
      FINDINGS=$((FINDINGS + 1))
    else
      echo "✓ All spec API endpoints found in implementation"
    fi
  fi
fi

# --- Check 3: Module/package boundaries ---
ARCH_FILE=$(find "$SPEC_DIR" -name "*architecture*" -type f | head -1)
if [ -n "$ARCH_FILE" ]; then
  # Extract directory/module paths mentioned in architecture (lines with src/, pkg/, internal/, lib/, etc.)
  MODULES=$(grep -oE '(src|pkg|internal|lib|app|crates|modules)/[a-zA-Z0-9_-]+' "$ARCH_FILE" 2>/dev/null | sort -u || true)

  if [ -n "$MODULES" ]; then
    MISSING_MODULES=""
    while IFS= read -r mod; do
      [ -z "$mod" ] && continue
      if [ ! -d "$WORKTREE/$mod" ]; then
        MISSING_MODULES="$MISSING_MODULES\n  - $mod"
      fi
    done <<< "$MODULES"

    if [ -n "$MISSING_MODULES" ]; then
      echo "⚠️  CROSS-CHECK: Modules in architecture doc but missing from file tree:"
      echo -e "$MISSING_MODULES"
      FINDINGS=$((FINDINGS + 1))
    else
      echo "✓ All architecture modules exist in file tree"
    fi
  fi
fi

# --- Check 4: Implementation plan phase count vs tracking ---
PLAN_FILE=$(find "$SPEC_DIR" -name "*implementation-plan*" -type f | head -1)
if [ -n "$PLAN_FILE" ]; then
  PLAN_PHASES=$(grep -c "^## Phase [0-9]" "$PLAN_FILE" 2>/dev/null || echo 0)
  TRACKING_FILE=$(find "$SPEC_DIR" -name "*tracking*" -type f | head -1)
  if [ -n "$TRACKING_FILE" ] && [ "$PLAN_PHASES" -gt 0 ]; then
    TRACKING_PHASES=$(grep -c '"phaseNumber"' "$TRACKING_FILE" 2>/dev/null || echo 0)
    if [ "$TRACKING_PHASES" -gt 0 ] && [ "$PLAN_PHASES" -ne "$TRACKING_PHASES" ]; then
      echo "⚠️  CROSS-CHECK: Implementation plan has $PLAN_PHASES phases but tracking JSON has $TRACKING_PHASES"
      FINDINGS=$((FINDINGS + 1))
    else
      echo "✓ Phase count matches between plan and tracking"
    fi
  fi
fi

# --- Final verdict ---
echo ""
if [ "$FINDINGS" -eq 0 ]; then
  echo "CROSS-CHECK: PASS (0 contradictions detected)"
  exit 0
else
  echo "CROSS-CHECK: FAIL ($FINDINGS contradiction(s) detected)"
  echo "Review findings above and resolve before proceeding."
  exit 1
fi
