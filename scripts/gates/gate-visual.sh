#!/bin/bash
# Gate: Visual Verification Artifacts
# Verifies that visual-verifier produced artifacts (or a non-visual skip marker)
# in {spec-dir}/artifacts/. Pairs with agents/visual-verifier.md (Step 9.4).
#
# Usage: gate-visual.sh <spec-dir>
# Exit 0 = PASS (artifacts found OR non-visual skip marker present)
# Exit 1 = FAIL (no artifacts and no skip marker)

set -euo pipefail

SPEC_DIR="${1:?Usage: gate-visual.sh <spec-dir>}"
source "$(dirname "$0")/gate-lib.sh"

if [ ! -d "$SPEC_DIR" ]; then
    echo "GATE FAIL: Spec directory not found: ${SPEC_DIR}"
    exit 1
fi

ARTIFACTS_DIR="${SPEC_DIR}/artifacts"

# V1: artifacts directory exists (created by visual-verifier even for skip case)
if [ ! -d "$ARTIFACTS_DIR" ]; then
    check "artifacts/ directory exists" "false"
    gate_report "Visual Verification Artifacts"
fi
check "artifacts/ directory exists" "true"

# V2: visual-report file exists at the canonical location
report_file=$(find "$SPEC_DIR" -maxdepth 1 -name '*-visual-report.md' -type f 2>/dev/null | head -1 || true)
if [ -z "$report_file" ] || [ ! -f "$report_file" ]; then
    check "visual-report.md file exists" "false"
    gate_report "Visual Verification Artifacts"
fi
check "visual-report.md file exists" "true"

# V3: either non-visual marker OR at least one render artifact must be present
if [ -f "${ARTIFACTS_DIR}/.non-visual" ]; then
    # Non-visual phase explicitly skipped — that's a valid PASS
    echo "  SKIPPED — non-visual phase (marker found at ${ARTIFACTS_DIR}/.non-visual)"
    check "non-visual phase explicitly marked" "true"
    gate_report "Visual Verification Artifacts"
fi

# Otherwise must have at least one rendered artifact
artifact_count=$(find "$ARTIFACTS_DIR" -maxdepth 1 -type f \
    \( -name '*.png' -o -name '*.jpg' -o -name '*.webp' -o -name '*.snapshot' \) \
    2>/dev/null | wc -l | tr -d ' ')

check "at least one render artifact (PNG/JPG/WEBP/snapshot) present (found: ${artifact_count})" \
      "$([ "$artifact_count" -ge 1 ] && echo true || echo false)"

# V4: report mentions tier choice
if [ -n "$report_file" ]; then
    has_tier=$(grep -ciE 'tier\s*[123]|tier-?[123]|Tier 1|Tier 2|Tier 3' "$report_file" 2>/dev/null || echo 0)
    check "report documents tier choice (Tier 1/2/3)" \
          "$([ "$has_tier" -gt 0 ] && echo true || echo false)"
fi

# V5: report includes reviewer instructions
if [ -n "$report_file" ]; then
    has_review=$(grep -ciE 'reviewer|read.*artifact|inspect' "$report_file" 2>/dev/null || echo 0)
    check "report includes reviewer instructions" \
          "$([ "$has_review" -gt 0 ] && echo true || echo false)"
fi

gate_report "Visual Verification Artifacts"
