#!/usr/bin/env bash
# preflight-env.sh — Verify Claude Code harness prerequisites for super-dev.
#
# super-dev relies on the experimental Agent Teams feature for direct peer
# messaging between agents (FINDING_SHARE, VALIDATED: PASS, etc.). Agent Teams
# is gated behind CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 and only ships in
# Claude Code v2.1.178+ (TeamCreate / TeamDelete were removed in that release;
# team setup is now automatic on first Agent spawn).
#
# Exit codes:
#   0 — all prerequisites met
#   2 — env var missing or version too old (caller should abort and surface the
#       printed remediation instructions to the user)
#
# Usage:
#   bash "${PLUGIN_ROOT}/scripts/preflight-env.sh"
#
# Notes:
# - Stage 1 of the super-dev workflow MUST run this before any Agent spawn.
# - Version check is best-effort; if `claude --version` is unavailable the
#   script warns but does not block (some sandboxed environments hide the CLI).

set -u

err() { printf "preflight: %s\n" "$*" >&2; }

# --- 1. Env var gate -------------------------------------------------------
if [[ "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-}" != "1" ]]; then
  err "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS is not set to 1."
  err ""
  err "super-dev requires Agent Teams (experimental). Enable it by one of:"
  err ""
  err "  A) Shell:    export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"
  err ""
  err "  B) settings.json (persistent):"
  err '       { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }'
  err ""
  err "Restart Claude Code after setting the variable."
  exit 2
fi

# --- 2. Claude Code version --------------------------------------------------
# Required: 2.1.178+ (TeamCreate/TeamDelete removed; auto team setup)
required_major=2
required_minor=1
required_patch=178

if ! command -v claude >/dev/null 2>&1; then
  err "warn: 'claude' CLI not on PATH — skipping version check"
  exit 0
fi

raw="$(claude --version 2>/dev/null | head -n1)"
# Match the first x.y.z token in the version line
ver="$(printf "%s" "$raw" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"
if [[ -z "$ver" ]]; then
  err "warn: could not parse 'claude --version' output: $raw — skipping version check"
  exit 0
fi

IFS=. read -r major minor patch <<<"$ver"

# Lexicographic compare on the (major, minor, patch) triple
if (( major < required_major )) \
  || (( major == required_major && minor < required_minor )) \
  || (( major == required_major && minor == required_minor && patch < required_patch )); then
  err "Claude Code $ver is older than the required ${required_major}.${required_minor}.${required_patch}."
  err ""
  err "Upgrade Claude Code, or pin to a release that ships the post-v2.1.178"
  err "Agent Teams (auto-setup, no TeamCreate). Older versions need a removed"
  err "TeamCreate call that super-dev no longer issues."
  exit 2
fi

printf "preflight: ok (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1, claude %s)\n" "$ver"
exit 0
