#!/usr/bin/env node
/**
 * Hook: Require passing tests before creating a PR.
 * PreToolUse hook for mcp__github__create_pull_request.
 * Exit 2 = block PR creation, 0 = allow.
 */

import { createHook } from '../lib/hook-runtime.mjs';
import { findProjectRoot } from '../lib/fs.mjs';
import { detectTestRunner, run } from '../lib/toolchain.mjs';

createHook(() => {
  const root = findProjectRoot(process.cwd());
  const runner = detectTestRunner(root);

  // No test runner found — don't block projects without tests
  if (!runner) return;

  const result = run(runner.cmd, runner.args, { cwd: root, timeout: 120_000 });

  if (!result.ok) {
    process.stderr.write('BLOCKED: Tests are failing. Fix all test failures before creating a PR.\n');
    process.stderr.write('Run tests manually to see full output.\n');
    return 'block';
  }
});
