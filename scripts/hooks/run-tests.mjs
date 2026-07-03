#!/usr/bin/env node
/**
 * Hook: Run tests after every edit (opt-in via SUPER_DEV_TEST_ON_EDIT=1).
 * PostToolUse hook for Write|Edit tools.
 */

import { createHook } from '../lib/hook-runtime.mjs';
import { findProjectRoot } from '../lib/fs.mjs';
import { detectTestRunner, run } from '../lib/toolchain.mjs';
import { existsSync } from 'node:fs';
import { extname, dirname } from 'node:path';

/** Extensions that never trigger tests */
const SKIP_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.yaml', '.yml', '.toml',
  '.lock', '.log', '.csv',
]);

createHook(({ tool_input }) => {
  if (process.env.SUPER_DEV_TEST_ON_EDIT !== '1') return;

  const file = tool_input?.file_path ?? tool_input?.path ?? '';
  if (!file || !existsSync(file)) return;

  const ext = extname(file);
  if (SKIP_EXTENSIONS.has(ext)) return;

  const root = findProjectRoot(dirname(file));
  const runner = detectTestRunner(root);
  if (!runner) return;

  const result = run(runner.cmd, runner.args, { cwd: root, timeout: 60_000 });
  // Print last 20 lines of output for visibility
  const lines = (result.stdout || result.stderr).split('\n');
  const tail = lines.slice(-20).join('\n');
  if (tail) process.stdout.write(tail + '\n');
});
