#!/usr/bin/env node
/**
 * Hook: Auto-fix (format + lint) every file Claude touches.
 * PostToolUse hook for Write|Edit tools.
 * Merged: auto-format.sh + auto-lint.sh → single pass.
 */

import { createHook } from '../lib/hook-runtime.mjs';
import { findProjectRoot } from '../lib/fs.mjs';
import { detectFormatter, detectLinter, run } from '../lib/toolchain.mjs';
import { existsSync } from 'node:fs';
import { extname, dirname } from 'node:path';

/** Extensions that should never be formatted/linted */
const SKIP_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.yaml', '.yml', '.toml',
  '.lock', '.log', '.csv', '.png', '.jpg', '.gif', '.svg',
]);

createHook(({ tool_input }) => {
  const file = tool_input?.file_path ?? tool_input?.path ?? '';
  if (!file || !existsSync(file)) return;

  const ext = extname(file).slice(1); // without dot
  if (SKIP_EXTENSIONS.has(`.${ext}`)) return;

  const root = findProjectRoot(dirname(file));

  // Format first
  const formatter = detectFormatter(root, ext);
  if (formatter) {
    const args = formatter.args.map(a => a === '%f' ? file : a);
    run(formatter.cmd, args, { cwd: root, timeout: 15_000 });
  }

  // Then lint
  const linter = detectLinter(root, ext);
  if (linter) {
    const args = linter.args.map(a => a === '%f' ? file : a);
    run(linter.cmd, args, { cwd: root, timeout: 30_000 });
  }
});
