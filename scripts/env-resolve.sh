#!/usr/bin/env bash
# Platform-agnostic path resolution for super-dev plugin
# Supports: Claude Code (CLAUDE_PLUGIN_ROOT/CLAUDE_PLUGIN_DATA)
#           Gemini CLI (extensionPath/workspacePath)
#
# Source this file in any script that needs plugin paths:
#   source "$(dirname "$0")/env-resolve.sh"
#   — or —
#   source "$(dirname "$0")/../scripts/env-resolve.sh"

# PLUGIN_ROOT: where plugin files (agents, scripts, templates) live
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  PLUGIN_ROOT="$CLAUDE_PLUGIN_ROOT"
elif [ -n "${extensionPath:-}" ]; then
  PLUGIN_ROOT="$extensionPath"
else
  # Fallback: derive from script location (assumes script is in scripts/ or scripts/gates/)
  _SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ "$_SCRIPT_DIR" == */scripts/gates ]]; then
    PLUGIN_ROOT="$(dirname "$(dirname "$_SCRIPT_DIR")")"
  elif [[ "$_SCRIPT_DIR" == */scripts ]]; then
    PLUGIN_ROOT="$(dirname "$_SCRIPT_DIR")"
  elif [[ "$_SCRIPT_DIR" == */hooks ]]; then
    PLUGIN_ROOT="$(dirname "$_SCRIPT_DIR")"
  else
    PLUGIN_ROOT="$_SCRIPT_DIR"
  fi
  unset _SCRIPT_DIR
fi

# PLUGIN_DATA: persistent directory for state that survives updates
if [ -n "${CLAUDE_PLUGIN_DATA:-}" ]; then
  PLUGIN_DATA="$CLAUDE_PLUGIN_DATA"
elif [ -n "${extensionPath:-}" ]; then
  PLUGIN_DATA="${extensionPath}/.plugin-data"
  mkdir -p "$PLUGIN_DATA" 2>/dev/null || true
else
  PLUGIN_DATA="/tmp/super-dev-plugin-data"
  mkdir -p "$PLUGIN_DATA" 2>/dev/null || true
fi

export PLUGIN_ROOT
export PLUGIN_DATA
