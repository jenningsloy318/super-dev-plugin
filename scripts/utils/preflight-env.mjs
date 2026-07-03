#!/usr/bin/env node
/**
 * preflight-env.mjs — Verify Claude Code harness prerequisites for super-dev.
 *
 * Checks:
 * 1. CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 is set
 * 2. Claude Code version >= 2.1.178
 * 3. Reports plugin version from plugin.json
 *
 * Exit codes:
 *   0 — all prerequisites met
 *   2 — env var missing or version too old
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REQUIRED = { major: 2, minor: 1, patch: 178 };

function err(msg) { process.stderr.write(`preflight: ${msg}\n`); }

function readPluginVersion() {
  const pluginJson = join(__dirname, '..', '..', 'plugin.json');
  if (!existsSync(pluginJson)) {
    err(`warn: plugin.json not found at ${pluginJson} — plugin version unknown`);
    return 'unknown';
  }
  try {
    const pkg = JSON.parse(readFileSync(pluginJson, 'utf8'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

const pluginVersion = readPluginVersion();

// --- 1. Env var gate ---
if (process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS !== '1') {
  err('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS is not set to 1.');
  err('');
  err('super-dev requires Agent Teams (experimental). Enable it by one of:');
  err('');
  err('  A) Shell:    export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1');
  err('');
  err('  B) settings.json (persistent):');
  err('       { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }');
  err('');
  err('Restart Claude Code after setting the variable.');
  process.exit(2);
}

// --- 2. Claude Code version ---
const result = spawnSync('claude', ['--version'], { encoding: 'utf8', stdio: 'pipe' });

if (result.status !== 0 && result.error?.code === 'ENOENT') {
  err("warn: 'claude' CLI not on PATH — skipping version check");
  process.stdout.write(`preflight: ok (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1, claude version=unknown, plugin ${pluginVersion})\n`);
  process.exit(0);
}

const raw = (result.stdout || '').split('\n')[0] || '';
const verMatch = raw.match(/(\d+)\.(\d+)\.(\d+)/);

if (!verMatch) {
  err(`warn: could not parse 'claude --version' output: ${raw} — skipping version check`);
  process.stdout.write(`preflight: ok (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1, claude version=unparseable, plugin ${pluginVersion})\n`);
  process.exit(0);
}

const [, major, minor, patch] = verMatch.map(Number);

if (
  major < REQUIRED.major ||
  (major === REQUIRED.major && minor < REQUIRED.minor) ||
  (major === REQUIRED.major && minor === REQUIRED.minor && patch < REQUIRED.patch)
) {
  err(`Claude Code ${major}.${minor}.${patch} is older than the required ${REQUIRED.major}.${REQUIRED.minor}.${REQUIRED.patch}.`);
  err('');
  err('Upgrade Claude Code, or pin to a release that ships the post-v2.1.178');
  err('Agent Teams (auto-setup, no TeamCreate). Older versions need a removed');
  err('TeamCreate call that super-dev no longer issues.');
  process.exit(2);
}

process.stdout.write(`preflight: ok (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1, claude ${major}.${minor}.${patch}, plugin ${pluginVersion})\n`);
process.exit(0);
