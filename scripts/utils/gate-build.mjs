#!/usr/bin/env node
/**
 * gate-build.mjs — Project Build & Test Verification (standalone).
 *
 * Operates on the PROJECT (not spec files). Detects project type and runs
 * build + test + typecheck as appropriate.
 *
 * Usage: node gate-build.mjs <project-dir>
 * Exit 0 = PASS, Exit 1 = FAIL
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectPM, run } from '../lib/toolchain.mjs';

const projectDir = process.argv[2];
if (!projectDir) {
  console.error('Usage: node gate-build.mjs <project-dir>');
  process.exit(1);
}

process.chdir(projectDir);

let pass = 0;
let fail = 0;
const errors = [];

function check(desc, result) {
  if (result) { pass++; }
  else { fail++; errors.push(`  FAIL: ${desc}`); }
}

// --- Detect and run ---
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
    const args = pm === 'npm' ? ['run', 'test', '--silent'] : ['test'];
    const result = run(pm, args, { timeout: 120_000 });
    check(`Tests pass (${pm})`, result.ok);
    if (!result.ok) errors.push(`    ${result.stderr.split('\n').slice(-5).join('\n    ')}`);
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
  check('Cargo tests pass', run('cargo', ['test'], { timeout: 120_000 }).ok);

} else if (existsSync('go.mod')) {
  console.log('  Running: go build ./...');
  check('Go build succeeds', run('go', ['build', './...'], { timeout: 120_000 }).ok);
  console.log('  Running: go test ./...');
  check('Go tests pass', run('go', ['test', './...'], { timeout: 120_000 }).ok);

} else if (existsSync('pyproject.toml') || existsSync('setup.py')) {
  console.log('  Running: pytest');
  const result = run('pytest', [], { timeout: 120_000 });
  if (result.ok || result.stderr.includes('no tests ran')) {
    check('Pytest passes', true);
  } else {
    check('Pytest passes', false);
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

if (fail > 0) {
  console.log('  Failures:');
  for (const e of errors) console.log(e);
  console.log('GATE RESULT: FAIL');
  process.exit(1);
}

console.log('GATE RESULT: PASS');
process.exit(0);
