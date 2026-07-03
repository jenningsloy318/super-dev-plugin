#!/usr/bin/env node
/**
 * Hook: Block dangerous commands before execution.
 * PreToolUse hook for Bash tool.
 * Exit 2 = block, 0 = allow.
 */

import { createHook } from '../lib/hook-runtime.mjs';

/**
 * Dangerous command patterns — native RegExp for cross-platform matching.
 * Each entry: [pattern, description for the block message]
 */
const DANGEROUS = [
  [/rm\s+-rf\s+\/(?!\w)/, 'rm -rf /'],
  [/rm\s+-rf\s+~/, 'rm -rf ~'],
  [/rm\s+-rf\s+\.\./, 'rm -rf ..'],
  [/git\s+reset\s+--hard/, 'git reset --hard'],
  [/git\s+push\s.*--force(?!-)/, 'git push --force'],
  [/git\s+push\s.*-f\s/, 'git push -f'],
  [/git\s+push\s+-f$/, 'git push -f'],
  [/git\s+clean\s+-fd/, 'git clean -fd'],
  [/git\s+branch\s+-D/, 'git branch -D'],
  [/DROP\s+TABLE/i, 'DROP TABLE'],
  [/DROP\s+DATABASE/i, 'DROP DATABASE'],
  [/TRUNCATE\s+TABLE/i, 'TRUNCATE TABLE'],
  [/DELETE\s+FROM\s+\S+$/i, 'DELETE FROM (no WHERE clause)'],
  [/curl\s.*\|\s*(?:sh|bash)/, 'curl | sh'],
  [/wget\s.*\|\s*(?:sh|bash)/, 'wget | sh'],
  [/chmod\s+777/, 'chmod 777'],
  [/chmod\s+-R\s+777/, 'chmod -R 777'],
  [/chmod\s+\+s/, 'chmod +s (setuid)'],
  [/kubectl\s+delete\s+namespace/, 'kubectl delete namespace'],
  [/kubectl\s+delete\s.*--all/, 'kubectl delete --all'],
  [/npm\s+unpublish/, 'npm unpublish'],
  [/cargo\s+yank/, 'cargo yank'],
  [/mkfs\./, 'mkfs (format disk)'],
  [/dd\s+if=.*\s+of=\/dev\//, 'dd to device'],
  [/>\s*\/dev\/sd/, 'write to raw device'],
];

createHook(({ tool_input }) => {
  const cmd = tool_input?.command ?? '';
  if (!cmd) return;

  for (const [pattern, desc] of DANGEROUS) {
    if (pattern.test(cmd)) {
      process.stderr.write(`BLOCKED by super-dev safety hook: command matches dangerous pattern '${desc}'.\n`);
      process.stderr.write('Propose a safer alternative.\n');
      return 'block';
    }
  }
});
