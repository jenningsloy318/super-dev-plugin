#!/bin/bash
# Gate: Review Verdict Check
# Verifies code review and/or adversarial review verdicts
#
# Usage: gate-review.sh <spec-dir> [--type code|adversarial|both]
#   --type code         Check only code review verdict
#   --type adversarial  Check only adversarial review verdict
#   --type both         Check both (default if omitted)
# Exit 0 = PASS, Exit 1 = FAIL

set -euo pipefail

SPEC_DIR="${1:?Usage: gate-review.sh <spec-dir> [--type code|adversarial|both]}"
shift
REVIEW_TYPE="both"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --type) REVIEW_TYPE="${2:-both}"; shift 2 ;;
        *) shift ;;
    esac
done

source "$(dirname "$0")/gate-lib.sh"

# --- Code review checks ---
if [ "$REVIEW_TYPE" = "code" ] || [ "$REVIEW_TYPE" = "both" ]; then
    CODE_REVIEW=$(find_spec_file "*code-review*")
    if [ -n "$CODE_REVIEW" ]; then
        # Check for approved verdict (use word boundaries to prevent substring matches)
        cr_verdict=$(grep -iP '\b(approved|changes requested|blocked)\b' "$CODE_REVIEW" | head -1 || echo "")
        is_approved=$(echo "$cr_verdict" | grep -ciP '\bapproved\b' || true)
        is_blocked=$(echo "$cr_verdict" | grep -ciP '\b(changes requested|blocked)\b' || true)

        check "Code review exists" "true"
        check "Code review approved (verdict: $(echo "$cr_verdict" | head -c 50))" "$([ "$is_approved" -gt 0 ] && [ "$is_blocked" -eq 0 ] && echo true || echo false)"

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
    ADV_REVIEW=$(find_spec_file "*adversarial*")
    if [ -n "$ADV_REVIEW" ]; then
        # Check for PASS verdict (use word boundaries to prevent substring matches)
        adv_verdict=$(grep -iP '\b(PASS|REJECT|HALT)\b' "$ADV_REVIEW" | head -1 || echo "")
        is_pass=$(echo "$adv_verdict" | grep -ciP '\bPASS\b' || true)
        is_reject=$(echo "$adv_verdict" | grep -ciP '\bREJECT\b' || true)

        check "Adversarial review exists" "true"
        check "Adversarial review PASS (verdict: $(echo "$adv_verdict" | head -c 50))" "$([ "$is_pass" -gt 0 ] && [ "$is_reject" -eq 0 ] && echo true || echo false)"
    else
        check "Adversarial review file exists" "false"
    fi
fi

gate_report "Review Verdicts"
