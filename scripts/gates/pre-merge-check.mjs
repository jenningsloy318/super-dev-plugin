#!/usr/bin/env node
/**
 * Pre-Merge Gate — blocks Stage 14 (merge) unless all required stages completed.
 *
 * Usage:
 *   node pre-merge-check.mjs <tracking-json-path> [--skip-stages=N,N,N]
 *
 * Checks:
 *   1. All stages 1-14 have status "complete" or "skipped"
 *   2. Stages 12,13,14 are MANDATORY — cannot be "skipped" (unless user --skip)
 *   3. Stage 11 can only be "skipped" if explicitly in --skip-stages
 *   4. No stage has status "in_progress" or is missing entirely
 *
 * Exit codes:
 *   0 = PASS (merge allowed)
 *   1 = FAIL (blocking violations found)
 *   2 = ERROR (file not found, invalid JSON)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// --- Parse CLI ---
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node pre-merge-check.mjs <tracking-json-path> [--skip-stages=N,N,N]');
  process.exit(2);
}

const trackingPath = resolve(args[0]);
const skipArg = args.find(a => a.startsWith('--skip-stages='));
const userSkipStages = new Set(
  skipArg ? skipArg.split('=')[1].split(',').map(Number).filter(Boolean) : []
);

// --- Read tracking JSON ---
let tracking;
try {
  const raw = readFileSync(trackingPath, 'utf8');
  tracking = JSON.parse(raw);
} catch (e) {
  console.error(`ERROR: Cannot read/parse tracking JSON: ${trackingPath}`);
  console.error(e.message);
  process.exit(2);
}

// --- Extract stages from tracking ---
const stages = tracking.stages || tracking.pipeline?.stages || {};
const failures = [];

// All stages that should exist
const ALL_STAGES = [1, 2, 3, 4, 5, 6, 6.5, 7, 8, 9, 10, 11, 12, 13, 14];
// Stages that CANNOT be skipped without explicit user --skip flag
const MANDATORY_STAGES = [12, 13, 14];
// Stage 11 has special rule: only user --skip=11 can skip it
const TESTING_STAGE = 11;

for (const stageNum of ALL_STAGES) {
  const key = String(stageNum);
  const stage = stages[key];

  if (!stage) {
    // Stage 6.5 (prototype) is conditional — absence is OK
    if (stageNum === 6.5) continue;
    // Stage 4 (debug) is only for bugs — absence is OK
    if (stageNum === 4) continue;
    failures.push(`Stage ${stageNum}: NOT FOUND in tracking JSON`);
    continue;
  }

  const status = stage.status;

  if (status === 'complete') continue; // ✓

  if (status === 'skipped') {
    // Check if skip is allowed
    if (MANDATORY_STAGES.includes(stageNum) && !userSkipStages.has(stageNum)) {
      failures.push(`Stage ${stageNum} (${stage.name || ''}): MANDATORY — cannot be skipped without --skip=${stageNum}`);
    } else if (stageNum === TESTING_STAGE && !userSkipStages.has(stageNum)) {
      failures.push(`Stage ${stageNum} (Integration Testing): can only be skipped by user's --skip=11, not by agent judgment`);
    }
    continue;
  }

  if (status === 'in_progress') {
    failures.push(`Stage ${stageNum} (${stage.name || ''}): still IN_PROGRESS — not completed`);
    continue;
  }

  if (!status) {
    if (stageNum === 6.5 || stageNum === 4) continue; // conditional stages
    failures.push(`Stage ${stageNum}: no status field`);
  }
}

// --- Report ---
if (failures.length === 0) {
  console.log('PRE-MERGE CHECK: PASS');
  console.log(`All stages verified complete/skipped in ${trackingPath}`);
  process.exit(0);
} else {
  console.error('PRE-MERGE CHECK: FAIL');
  console.error(`${failures.length} violation(s) found:\n`);
  for (const f of failures) {
    console.error(`  ✗ ${f}`);
  }
  console.error(`\nMerge BLOCKED. Fix the above issues before proceeding.`);
  console.error(`User can override with: --skip=N,N,N for non-mandatory stages.`);
  process.exit(1);
}
