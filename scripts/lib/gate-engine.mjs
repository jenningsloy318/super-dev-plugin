/**
 * Gate Engine — declarative gate executor.
 *
 * Replaces 16 separate gate-*.sh scripts with a single engine that evaluates
 * gate definitions expressed as data objects.
 *
 * Concepts:
 *  - A Gate has a name, a target file pattern, and an array of Checks.
 *  - A Check can be: pattern match, min size, cross-reference, or custom function.
 *  - The engine runs all checks, tallies PASS/FAIL, and produces a report.
 *  - Exit 0 = all checks pass, Exit 1 = at least one failure.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveSpecFile, findSpecFile, resolveInput, readIfExists } from './fs.mjs';

/**
 * @typedef {object} CheckResult
 * @property {string} desc - Description of what was checked
 * @property {boolean} pass - Whether it passed
 * @property {string} [detail] - Additional detail on failure
 */

/**
 * Execute a single check against file content.
 *
 * @param {object} check - Check definition
 * @param {string} content - File content to check against
 * @param {string} filePath - Path to the file (for size checks)
 * @returns {CheckResult}
 */
function executeCheck(check, content, filePath) {
  // Pattern match: count occurrences, require >= min
  if (check.pattern) {
    const regex = check.pattern instanceof RegExp
      ? check.pattern
      : new RegExp(check.pattern, check.flags || 'gi');

    // For multiline patterns, we need to match per-line or globally
    const matches = content.match(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'));
    const count = matches ? matches.length : 0;
    const min = check.min || 1;
    const pass = count >= min;

    return {
      desc: `${check.desc} (found: ${count}, min: ${min})`,
      pass,
      detail: pass ? undefined : `Expected at least ${min} matches, found ${count}`,
    };
  }

  // Minimum file size (bytes)
  if (check.minSize != null) {
    const size = Buffer.byteLength(content, 'utf8');
    const pass = size > check.minSize;
    return {
      desc: `${check.desc || 'Has substance'} (>${check.minSize} chars, actual: ${size})`,
      pass,
      detail: pass ? undefined : `File is only ${size} bytes, expected >${check.minSize}`,
    };
  }

  // Custom check function
  if (check.fn) {
    return check.fn(content, filePath);
  }

  return { desc: check.desc || 'Unknown check', pass: true };
}

/**
 * Run a full gate definition against a spec directory.
 *
 * @param {object} gate - Gate definition from definitions.mjs
 * @param {string} specDir - Path to spec directory
 * @param {object} [opts] - Options
 * @param {string} [opts.gateFile] - Explicit file path (overrides pattern search)
 * @param {string} [opts.worktree] - Worktree path (for project-level checks)
 * @returns {{ name: string, pass: boolean, results: CheckResult[], score: string }}
 */
export function runGate(gate, specDir, opts = {}) {
  const results = [];

  // Resolve primary file
  const file = resolveSpecFile(specDir, gate.file, opts.gateFile);
  if (!file) {
    return {
      name: gate.name,
      pass: false,
      results: [{ desc: `${gate.file} exists`, pass: false, detail: `Not found in ${specDir}` }],
      score: '0/1',
    };
  }

  const content = readFileSync(file, 'utf8');

  // Run all checks
  for (const check of gate.checks) {
    results.push(executeCheck(check, content, file));
  }

  // Cross-reference checks (compare against another file)
  if (gate.crossChecks) {
    for (const xref of gate.crossChecks) {
      const refFile = findSpecFile(specDir, xref.refPattern);
      if (!refFile) {
        results.push({
          desc: `Cross-ref: ${xref.desc}`,
          pass: false,
          detail: `Reference file ${xref.refPattern} not found`,
        });
        continue;
      }
      const refContent = readFileSync(refFile, 'utf8');
      results.push(xref.fn(content, refContent, file, refFile));
    }
  }

  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const allPass = results.every(r => r.pass);

  return {
    name: gate.name,
    pass: allPass,
    results,
    score: `${passed}/${total}`,
  };
}

/**
 * Print gate report to stdout and exit with appropriate code.
 *
 * @param {{ name: string, pass: boolean, results: CheckResult[], score: string }} result
 */
export function reportAndExit(result) {
  console.log(`GATE: ${result.name}`);
  console.log(`  Score: ${result.score} checks passed`);

  const failures = result.results.filter(r => !r.pass);
  if (failures.length > 0) {
    console.log('  Failures:');
    for (const f of failures) {
      console.log(`    FAIL: ${f.desc}`);
      if (f.detail) console.log(`          ${f.detail}`);
    }
    console.log('GATE RESULT: FAIL');
    process.exit(1);
  }

  console.log('GATE RESULT: PASS');
  process.exit(0);
}
