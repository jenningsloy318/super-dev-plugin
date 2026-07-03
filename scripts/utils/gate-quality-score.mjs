#!/usr/bin/env node
/**
 * gate-quality-score.mjs — Code quality metrics scorer (standalone, informational).
 *
 * Computes a quality score (0-100) from measurable code metrics.
 * Output: JSON to stdout with score breakdown.
 * Always exits 0 — this is informational, not pass/fail.
 *
 * Usage: node gate-quality-score.mjs <worktree-path> [base-sha]
 */

import { readFileSync, existsSync } from 'node:fs';
import { extname } from 'node:path';
import { diffFiles } from '../lib/git.mjs';

const worktree = process.argv[2];
const baseSha = process.argv[3] || 'HEAD~1';

if (!worktree) {
  console.error('Usage: node gate-quality-score.mjs <worktree-path> [base-sha]');
  process.exit(1);
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.go', '.rs', '.py', '.kt', '.swift']);

// Get changed source files
const changedFiles = diffFiles(baseSha, 'HEAD', { cwd: worktree, filter: 'ACMR' })
  .filter(f => SOURCE_EXTENSIONS.has(extname(f)));

if (changedFiles.length === 0) {
  console.log(JSON.stringify({ score: 100, max: 100, breakdown: { no_source_changes: true }, penalties: [] }));
  process.exit(0);
}

let score = 100;
const penalties = [];
const fileCount = changedFiles.length;

// --- Check 1: TODO/FIXME/HACK count (-2 each, max -20) ---
let todoCount = 0;
for (const f of changedFiles) {
  const fullPath = `${worktree}/${f}`;
  if (!existsSync(fullPath)) continue;
  const content = readFileSync(fullPath, 'utf8');
  const matches = content.match(/\b(?:TODO|FIXME|HACK|XXX)\b/gi);
  todoCount += matches ? matches.length : 0;
}
if (todoCount > 0) {
  const penalty = Math.min(todoCount * 2, 20);
  score -= penalty;
  penalties.push(`todo_fixme: -${penalty} (${todoCount} occurrences)`);
}

// --- Check 2: Large files >500 lines (-1 per 100 lines over, max -10 per file) ---
let largeFilePenalty = 0;
for (const f of changedFiles) {
  const fullPath = `${worktree}/${f}`;
  if (!existsSync(fullPath)) continue;
  const lines = readFileSync(fullPath, 'utf8').split('\n').length;
  if (lines > 500) {
    const over = lines - 500;
    largeFilePenalty += Math.min(Math.floor(over / 100), 10);
  }
}
if (largeFilePenalty > 0) {
  largeFilePenalty = Math.min(largeFilePenalty, 20);
  score -= largeFilePenalty;
  penalties.push(`large_files: -${largeFilePenalty}`);
}

// --- Check 3: Deep nesting >4 levels (-3 each, max -15) ---
// Detect by 16+ leading spaces (4 levels × 4 spaces)
let nestingCount = 0;
for (const f of changedFiles) {
  const fullPath = `${worktree}/${f}`;
  if (!existsSync(fullPath)) continue;
  const content = readFileSync(fullPath, 'utf8');
  const deepLines = (content.match(/^ {16,}\S/gm) || []).length;
  if (deepLines > 5) nestingCount++;
}
if (nestingCount > 0) {
  const penalty = Math.min(nestingCount * 3, 15);
  score -= penalty;
  penalties.push(`deep_nesting: -${penalty} (${nestingCount} files)`);
}

// --- Check 4: Test file ratio ---
const testFiles = changedFiles.filter(f => /test|_test\.|\.test\.|spec\./i.test(f)).length;
const srcFiles = fileCount - testFiles;
if (srcFiles > 0 && testFiles === 0) {
  score -= 10;
  penalties.push(`no_tests: -10 (${srcFiles} source files, 0 test files)`);
}

// --- Check 5: Console.log / print debugging (-1 each, max -10) ---
let debugCount = 0;
for (const f of changedFiles) {
  if (/test/i.test(f)) continue; // Skip test files
  const fullPath = `${worktree}/${f}`;
  if (!existsSync(fullPath)) continue;
  const content = readFileSync(fullPath, 'utf8');
  const matches = content.match(/\bconsole\.log\b|fmt\.Print|println!|(?<!\w)print\(/gi);
  debugCount += matches ? matches.length : 0;
}
if (debugCount > 0) {
  const penalty = Math.min(debugCount, 10);
  score -= penalty;
  penalties.push(`debug_prints: -${penalty} (${debugCount} occurrences)`);
}

// Clamp
score = Math.max(score, 0);

console.log(JSON.stringify({
  score,
  max: 100,
  breakdown: {
    file_count: fileCount,
    test_files: testFiles,
    src_files: srcFiles,
    todo_count: todoCount,
    large_file_penalty: largeFilePenalty,
    deeply_nested_files: nestingCount,
    debug_prints: debugCount,
  },
  penalties,
}, null, 2));

process.exit(0);
