/**
 * Learnings Library — manages the persistent knowledge base across workflow runs.
 *
 * Storage: ~/.claude/plugins/super-dev/learnings/
 *   index.json            — master index (always loaded, lightweight)
 *   patterns/<category>/PAT-NNN.json — one file per graduated pattern
 *   baselines/stage-timings.json     — aggregated stage duration stats
 *   journals/run-<ts>.jsonl          — raw per-run event log (last 30)
 *
 * Two access patterns:
 *   1. Proactive: top-N patterns pre-loaded at workflow start
 *   2. Reactive: index lookup when agent encounters symptom mid-run
 *
 * Zero external dependencies. Node.js built-in only.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

// =============================================================================
// PATHS
// =============================================================================

/**
 * Resolve the learnings root directory. Priority:
 *   1. Explicit pluginDataPath argument (from workflow args.plugin_root + '/data')
 *   2. CLAUDE_PLUGIN_DATA env var (if harness resolves it)
 *   3. ~/.claude/plugins/marketplaces/super-dev/data/ (installed plugin)
 *   4. Fallback: ~/.local/share/super-dev/learnings/
 *
 * The 'data/' subdirectory persists across plugin updates because it's
 * inside the marketplace working copy (not the versioned cache).
 */
export function getLearningsRoot(pluginDataPath) {
  if (pluginDataPath) return join(pluginDataPath, 'learnings');

  const home = process.env.HOME || process.env.USERPROFILE || '/tmp';

  // Check CLAUDE_PLUGIN_DATA (harness-resolved)
  if (process.env.CLAUDE_PLUGIN_DATA) {
    return join(process.env.CLAUDE_PLUGIN_DATA, 'learnings');
  }

  // Marketplace install path (persists across plugin updates)
  const marketplacePath = join(home, '.claude/plugins/marketplaces/super-dev/data/learnings');
  if (existsSync(join(home, '.claude/plugins/marketplaces/super-dev'))) {
    return marketplacePath;
  }

  // Fallback: XDG-style local data
  return join(home, '.local/share/super-dev/learnings');
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

// =============================================================================
// INDEX
// =============================================================================

const EMPTY_INDEX = {
  version: 2,
  total_patterns: 0,
  total_runs: 0,
  last_consolidation: null,
  categories: {},
  hot_patterns: [],
};

/**
 * Load the master index. Returns empty index if not found.
 */
export function loadIndex(root) {
  const p = join(root, 'index.json');
  if (!existsSync(p)) return { ...EMPTY_INDEX };
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return { ...EMPTY_INDEX };
  }
}

/**
 * Save the master index atomically.
 */
export function saveIndex(root, index) {
  ensureDir(root);
  writeFileSync(join(root, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
}

// =============================================================================
// PATTERNS
// =============================================================================

/**
 * Load a specific pattern by ID.
 */
export function loadPattern(root, id, category) {
  const p = join(root, 'patterns', category, `${id}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save a pattern file.
 */
export function savePattern(root, pattern) {
  const dir = join(root, 'patterns', pattern.category);
  ensureDir(dir);
  writeFileSync(join(dir, `${pattern.id}.json`), JSON.stringify(pattern, null, 2), 'utf8');
}

/**
 * Delete a pattern file.
 */
export function deletePattern(root, id, category) {
  const p = join(root, 'patterns', category, `${id}.json`);
  if (existsSync(p)) unlinkSync(p);
}

/**
 * Query patterns by category and/or stage. Returns matches sorted by score.
 */
export function queryPatterns(root, { category, stage, minScore = 0.3, limit = 5 } = {}) {
  const index = loadIndex(root);
  let candidates = index.hot_patterns || [];

  if (category) candidates = candidates.filter(p => p.category === category);
  if (stage != null) candidates = candidates.filter(p => p.stage === stage);
  candidates = candidates.filter(p => p.score >= minScore);

  // hot_patterns is already sorted by score in index
  const topIds = candidates.slice(0, limit);

  // Load full pattern files for the top matches
  return topIds.map(p => loadPattern(root, p.id, p.category)).filter(Boolean);
}

/**
 * Get top-N patterns (pre-loaded at workflow start).
 */
export function getTopPatterns(root, n = 5) {
  const index = loadIndex(root);
  const top = (index.hot_patterns || []).slice(0, n);
  return top.map(p => loadPattern(root, p.id, p.category)).filter(Boolean);
}

// =============================================================================
// SCORING
// =============================================================================

const SCORE_WEIGHTS = {
  frequency: 0.3,
  impact: 0.3,
  confidence: 0.2,
  recency: 0.1,
  effectiveness: 0.1,
};

/**
 * Compute composite score for a pattern.
 */
export function computeScore(pattern, totalRelevantRuns = 100) {
  const s = pattern.scoring || {};
  const frequency = Math.min(1, (pattern.evidence?.occurrences || 0) / Math.max(1, totalRelevantRuns * 0.1));
  const impact = s.impact ?? 0.5;
  const confidence = Math.min(1, (pattern.evidence?.distinct_projects || 0) / 3);
  const runsSinceLast = s._runs_since_last ?? 0;
  const recency = Math.max(0, 1 - (runsSinceLast / 20));
  const effectiveness = s.effectiveness ?? 0.5;

  const score = (
    frequency * SCORE_WEIGHTS.frequency +
    impact * SCORE_WEIGHTS.impact +
    confidence * SCORE_WEIGHTS.confidence +
    recency * SCORE_WEIGHTS.recency +
    effectiveness * SCORE_WEIGHTS.effectiveness
  );

  return Math.round(score * 100) / 100;
}

// =============================================================================
// GRADUATION
// =============================================================================

const GRADUATION_THRESHOLD = {
  minOccurrences: 3,
  minDistinctRuns: 2,
  minConfidence: 0.6,
};

/**
 * Check if a candidate pattern meets graduation criteria.
 */
export function meetsGraduation(candidate) {
  const ev = candidate.evidence || {};
  return (
    (ev.occurrences || 0) >= GRADUATION_THRESHOLD.minOccurrences &&
    (ev.distinct_runs || 0) >= GRADUATION_THRESHOLD.minDistinctRuns
  );
}

/**
 * Generate next pattern ID.
 */
export function nextPatternId(index) {
  return `PAT-${String((index.total_patterns || 0) + 1).padStart(3, '0')}`;
}

// =============================================================================
// INDEX REBUILD
// =============================================================================

/**
 * Rebuild index from all pattern files on disk.
 */
export function rebuildIndex(root) {
  const patternsDir = join(root, 'patterns');
  if (!existsSync(patternsDir)) return { ...EMPTY_INDEX };

  const categories = {};
  const allPatterns = [];

  for (const cat of readdirSync(patternsDir, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    const catDir = join(patternsDir, cat.name);
    const files = readdirSync(catDir).filter(f => f.endsWith('.json'));

    let topScore = 0;
    for (const f of files) {
      try {
        const pattern = JSON.parse(readFileSync(join(catDir, f), 'utf8'));
        allPatterns.push(pattern);
        if (pattern.score > topScore) topScore = pattern.score;
      } catch { /* skip corrupt files */ }
    }

    categories[cat.name] = { count: files.length, top_score: topScore };
  }

  // Sort by score descending
  allPatterns.sort((a, b) => (b.score || 0) - (a.score || 0));

  const index = {
    version: 2,
    total_patterns: allPatterns.length,
    total_runs: loadIndex(root).total_runs || 0,
    last_consolidation: new Date().toISOString(),
    categories,
    hot_patterns: allPatterns.slice(0, 20).map(p => ({
      id: p.id,
      score: p.score,
      category: p.category,
      stage: p.stage,
      summary: p.summary,
    })),
  };

  saveIndex(root, index);
  return index;
}

// =============================================================================
// JOURNAL
// =============================================================================

/**
 * Append an event to the current run's journal.
 */
export function appendJournal(root, runId, event) {
  const dir = join(root, 'journals');
  ensureDir(dir);
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n';
  writeFileSync(join(dir, `${runId}.jsonl`), line, { flag: 'a' });
}

/**
 * Read a run's journal as array of events.
 */
export function readJournal(root, runId) {
  const p = join(root, 'journals', `${runId}.jsonl`);
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

/**
 * Prune journals older than N runs (keep most recent).
 */
export function pruneJournals(root, keepCount = 30) {
  const dir = join(root, 'journals');
  if (!existsSync(dir)) return;

  const files = readdirSync(dir)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({ name: f, mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const f of files.slice(keepCount)) {
    unlinkSync(join(dir, f.name));
  }
}

// =============================================================================
// DECAY + PRUNE
// =============================================================================

/**
 * Apply recency decay to all patterns. Called during consolidation.
 * Patterns not triggered in 10+ runs → dormant.
 * Dormant for 50+ runs → pruned.
 */
export function applyDecay(root, currentRunCount) {
  const index = loadIndex(root);
  const patternsDir = join(root, 'patterns');
  if (!existsSync(patternsDir)) return;

  for (const cat of readdirSync(patternsDir, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    const catDir = join(patternsDir, cat.name);

    for (const f of readdirSync(catDir).filter(f => f.endsWith('.json'))) {
      const p = join(catDir, f);
      try {
        const pattern = JSON.parse(readFileSync(p, 'utf8'));
        const lastRun = pattern.evidence?.last_run_number || 0;
        const runsSince = currentRunCount - lastRun;

        pattern.scoring = pattern.scoring || {};
        pattern.scoring._runs_since_last = runsSince;

        if (runsSince >= 50 && pattern.status === 'dormant') {
          // Prune
          unlinkSync(p);
          continue;
        }

        if (runsSince >= 10 && pattern.status === 'active') {
          pattern.status = 'dormant';
        }

        // Recompute score
        pattern.score = computeScore(pattern, currentRunCount);
        writeFileSync(p, JSON.stringify(pattern, null, 2), 'utf8');
      } catch { /* skip corrupt */ }
    }
  }
}
