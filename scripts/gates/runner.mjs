#!/usr/bin/env node
/**
 * Gate Runner — CLI entry point for executing declarative gates.
 *
 * Usage:
 *   node runner.mjs <gate-name> <spec-dir-or-file> [options]
 *   node runner.mjs requirements /path/to/specification/01-feature
 *   node runner.mjs review /path/to/spec --type code --file /path/to/review.md
 *   node runner.mjs handoff /path/to/spec
 *
 * Exit codes:
 *   0 = PASS (all checks passed)
 *   1 = FAIL (at least one check failed)
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { gates } from './definitions.mjs';
import { runGate, reportAndExit } from '../lib/gate-engine.mjs';
import { resolveInput, findSpecFile, existsNonEmpty } from '../lib/fs.mjs';

// --- Parse CLI ---
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node runner.mjs <gate-name> <spec-dir-or-file> [--type code|adversarial] [--file path]');
  console.error(`Available gates: ${Object.keys(gates).join(', ')}`);
  process.exit(1);
}

const gateName = args[0];
const inputArg = args[1];

// Parse optional flags
const flags = {};
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--type' && args[i + 1]) { flags.type = args[++i]; }
  else if (args[i] === '--file' && args[i + 1]) { flags.file = args[++i]; }
  else if (args[i] === '--worktree' && args[i + 1]) { flags.worktree = args[++i]; }
}

// --- Resolve gate ---
const gate = gates[gateName];
if (!gate) {
  console.error(`Unknown gate: "${gateName}"`);
  console.error(`Available gates: ${Object.keys(gates).join(', ')}`);
  process.exit(1);
}

// --- Resolve input ---
const { specDir, gateFile } = resolveInput(inputArg);

if (!specDir || !existsSync(specDir)) {
  console.error(`GATE FAIL: Spec directory not found: ${specDir || inputArg}`);
  process.exit(1);
}

// --- Special gate handling ---

// Review gate with --type flag
if (gateName === 'review' || (gateName === 'code-review' && flags.type === 'adversarial') || (gateName === 'adversarial-review' && flags.type === 'code')) {
  // Handled by the specific sub-gate
}

// Docs-drift: directory-level gate (no single target file)
if (gate.dirChecks) {
  const results = [];

  // Check required files
  for (const req of gate.dirChecks.requiredFiles) {
    const f = findSpecFile(specDir, req.pattern);
    results.push({
      desc: req.desc,
      pass: f !== null && existsNonEmpty(f),
      detail: f ? undefined : `${req.pattern} not found in ${specDir}`,
    });
  }

  // Placeholder scan across all .md files
  if (gate.dirChecks.placeholderScan) {
    const scan = gate.dirChecks.placeholderScan;
    let totalCount = 0;
    const mdFiles = readdirSync(specDir)
      .filter(f => f.endsWith('.md'))
      .map(f => join(specDir, f));

    for (const mdFile of mdFiles) {
      try {
        const content = readFileSync(mdFile, 'utf8');
        const matches = content.match(scan.pattern);
        totalCount += matches ? matches.length : 0;
      } catch { /* skip unreadable */ }
    }

    results.push({
      desc: `${scan.desc} (found: ${totalCount}, max: ${scan.maxTotal})`,
      pass: totalCount <= scan.maxTotal,
      detail: totalCount > scan.maxTotal ? `Found ${totalCount} placeholders, max is ${scan.maxTotal}` : undefined,
    });
  }

  // Tracking JSON validity
  if (gate.dirChecks.trackingJson) {
    const tj = gate.dirChecks.trackingJson;
    const file = findSpecFile(specDir, tj.pattern);
    if (file && existsNonEmpty(file)) {
      results.push({ desc: 'Workflow tracking JSON exists', pass: true });
      try {
        JSON.parse(readFileSync(file, 'utf8'));
        results.push({ desc: 'Workflow tracking JSON is valid', pass: true });
      } catch {
        results.push({ desc: 'Workflow tracking JSON is valid', pass: false, detail: 'Invalid JSON' });
      }
    } else {
      results.push({ desc: 'Workflow tracking JSON exists', pass: false });
    }
  }

  const passed = results.filter(r => r.pass).length;
  reportAndExit({ name: gate.name, pass: results.every(r => r.pass), results, score: `${passed}/${results.length}` });
}

// Spec-trace: file checks + content checks
if (gate.fileChecks) {
  const result = runGate(gate, specDir, { gateFile });

  // Append file-existence checks
  for (const fc of gate.fileChecks) {
    const f = findSpecFile(specDir, fc.pattern);
    result.results.push({
      desc: `${fc.desc} (${fc.pattern})`,
      pass: f !== null && existsNonEmpty(f),
    });
  }

  const passed = result.results.filter(r => r.pass).length;
  result.score = `${passed}/${result.results.length}`;
  result.pass = result.results.every(r => r.pass);
  reportAndExit(result);
}

// Implementation-complete: plan + tracking JSON alignment
if (gate.trackingChecks) {
  const result = runGate(gate, specDir, { gateFile });

  // Find tracking JSON
  const trackingFile = findSpecFile(specDir, '*-workflow-tracking.json');
  if (!trackingFile) {
    result.results.push({ desc: 'Workflow tracking JSON exists', pass: false });
  } else {
    result.results.push({ desc: 'Workflow tracking JSON exists', pass: true });
    try {
      const tracking = JSON.parse(readFileSync(trackingFile, 'utf8'));
      const phases = tracking.implementationPhases || [];
      result.results.push({
        desc: `Tracking JSON has implementationPhases (found: ${phases.length})`,
        pass: phases.length > 0,
      });

      if (phases.length > 0) {
        const complete = phases.filter(p => p.status === 'complete').length;
        result.results.push({
          desc: `All implementation phases complete (${complete}/${phases.length})`,
          pass: complete === phases.length,
          detail: complete < phases.length
            ? `Incomplete: ${phases.filter(p => p.status !== 'complete').map(p => `Phase ${p.phaseNumber}: ${p.name} [${p.status}]`).join(', ')}`
            : undefined,
        });
      }
    } catch {
      result.results.push({ desc: 'Tracking JSON is parseable', pass: false });
    }
  }

  // Check implementation-summary exists
  const summary = findSpecFile(specDir, '*-implementation-summary*.md');
  result.results.push({ desc: 'Implementation summary exists', pass: summary !== null && existsNonEmpty(summary) });

  const passed = result.results.filter(r => r.pass).length;
  result.score = `${passed}/${result.results.length}`;
  result.pass = result.results.every(r => r.pass);
  reportAndExit(result);
}

// Handoff: conditional gate
if (gate.conditional) {
  const result = runGate(gate, specDir, { gateFile });

  // Determine if AC Coverage Assessment is required
  let required = false;
  let reason = '';

  const trackingFile = findSpecFile(specDir, '*-workflow-tracking.json');
  if (trackingFile) {
    try {
      const tracking = JSON.parse(readFileSync(trackingFile, 'utf8'));
      const loops = tracking.iteration?.loops || 0;
      const phases = (tracking.implementationPhases || []).length;

      if (loops > 0) { required = true; reason += `iteration.loops=${loops}`; }
      if (phases > 1) { required = true; reason += `${reason ? '; ' : ''}implementationPhases.length=${phases}`; }
    } catch { /* ignore */ }
  }

  // Check for pivot artifacts
  const pivotSpecs = readdirSync(specDir).filter(f => /-specification-r\d+\.md$/i.test(f));
  const pivotResearch = readdirSync(specDir).filter(f => /deep-research-report-pivot|pivot/i.test(f));
  if (pivotSpecs.length > 0 || pivotResearch.length > 0) {
    required = true;
    reason += `${reason ? '; ' : ''}pivot artifacts (revised-spec=${pivotSpecs.length}, pivot-research=${pivotResearch.length})`;
  }

  if (!required) {
    result.results.push({ desc: 'AC Coverage Assessment not required (no pivot indicators)', pass: true });
  } else {
    console.log(`  AC Coverage Assessment IS required: ${reason}`);
    // Run conditional checks against the handoff content
    const handoffFile = gateFile || findSpecFile(specDir, gate.file);
    if (handoffFile) {
      const content = readFileSync(handoffFile, 'utf8');
      for (const check of gate.conditionalChecks.checks) {
        if (check.pattern) {
          const regex = check.pattern instanceof RegExp ? check.pattern : new RegExp(check.pattern, 'gi');
          const matches = content.match(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'));
          const count = matches ? matches.length : 0;
          result.results.push({
            desc: `${check.desc} (found: ${count})`,
            pass: count >= (check.min || 1),
          });
        }
      }
    }
  }

  const passed = result.results.filter(r => r.pass).length;
  result.score = `${passed}/${result.results.length}`;
  result.pass = result.results.every(r => r.pass);
  reportAndExit(result);
}

// Prototype: skip marker support
if (gate.skipMarker) {
  if (existsSync(join(specDir, gate.skipMarker))) {
    console.log(`  SKIPPED — marker found at ${join(specDir, gate.skipMarker)}`);
    reportAndExit({ name: gate.name, pass: true, results: [{ desc: 'Skip marker present', pass: true }], score: '1/1' });
  }
}

// Visual: artifacts directory check
if (gate.artifactsDir) {
  const artDir = join(specDir, gate.artifactsDir);
  const results = [];

  results.push({ desc: `${gate.artifactsDir}/ directory exists`, pass: existsSync(artDir) });

  if (!existsSync(artDir)) {
    reportAndExit({ name: gate.name, pass: false, results, score: '0/1' });
  }

  // Skip marker inside artifacts/
  if (gate.skipMarker && existsSync(join(specDir, gate.skipMarker))) {
    console.log(`  SKIPPED — non-visual phase (marker found)`);
    results.push({ desc: 'Non-visual phase explicitly marked', pass: true });
    reportAndExit({ name: gate.name, pass: true, results, score: `${results.length}/${results.length}` });
  }

  // Check for render artifacts
  if (gate.artifactCheck) {
    const files = readdirSync(artDir).filter(f => gate.artifactCheck.extensions.includes(extname(f).toLowerCase()));
    results.push({
      desc: `${gate.artifactCheck.desc} (found: ${files.length})`,
      pass: files.length >= gate.artifactCheck.minFiles,
    });
  }

  // Now run the standard content checks on the report file
  const reportResult = runGate(gate, specDir, { gateFile });
  results.push(...reportResult.results);

  const passed = results.filter(r => r.pass).length;
  reportAndExit({ name: gate.name, pass: results.every(r => r.pass), results, score: `${passed}/${results.length}` });
}

// --- Default: standard gate execution ---
const result = runGate(gate, specDir, { gateFile: gateFile || flags.file });

// Conditional content checks (prototype FAIL → must reference pivot-protocol)
if (gate.conditionalOnContent) {
  const file = gateFile || findSpecFile(specDir, gate.file);
  if (file) {
    const content = readFileSync(file, 'utf8');
    if (gate.conditionalOnContent.trigger.test(content)) {
      for (const check of gate.conditionalOnContent.checks) {
        const matches = content.match(new RegExp(check.pattern.source, check.pattern.flags.includes('g') ? check.pattern.flags : check.pattern.flags + 'g'));
        const count = matches ? matches.length : 0;
        result.results.push({
          desc: check.desc,
          pass: count >= (check.min || 1),
        });
      }
    }
  }
}

// Directory sub-check (prototype/ dir must have files)
if (gate.dirCheck) {
  const subdir = join(specDir, gate.dirCheck.subdir);
  if (existsSync(subdir)) {
    const files = readdirSync(subdir).filter(f => statSync(join(subdir, f)).isFile());
    result.results.push({
      desc: `${gate.dirCheck.desc} (count: ${files.length})`,
      pass: files.length >= gate.dirCheck.minFiles,
    });
  } else {
    result.results.push({ desc: `${gate.dirCheck.subdir}/ directory exists`, pass: false });
  }
}

const passed = result.results.filter(r => r.pass).length;
result.score = `${passed}/${result.results.length}`;
result.pass = result.results.every(r => r.pass);
reportAndExit(result);
