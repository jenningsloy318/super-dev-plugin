#!/usr/bin/env node
/**
 * Hook: Auto-checkpoint on stop.
 * Stop hook — creates a recoverable git checkpoint of uncommitted changes.
 * Uses `git stash create` to make a commit object WITHOUT modifying the working tree.
 */

import { createHook } from '../lib/hook-runtime.mjs';
import { isGitRepo, isDirty, stashCreate, updateRef, currentBranch } from '../lib/git.mjs';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

createHook(() => {
  if (!isGitRepo()) return;
  if (!isDirty()) return;

  const timestamp = new Date().toISOString();
  const branch = currentBranch();
  const sha = stashCreate(`super-dev checkpoint: ${branch} at ${timestamp}`);
  if (!sha) return;

  // Store in checkpoint log
  const dataDir = process.env.CLAUDE_PLUGIN_DATA || '/tmp/super-dev-data';
  mkdirSync(dataDir, { recursive: true });
  const logFile = join(dataDir, 'checkpoints.log');

  try {
    appendFileSync(logFile, `${timestamp} ${branch} ${sha}\n`);
  } catch { /* ignore */ }

  // Also store as a git ref for easier discovery
  const refName = `refs/super-dev-checkpoints/${timestamp.replace(/[:.]/g, '-')}`;
  updateRef(refName, sha);
});
