#!/bin/bash
# Gate: Handoff AC Coverage Assessment (conditional)
# When iteration.loops > 0 OR implementationPhases.length > 1 OR a pivot
# occurred (revised spec files OR deep-research-report-pivot present),
# verifies the handoff document includes a "AC Coverage Assessment" section
# with the three required subsections.
#
# Pairs with agents/handoff-writer.md step 2.5.
#
# Usage: gate-handoff.sh <spec-dir>
# Exit 0 = PASS (assessment present when required, or not required)
# Exit 1 = FAIL (assessment missing when required, or malformed)

set -euo pipefail

SPEC_DIR="${1:?Usage: gate-handoff.sh <spec-dir>}"
source "$(dirname "$0")/gate-lib.sh"

if [ ! -d "$SPEC_DIR" ]; then
    echo "GATE FAIL: Spec directory not found: ${SPEC_DIR}"
    exit 1
fi

# H1: handoff file exists
handoff_file=$(find "$SPEC_DIR" -maxdepth 1 -name '*-handoff.md' -type f 2>/dev/null | head -1 || true)
if [ -z "$handoff_file" ] || [ ! -f "$handoff_file" ]; then
    check "handoff file exists" "false"
    gate_report "Handoff AC Coverage Assessment"
fi
check "handoff file exists" "true"

# H2: detect whether AC Coverage Assessment is required
tracking_file=$(find "$SPEC_DIR" -maxdepth 1 -name '*-workflow-tracking.json' -type f 2>/dev/null | head -1 || true)

required="false"
reason=""

if [ -n "$tracking_file" ] && [ -f "$tracking_file" ]; then
    if command -v python3 >/dev/null; then
        loops=$(python3 -c "
import json
try:
    j = json.load(open('$tracking_file'))
    iter_obj = j.get('iteration', {})
    print(iter_obj.get('loops', 0))
except Exception:
    print(0)
" 2>/dev/null || echo 0)
        phases=$(python3 -c "
import json
try:
    j = json.load(open('$tracking_file'))
    print(len(j.get('implementationPhases', [])))
except Exception:
    print(0)
" 2>/dev/null || echo 0)

        if [ "$loops" -gt 0 ] 2>/dev/null; then
            required="true"
            reason="iteration.loops=${loops} > 0"
        fi
        if [ "$phases" -gt 1 ] 2>/dev/null; then
            required="true"
            reason="${reason}${reason:+; }implementationPhases.length=${phases} > 1"
        fi
    fi
fi

# Pivot artifacts detection
pivot_specs=$(find "$SPEC_DIR" -maxdepth 1 -name '*-specification-r[0-9]*.md' -type f 2>/dev/null | wc -l | tr -d ' ')
pivot_research=$(find "$SPEC_DIR" -maxdepth 1 \( -name '*deep-research-report-pivot*.md' -o -name '*-pivot-*.md' \) -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$pivot_specs" -gt 0 ] 2>/dev/null || [ "$pivot_research" -gt 0 ] 2>/dev/null; then
    required="true"
    reason="${reason}${reason:+; }pivot artifacts present (revised-spec=${pivot_specs}, pivot-research=${pivot_research})"
fi

if [ "$required" = "false" ]; then
    echo "  AC Coverage Assessment not required (no pivot indicators)"
    check "AC Coverage Assessment not required for this spec" "true"
    gate_report "Handoff AC Coverage Assessment"
fi

echo "  AC Coverage Assessment IS required: ${reason}"

# H3: AC Coverage Assessment section heading present
has_section=$(grep -ciE '^#+ AC Coverage Assessment|^## AC Coverage' "$handoff_file" 2>/dev/null || echo 0)
check "AC Coverage Assessment section present" \
      "$([ "$has_section" -gt 0 ] && echo true || echo false)"

# H4: three required subsections
has_planned=$(grep -ciE 'met as planned|met-as-planned' "$handoff_file" 2>/dev/null || echo 0)
check "ACs met as planned subsection" \
      "$([ "$has_planned" -gt 0 ] && echo true || echo false)"

has_alternative=$(grep -ciE 'met by alternative|alternative mechanism|met-by-alternative' "$handoff_file" 2>/dev/null || echo 0)
check "ACs met by alternative mechanism subsection" \
      "$([ "$has_alternative" -gt 0 ] && echo true || echo false)"

has_superseded=$(grep -ciE 'superseded|ACs superseded' "$handoff_file" 2>/dev/null || echo 0)
check "ACs superseded subsection" \
      "$([ "$has_superseded" -gt 0 ] && echo true || echo false)"

# H5: at least one AC-ID referenced in the section (sanity: not empty placeholder)
ac_count=$(grep -cE 'AC-[0-9]+' "$handoff_file" 2>/dev/null || echo 0)
check "at least one AC-ID referenced (found: ${ac_count})" \
      "$([ "$ac_count" -gt 0 ] && echo true || echo false)"

gate_report "Handoff AC Coverage Assessment"
