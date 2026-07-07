#!/usr/bin/env node
/**
 * gate-build.mjs — Project Build & Test Verification (standalone).
 *
 * Operates on the PROJECT (not spec files). Detects project type and runs
 * build + test + typecheck as appropriate.
 *
 * REGRESSION-ONLY TEST MODE: If a baseline file exists at
 * <project-dir>/.test-baseline.json, only NEW test failures are considered
 * regressions. Pre-existing failures (in the baseline) are logged as warnings
 * but do NOT fail the gate.
 *
 * Usage:
 *   node gate-build.mjs <project-dir>                    — normal mode
 *   node gate-build.mjs <project-dir> --capture-baseline — capture current failures as baseline
 *
 * Exit 0 = PASS, Exit 1 = FAIL
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectPM, run } from '../lib/toolchain.mjs';

const args = process.argv.slice(2);
const projectDir = args.find(a => !a.startsWith('--'));
const captureBaseline = args.includes('--capture-baseline');

if (!projectDir) {
  console.error('Usage: node gate-build.mjs <project-dir> [--capture-baseline]');
  process.exit(1);
}

process.chdir(projectDir);

const BASELINE_PATH = join(projectDir, '.test-baseline.json');

let pass = 0;
let fail = 0;
const errors = [];

function check(desc, result) {
  if (result) { pass++; }
  else { fail++; errors.push(`  FAIL: ${desc}`); }
}

/**
 * Load baseline of known-failing tests (if exists).
 * Format: { "failing_tests": ["test name 1", "test name 2", ...] }
 */
function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Extract test failure names from stderr/stdout.
 * Handles common test runner output formats.
 */
function extractFailingTests(output) {
  const failures = new Set();
  // Vitest/Jest: "FAIL src/foo.test.ts > test name"
  for (const m of output.matchAll(/FAIL\s+(.+?)(?:\s+>|$)/gm)) {
    failures.add(m[1].trim());
  }
  // Vitest/Jest: "✕ test name" or "× test name"
  for (const m of output.matchAll(/[✕×]\s+(.+?)$/gm)) {
    failures.add(m[1].trim());
  }
  // pytest: "FAILED tests/test_foo.py::test_name"
  for (const m of output.matchAll(/FAILED\s+(.+?)(?:\s+-|$)/gm)) {
    failures.add(m[1].trim());
  }
  // cargo test: "test foo::bar ... FAILED"
  for (const m of output.matchAll(/test\s+(.+?)\s+\.\.\.\s+FAILED/gm)) {
    failures.add(m[1].trim());
  }
  // go test: "--- FAIL: TestName"
  for (const m of output.matchAll(/---\s+FAIL:\s+(.+?)(?:\s|$)/gm)) {
    failures.add(m[1].trim());
  }
  return [...failures];
}

// --- Detect and run ---
let testOutput = '';
let testPassed = true;

if (existsSync('package.json')) {
  const pm = detectPM('.');
  let pkg;
  try { pkg = JSON.parse(readFileSync('package.json', 'utf8')); } catch { pkg = {}; }

  if (pkg.scripts?.build) {
    console.log(`  Running: ${pm} run build`);
    const result = run(pm, ['run', 'build'], { timeout: 120_000 });
    check(`Build succeeds (${pm})`, result.ok);
    if (!result.ok) errors.push(`    ${result.stderr.split('\n').slice(-5).join('\n    ')}`);
  }

  if (pkg.scripts?.test) {
    console.log(`  Running: ${pm} test`);
    const testArgs = pm === 'npm' ? ['run', 'test', '--silent'] : ['test'];
    const result = run(pm, testArgs, { timeout: 120_000 });
    testOutput = (result.stdout || '') + '\n' + (result.stderr || '');
    testPassed = result.ok;

    if (!result.ok) {
      // Check if failures are only pre-existing (baseline)
      const baseline = loadBaseline();
      const currentFailures = extractFailingTests(testOutput);

      if (captureBaseline) {
        // Save current failures as baseline
        writeFileSync(BASELINE_PATH, JSON.stringify({ failing_tests: currentFailures, captured_at: 'workflow-start' }, null, 2));
        console.log(`  Baseline captured: ${currentFailures.length} pre-existing failures`);
        check(`Tests pass (${pm})`, true); // Don't fail on capture mode
      } else if (baseline) {
        const knownFailures = new Set(baseline.failing_tests || []);
        const regressions = currentFailures.filter(t => !knownFailures.has(t));
        const preExisting = currentFailures.filter(t => knownFailures.has(t));

        if (regressions.length === 0) {
          // All failures are pre-existing — NOT a regression
          console.log(`  ⚠ ${preExisting.length} pre-existing test failure(s) (in baseline — not regressions)`);
          if (preExisting.length > 0) {
            console.log(`    Known failures: ${preExisting.slice(0, 5).join(', ')}${preExisting.length > 5 ? '...' : ''}`);
          }
          check(`Tests pass (${pm}) [regression-only mode]`, true);
        } else {
          // NEW failures = regressions = FAIL
          console.log(`  ✗ ${regressions.length} NEW test failure(s) (regressions):`);
          for (const r of regressions.slice(0, 10)) {
            console.log(`    - ${r}`);
          }
          if (preExisting.length > 0) {
            console.log(`  ⚠ (plus ${preExisting.length} pre-existing failures — ignored)`);
          }
          check(`Tests pass (${pm})`, false);
          errors.push(`    Regressions: ${regressions.join(', ')}`);
        }
      } else {
        // No baseline exists — all failures count (original behavior)
        check(`Tests pass (${pm})`, false);
        if (!result.ok) errors.push(`    ${result.stderr.split('\n').slice(-5).join('\n    ')}`);
      }
    } else {
      check(`Tests pass (${pm})`, true);
    }
  }

  if (pkg.scripts?.typecheck || existsSync('tsconfig.json')) {
    console.log('  Running: npx tsc --noEmit');
    const result = run('npx', ['tsc', '--noEmit'], { timeout: 60_000 });
    check('Type check passes', result.ok);
    if (!result.ok) errors.push(`    ${result.stderr.split('\n').slice(-5).join('\n    ')}`);
  }

} else if (existsSync('Cargo.toml')) {
  console.log('  Running: cargo build');
  check('Cargo build succeeds', run('cargo', ['build'], { timeout: 120_000 }).ok);
  console.log('  Running: cargo test');
  const result = run('cargo', ['test'], { timeout: 120_000 });
  testOutput = (result.stdout || '') + '\n' + (result.stderr || '');
  testPassed = result.ok;

  if (!result.ok) {
    const baseline = loadBaseline();
    const currentFailures = extractFailingTests(testOutput);
    if (baseline) {
      const regressions = currentFailures.filter(t => !new Set(baseline.failing_tests).has(t));
      if (regressions.length === 0) {
        console.log(`  ⚠ ${currentFailures.length} pre-existing test failure(s) — not regressions`);
        check('Cargo tests pass [regression-only]', true);
      } else {
        check('Cargo tests pass', false);
        errors.push(`    Regressions: ${regressions.join(', ')}`);
      }
    } else {
      check('Cargo tests pass', false);
    }
  } else {
    check('Cargo tests pass', true);
  }

} else if (existsSync('go.mod')) {
  console.log('  Running: go build ./...');
  check('Go build succeeds', run('go', ['build', './...'], { timeout: 120_000 }).ok);
  console.log('  Running: go test ./...');
  const result = run('go', ['test', './...'], { timeout: 120_000 });
  testOutput = (result.stdout || '') + '\n' + (result.stderr || '');
  if (!result.ok) {
    const baseline = loadBaseline();
    const currentFailures = extractFailingTests(testOutput);
    if (baseline) {
      const regressions = currentFailures.filter(t => !new Set(baseline.failing_tests).has(t));
      if (regressions.length === 0) {
        check('Go tests pass [regression-only]', true);
      } else {
        check('Go tests pass', false);
      }
    } else {
      check('Go tests pass', false);
    }
  } else {
    check('Go tests pass', true);
  }

} else if (existsSync('pyproject.toml') || existsSync('setup.py')) {
  console.log('  Running: pytest');
  const result = run('pytest', [], { timeout: 120_000 });
  if (result.ok || result.stderr.includes('no tests ran')) {
    check('Pytest passes', true);
  } else {
    const baseline = loadBaseline();
    const currentFailures = extractFailingTests((result.stdout || '') + '\n' + (result.stderr || ''));
    if (baseline) {
      const regressions = currentFailures.filter(t => !new Set(baseline.failing_tests).has(t));
      if (regressions.length === 0) {
        check('Pytest passes [regression-only]', true);
      } else {
        check('Pytest passes', false);
      }
    } else {
      check('Pytest passes', false);
    }
  }

} else {
  console.log('  Warning: Could not detect project type');
  pass++;
}

// --- Report ---
const total = pass + fail;
console.log(`GATE: Build & Test Verification`);
console.log(`  Project: ${projectDir}`);
console.log(`  Score: ${pass}/${total} checks passed`);
if (existsSync(BASELINE_PATH)) {
  console.log(`  Mode: regression-only (baseline exists)`);
}

if (fail > 0) {
  console.log('  Failures:');
  for (const e of errors) console.log(e);
  console.log('GATE RESULT: FAIL');
  process.exit(1);
}

console.log('GATE RESULT: PASS');
process.exit(0);
