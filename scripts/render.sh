#!/bin/bash
# Render structured JSON data through a MiniJinja template to produce gate-compliant markdown.
#
# Prerequisites:
#   - minijinja-cli (install: curl -sSfL https://github.com/mitsuhiko/minijinja/releases/latest/download/minijinja-cli-installer.sh | sh)
#   - jq (install: apt install jq / brew install jq)
#
# Usage:
#   render.sh --template <file.j2> --data <data.json> --output <output.md>
#
# The template determines the exact output format (headings, bullet styles, ID patterns).
# Gate scripts validate the rendered output — with correct templates, gates always pass.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TEMPLATE=""
DATA=""
OUTPUT=""

usage() {
    echo "Usage: render.sh --template <file.j2> --data <data.json> --output <output.md>"
    echo ""
    echo "Options:"
    echo "  --template   Path to MiniJinja template (relative to plugin root or absolute)"
    echo "  --data       Path to JSON data file"
    echo "  --output     Path to write rendered markdown"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --template) TEMPLATE="$2"; shift 2 ;;
        --data)     DATA="$2"; shift 2 ;;
        --output)   OUTPUT="$2"; shift 2 ;;
        -h|--help)  usage ;;
        *) echo "ERROR: Unknown argument: $1"; usage ;;
    esac
done

# Validate required arguments
[[ -z "$TEMPLATE" ]] && { echo "ERROR: --template is required"; usage; }
[[ -z "$DATA" ]] && { echo "ERROR: --data is required"; usage; }
[[ -z "$OUTPUT" ]] && { echo "ERROR: --output is required"; usage; }

# Resolve template path (support relative to plugin root)
if [[ ! "$TEMPLATE" = /* ]]; then
    TEMPLATE="${PLUGIN_ROOT}/${TEMPLATE}"
fi

# Check prerequisites
if ! command -v minijinja-cli &>/dev/null; then
    echo "ERROR: minijinja-cli not found. Install:"
    echo "  curl -sSfL https://github.com/mitsuhiko/minijinja/releases/latest/download/minijinja-cli-installer.sh | sh"
    exit 1
fi

if ! command -v jq &>/dev/null; then
    echo "ERROR: jq not found. Install: apt install jq / brew install jq"
    exit 1
fi

# Validate inputs exist
[[ ! -f "$TEMPLATE" ]] && { echo "ERROR: Template not found: $TEMPLATE"; exit 1; }
[[ ! -f "$DATA" ]] && { echo "ERROR: Data file not found: $DATA"; exit 1; }

# Validate JSON is well-formed
if ! jq empty "$DATA" 2>/dev/null; then
    echo "ERROR: Invalid JSON in: $DATA"
    jq empty "$DATA"  # Print the actual error
    exit 1
fi

# Ensure output directory exists
mkdir -p "$(dirname "$OUTPUT")"

# Render template with data
if ! minijinja-cli "$TEMPLATE" "$DATA" > "$OUTPUT" 2>/tmp/minijinja-err.$$; then
    echo "ERROR: Template rendering failed"
    cat /tmp/minijinja-err.$$ 2>/dev/null
    rm -f /tmp/minijinja-err.$$
    exit 1
fi
rm -f /tmp/minijinja-err.$$

echo "OK: Rendered $(wc -c < "$OUTPUT" | tr -d ' ') bytes → $OUTPUT"
