#!/usr/bin/env node
/**
 * Usage tracker for super-dev plugin.
 * Logs skill and agent invocations to ${PLUGIN_DATA}/global/usage.log
 *
 * Called by PreToolUse hook when Skill or Agent tools are invoked.
 * Input: JSON via stdin with tool_name, tool_input fields.
 */

import { createHook } from '../lib/hook-runtime.mjs';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

createHook((input) => {
  const toolName = input.tool_name ?? 'unknown';
  const toolInput = input.tool_input ?? {};

  const dataDir = process.env.CLAUDE_PLUGIN_DATA || '/tmp/super-dev-data';
  const globalDir = join(dataDir, 'global');
  mkdirSync(globalDir, { recursive: true });

  const usageLog = join(globalDir, 'usage.log');
  const statsFile = join(globalDir, 'stats.json');
  const timestamp = new Date().toISOString();

  // Determine what was invoked
  let entry = null;
  let name = 'unknown';

  switch (toolName) {
    case 'Skill': {
      name = toolInput.skill_name ?? toolInput.name ?? 'unknown';
      entry = { ts: timestamp, type: 'skill', name };
      break;
    }
    case 'Agent': {
      name = toolInput.subagent_type ?? 'general';
      const desc = toolInput.description ?? '';
      entry = { ts: timestamp, type: 'agent', name, desc };
      break;
    }
    default:
      return; // Not a skill/agent invocation
  }

  // Append to log
  try {
    appendFileSync(usageLog, JSON.stringify(entry) + '\n');
  } catch { /* ignore */ }

  // Update stats.json
  let stats = { version: '1.0.0', total_invocations: 0, skills: {}, agents: {}, last_updated: '' };
  if (existsSync(statsFile)) {
    try { stats = JSON.parse(readFileSync(statsFile, 'utf8')); } catch { /* use default */ }
  }

  stats.total_invocations++;
  stats.last_updated = timestamp;

  if (toolName === 'Skill') {
    stats.skills[name] = (stats.skills[name] || 0) + 1;
  } else {
    stats.agents[name] = (stats.agents[name] || 0) + 1;
  }

  try {
    writeFileSync(statsFile, JSON.stringify(stats, null, 2) + '\n');
  } catch { /* ignore */ }
});
