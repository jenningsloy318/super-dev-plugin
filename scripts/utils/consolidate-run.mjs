#!/usr/bin/env node
/**
 * Consolidate Run — "Dreaming" post-workflow script.
 *
 * Reads a run's journal, extracts patterns, graduates candidates,
 * applies decay to existing patterns, and updates the index.
 *
 * Usage:
 *   node consolidate-run.mjs <journal-path> [--learnings-root <path>]
 *
 * Called fire-and-forget after Stage 14. Failure does not block the workflow.
 * Journal persists on disk regardless — can be rerun later.
 *
 * Exit codes:
 *   0 = Success (consolidation complete)
 *   1 = Partial (some patterns updated, some errors)
 *   2 = Error (journal not found or unreadable)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import {
  getLearningsRoot, loadIndex, saveIndex, savePattern, loadPattern,
  computeScore, meetsGraduation, nextPatternId, rebuildIndex,
  appendJournal, readJournal, pruneJournals, applyDecay,
} from '../lib/learnings.mjs';

// --- Parse CLI ---
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node consolidate-run.mjs <journal-path> [--learnings-root <path>]');
  process.exit(2);
}

const journalPath = resolve(args[0]);
const rootArgIdx = args.indexOf('--learnings-root');
const LEARNINGS_ROOT = rootArgIdx >= 0 ? args[rootArgIdx + 1] : getLearningsRoot();

if (!existsSync(journalPath)) {
  console.error(`Journal not found: ${journalPath}`);
  process.exit(2);
}

// --- Read journal ---
const events = readJournal(dirname(journalPath), journalPath.split('/').pop().replace('.jsonl', ''));
if (events.length === 0) {
  // Try reading directly
  const raw = readFileSync(journalPath, 'utf8').split('\n').filter(Boolean);
  events.push(...raw.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean));
}

if (events.length === 0) {
  console.error('Journal is empty — nothing to consolidate');
  process.exit(0); // Not an error — just nothing to do
}

console.log(`Consolidating ${events.length} events from ${journalPath}`);

// --- Extract signals from events ---
const signals = [];

for (const ev of events) {
  // Gate failures
  if (ev.event === 'gate' && !ev.pass) {
    signals.push({
      category: 'gate-failure',
      stage: ev.stage,
      symptom: `${ev.gate} FAIL: ${ev.error || 'unknown'}`,
      severity: 'high',
    });
  }

  // Stalls (agent timeout)
  if (ev.event === 'stall') {
    signals.push({
      category: 'stall',
      stage: ev.stage,
      symptom: `${ev.agent || 'unknown'} stalled for ${ev.timeout_ms}ms`,
      severity: 'critical',
    });
  }

  // Retries (attempt > 1)
  if (ev.event === 'gate' && ev.attempt > 1) {
    signals.push({
      category: 'retry',
      stage: ev.stage,
      symptom: `${ev.gate} needed ${ev.attempt} attempts`,
      severity: 'medium',
    });
  }

  // Stage duration anomalies (will check against baselines)
  if (ev.event === 'end' && ev.duration_ms) {
    signals.push({
      category: 'timing',
      stage: ev.stage,
      duration_ms: ev.duration_ms,
      severity: 'info',
    });
  }
}

console.log(`Extracted ${signals.length} signals`);

// --- Match signals against existing patterns ---
const index = loadIndex(LEARNINGS_ROOT);
let patternsUpdated = 0;
let candidatesCreated = 0;

for (const signal of signals) {
  if (signal.category === 'timing') continue; // timing → baselines, not patterns

  // Find matching pattern in index
  const match = (index.hot_patterns || []).find(p =>
    p.category === signal.category && p.stage === signal.stage
  );

  if (match) {
    // Update existing pattern
    const pattern = loadPattern(LEARNINGS_ROOT, match.id, match.category);
    if (pattern) {
      pattern.evidence = pattern.evidence || {};
      pattern.evidence.occurrences = (pattern.evidence.occurrences || 0) + 1;
      pattern.evidence.last_seen = new Date().toISOString().slice(0, 10);
      pattern.evidence.last_run_number = index.total_runs + 1;
      pattern.score = computeScore(pattern, index.total_runs + 1);
      savePattern(LEARNINGS_ROOT, pattern);
      patternsUpdated++;
    }
  } else {
    // New candidate — check if we should graduate it
    // For now, create pattern directly if severity is high+
    if (signal.severity === 'critical' || signal.severity === 'high') {
      const id = nextPatternId(index);
      const newPattern = {
        id,
        category: signal.category,
        stage: signal.stage,
        score: 0.4, // initial score (below injection threshold)
        status: 'active',
        summary: signal.symptom,
        description: signal.symptom,
        symptoms: [signal.symptom],
        mitigation: '', // to be filled by future consolidation with LLM
        evidence: {
          occurrences: 1,
          distinct_projects: 1,
          distinct_runs: 1,
          first_seen: new Date().toISOString().slice(0, 10),
          last_seen: new Date().toISOString().slice(0, 10),
          last_run_number: index.total_runs + 1,
        },
        scoring: {
          frequency: 0.1,
          impact: signal.severity === 'critical' ? 1.0 : 0.7,
          confidence: 0.3,
          recency: 1.0,
          effectiveness: 0.5,
        },
      };
      newPattern.score = computeScore(newPattern, index.total_runs + 1);
      savePattern(LEARNINGS_ROOT, newPattern);
      index.total_patterns = (index.total_patterns || 0) + 1;
      candidatesCreated++;
    }
  }
}

// --- Update baselines (stage timings) ---
const timings = signals.filter(s => s.category === 'timing');
// TODO: update baselines/stage-timings.json with running mean/stddev

// --- Apply decay + prune ---
applyDecay(LEARNINGS_ROOT, (index.total_runs || 0) + 1);

// --- Update run count + rebuild index ---
index.total_runs = (index.total_runs || 0) + 1;
index.last_consolidation = new Date().toISOString();
saveIndex(LEARNINGS_ROOT, index);

// Rebuild hot_patterns from all pattern files
rebuildIndex(LEARNINGS_ROOT);

// --- Prune old journals ---
pruneJournals(LEARNINGS_ROOT, 30);

// --- Report ---
console.log(`\nConsolidation complete:`);
console.log(`  Patterns updated: ${patternsUpdated}`);
console.log(`  New candidates: ${candidatesCreated}`);
console.log(`  Total runs: ${index.total_runs}`);
console.log(`  Total patterns: ${index.total_patterns}`);
