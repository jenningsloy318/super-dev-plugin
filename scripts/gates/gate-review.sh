#!/bin/bash
# Gate: Review Verdict Check
# Verifies code review and/or adversarial review verdicts
#
# Usage:
#   gate-review.sh <spec-dir> --type code --file <code-review-path>
#   gate-review.sh <spec-dir> --type adversarial --file <adversarial-path>
#   gate-review.sh <spec-dir> --type both  (legacy: searches for files)
#
# Exit 0 = PASS, Exit 1 = FAIL

set -euo pipefail

SPEC_DIR="${1:?Usage: gate-review.sh <spec-dir> --type code|adversarial|both --file <path>}"
shift
REVIEW_TYPE="both"
EXPLICIT_FILE=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --type) REVIEW_TYPE="${2:-both}"; shift 2 ;;
        --file) EXPLICIT_FILE="${2:-}"; shift 2 ;;
        *) shift ;;
    esac
done

source "$(dirname "$0")/gate-lib.sh"

# --- Code review checks ---
if [ "$REVIEW_TYPE" = "code" ] || [ "$REVIEW_TYPE" = "both" ]; then
    if [ -n "$EXPLICIT_FILE" ] && [ "$REVIEW_TYPE" = "code" ]; then
        CODE_REVIEW="$EXPLICIT_FILE"
    else
        CODE_REVIEW=$(find_spec_file "*code-review*")
    fi

    if [ -n "$CODE_REVIEW" ] && [ -f "$CODE_REVIEW" ]; then
        # Extract structured verdict line (anchored to "Verdict" marker)
        cr_verdict=$(grep -iE '^\s*(\*{0,2}\s*verdict)' "$CODE_REVIEW" | head -1 || echo "")
        # Fallback: scan for verdict keywords if no structured line found
        if [ -z "$cr_verdict" ]; then
            cr_verdict=$(grep -iwE '(approved|changes requested|blocked)' "$CODE_REVIEW" | head -1 || echo "")
        fi
        # Word-boundary match: -w prevents "unapproved" matching "approved"
        is_approved=$(echo "$cr_verdict" | grep -ciw 'approved' || true)
        is_blocked=$(echo "$cr_verdict" | grep -ciw 'changes requested\|blocked' || true)
        # Reject negated forms explicitly
        is_negated=$(echo "$cr_verdict" | grep -ciE 'not approved|unapproved' || true)

        check "Code review exists" "true"
        check "Code review approved (verdict: $(echo "$cr_verdict" | head -c 50))" "$([ "$is_approved" -gt 0 ] && [ "$is_blocked" -eq 0 ] && [ "$is_negated" -eq 0 ] && echo true || echo false)"

        # Check no critical issues remain
        critical_findings=$(grep -cE '\*\*Critical\*\*' "$CODE_REVIEW" 2>/dev/null || true)
        critical_nonzero=$(grep -cE '\|\s*Critical\s*\|\s*[1-9]' "$CODE_REVIEW" 2>/dev/null || true)
        critical_count=$((critical_findings + critical_nonzero))
        check "No critical issues (found: ${critical_count})" "$([ "$critical_count" -eq 0 ] && echo true || echo false)"
    else
        check "Code review file exists" "false"
    fi
fi

# --- Adversarial review checks ---
if [ "$REVIEW_TYPE" = "adversarial" ] || [ "$REVIEW_TYPE" = "both" ]; then
    if [ -n "$EXPLICIT_FILE" ] && [ "$REVIEW_TYPE" = "adversarial" ]; then
        ADV_REVIEW="$EXPLICIT_FILE"
    else
        ADV_REVIEW=$(find_spec_file "*adversarial*")
    fi

    if [ -n "$ADV_REVIEW" ] && [ -f "$ADV_REVIEW" ]; then
        # Extract structured verdict line (anchored to "Verdict" marker)
        adv_verdict=$(grep -iE '^\s*(\*{0,2}\s*verdict)' "$ADV_REVIEW" | head -1 || echo "")
        # Fallback: scan for verdict tokens if no structured line found
        if [ -z "$adv_verdict" ]; then
            adv_verdict=$(grep -wE '(PASS|REJECT|HALT)' "$ADV_REVIEW" | head -1 || echo "")
        fi
        # Word-boundary match with -w
        is_pass=$(echo "$adv_verdict" | grep -cw 'PASS' || true)
        is_reject=$(echo "$adv_verdict" | grep -cw 'REJECT' || true)

        check "Adversarial review exists" "true"
        check "Adversarial review PASS (verdict: $(echo "$adv_verdict" | head -c 50))" "$([ "$is_pass" -gt 0 ] && [ "$is_reject" -eq 0 ] && echo true || echo false)"
    else
        check "Adversarial review file exists" "false"
    fi
fi

gate_report "Review Verdicts"
