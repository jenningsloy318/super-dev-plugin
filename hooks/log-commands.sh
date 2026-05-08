#!/usr/bin/env bash
# Hook #7: Log every command Claude runs with timestamps
# PreToolUse hook for Bash tool
# Append-only audit trail for debugging and accountability
set -euo pipefail

INPUT=$(cat)
cmd=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

[ -z "$cmd" ] && exit 0

PLUGIN_DATA="${CLAUDE_PLUGIN_DATA:-${extensionPath:+${extensionPath}/.data}}"
PLUGIN_DATA="${PLUGIN_DATA:-/tmp/super-dev-data}"
LOG_DIR="$PLUGIN_DATA"
LOG_FILE="${LOG_DIR}/command-log.txt"

printf '%s %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$cmd" >> "$LOG_FILE" 2>/dev/null || true

exit 0
