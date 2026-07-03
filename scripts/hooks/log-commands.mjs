#!/usr/bin/env node
/**
 * Hook: Log every command Claude runs with timestamps.
 * PreToolUse hook for Bash tool.
 * Append-only audit trail for debugging and accountability.
 */

import { createHook } from '../lib/hook-runtime.mjs';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

createHook(({ tool_input }) => {
  const cmd = tool_input?.command ?? '';
  if (!cmd) return;

  const dataDir = process.env.CLAUDE_PLUGIN_DATA || '/tmp/super-dev-data';
  mkdirSync(dataDir, { recursive: true });

  const logFile = join(dataDir, 'command-log.txt');
  const timestamp = new Date().toISOString();

  try {
    appendFileSync(logFile, `${timestamp} ${cmd}\n`);
  } catch { /* ignore write failures */ }
});
