#!/usr/bin/env node
/**
 * Hook: Protect sensitive files from edits.
 * PreToolUse hook for Edit|Write tools.
 * Exit 2 = block, 0 = allow.
 */

import { createHook } from '../lib/hook-runtime.mjs';
import { basename, relative } from 'node:path';

/** Patterns matched against the file's basename */
const BASENAME_PATTERNS = [
  /^\.env$/i,
  /^\.env\./i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /\.keystore$/i,
  /^id_rsa/i,
  /^id_ed25519/i,
  /\.secret$/i,
  /^token\.json$/i,
  /^service-account.*\.json$/i,
];

/** Patterns matched against the relative path */
const PATH_PATTERNS = [
  /^secrets\//i,
  /^\.git\//i,
  /^credentials\//i,
];

createHook(({ tool_input }) => {
  const file = tool_input?.file_path ?? tool_input?.path ?? '';
  if (!file) return;

  const name = basename(file);
  const relPath = process.cwd() ? relative(process.cwd(), file) : file;

  for (const pattern of BASENAME_PATTERNS) {
    if (pattern.test(name)) {
      process.stderr.write(`BLOCKED by super-dev safety hook: '${file}' is a protected sensitive file.\n`);
      process.stderr.write('Explain why this edit is necessary and request an override.\n');
      return 'block';
    }
  }

  for (const pattern of PATH_PATTERNS) {
    if (pattern.test(relPath)) {
      process.stderr.write(`BLOCKED by super-dev safety hook: '${file}' is in a protected directory.\n`);
      process.stderr.write('Explain why this edit is necessary and request an override.\n');
      return 'block';
    }
  }
});
