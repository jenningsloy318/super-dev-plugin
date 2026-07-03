/**
 * Hook Runtime — shared entry point for all Claude Code hooks.
 *
 * Handles:
 * - stdin JSON parsing (the hook protocol)
 * - Exit code semantics: 0 = allow, 2 = block
 * - Unhandled error safety: never block on hook bugs
 *
 * Usage:
 *   import { createHook } from '../lib/hook-runtime.mjs';
 *   createHook(input => { ... return 'block'; });
 */

import { readFileSync } from 'node:fs';

/**
 * Parse stdin JSON — the Claude Code hook contract.
 * Returns parsed object or null on parse failure.
 */
function readStdin() {
  try {
    const raw = readFileSync('/dev/stdin', 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Create and immediately execute a hook handler.
 *
 * @param {(input: object) => 'block' | 'allow' | void} handler
 *   Return 'block' to exit 2 (deny the tool use).
 *   Return anything else (or void) to exit 0 (allow).
 *   Throw to exit 0 (hooks should never accidentally block).
 */
export function createHook(handler) {
  const input = readStdin();
  if (!input) process.exit(0);

  try {
    const result = handler(input);
    process.exit(result === 'block' ? 2 : 0);
  } catch (err) {
    process.stderr.write(`[hook error] ${err.message}\n`);
    process.exit(0); // Never block on hook bugs
  }
}
