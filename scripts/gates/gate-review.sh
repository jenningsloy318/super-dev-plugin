#!/bin/bash
# Gate: Review Document Structure Validation
# Validates that review documents exist and contain a parseable verdict from
# the known vocabulary. Does NOT enforce verdict favorability — the workflow
# script handles semantic routing (CONTEST → fix path, REJECT → escalation).
#
# Usage:
#   gate-review.sh <spec-dir> --type code --file <code-review-path>
#   gate-review.sh <spec-dir> --type adversarial --file <adversarial-path>
#   gate-review.sh <spec-dir> --type both  (legacy: searches for files)
#
# Exit 0 = PASS (structurally valid), Exit 1 = FAIL (missing/unparseable)

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
# Valid verdicts: Approved, Approved with Comments, Changes Requested, Blocked
# Gate passes if ANY of these is found (structural validity).
if [ "$REVIEW_TYPE" = "code" ] || [ "$REVIEW_TYPE" = "both" ]; then
    if [ -n "$EXPLICIT_FILE" ] && [ "$REVIEW_TYPE" = "code" ]; then
        CODE_REVIEW="$EXPLICIT_FILE"
    else
        CODE_REVIEW=$(find_spec_file "*code-review*")
    fi

    if [ -n "$CODE_REVIEW" ] && [ -f "$CODE_REVIEW" ]; then
        # Extract structured verdict line (anchored to "Verdict" marker)
        cr_verdict=$(grep -iE '^\s*(\*{0,2}\s*verdict)' "$CODE_REVIEW" | head -1 || echo "")
        # Fallback: scan for any valid verdict keyword
        if [ -z "$cr_verdict" ]; then
            cr_verdict=$(grep -iwE '(approved|changes requested|blocked)' "$CODE_REVIEW" | head -1 || echo "")
        fi
        # Structural check: does a recognized verdict exist?
        has_verdict=$(echo "$cr_verdict" | grep -ciE '\b(approved|changes requested|blocked)\b' || true)

        check "Code review exists" "true"
        check "Code review has parseable verdict (found: $(echo "$cr_verdict" | head -c 60))" "$([ "$has_verdict" -gt 0 ] && echo true || echo false)"
    else
        check "Code review file exists" "false"
    fi
fi

# --- Adversarial review checks ---
# Valid verdicts: PASS, CONTEST, REJECT
# Gate passes if ANY of these is found (structural validity).
# CONTEST means "real findings exist" — it is a valid verdict, NOT a format error.
if [ "$REVIEW_TYPE" = "adversarial" ] || [ "$REVIEW_TYPE" = "both" ]; then
    if [ -n "$EXPLICIT_FILE" ] && [ "$REVIEW_TYPE" = "adversarial" ]; then
        ADV_REVIEW="$EXPLICIT_FILE"
    else
        ADV_REVIEW=$(find_spec_file "*adversarial*")
    fi

    if [ -n "$ADV_REVIEW" ] && [ -f "$ADV_REVIEW" ]; then
        # Extract structured verdict line (anchored to "Verdict" marker)
        adv_verdict=$(grep -iE '^\s*(\*{0,2}\s*verdict)' "$ADV_REVIEW" | head -1 || echo "")
        # Fallback: scan for any valid verdict token (PASS, CONTEST, or REJECT)
        if [ -z "$adv_verdict" ]; then
            adv_verdict=$(grep -wE '(PASS|CONTEST|REJECT)' "$ADV_REVIEW" | head -1 || echo "")
        fi
        # Structural check: does a recognized verdict exist?
        has_verdict=$(echo "$adv_verdict" | grep -cwE 'PASS\|CONTEST\|REJECT' || true)
        # Fallback: try individual matches (grep -w with alternation can be finicky)
        if [ "$has_verdict" -eq 0 ]; then
            has_pass=$(echo "$adv_verdict" | grep -cw 'PASS' || true)
            has_contest=$(echo "$adv_verdict" | grep -cw 'CONTEST' || true)
            has_reject=$(echo "$adv_verdict" | grep -cw 'REJECT' || true)
            has_verdict=$((has_pass + has_contest + has_reject))
        fi

        check "Adversarial review exists" "true"
        check "Adversarial review has parseable verdict (found: $(echo "$adv_verdict" | head -c 60))" "$([ "$has_verdict" -gt 0 ] && echo true || echo false)"
    else
        check "Adversarial review file exists" "false"
    fi
fi

gate_report "Review Document Structure"
