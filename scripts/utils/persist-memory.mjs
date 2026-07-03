#!/usr/bin/env node
/**
 * persist-memory.mjs — Extract key decisions from workflow spec artifacts for project memory.
 *
 * Usage: node persist-memory.mjs <spec-directory> <worktree-path>
 * Output: Structured markdown to stdout suitable for memory storage.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { git } from '../lib/git.mjs';
import { findSpecFile } from '../lib/fs.mjs';

const specDir = process.argv[2];
const worktree = process.argv[3];

if (!specDir || !worktree) {
  console.error('Usage: node persist-memory.mjs <spec-directory> <worktree-path>');
  process.exit(1);
}

// Extract feature name from specification
const specFile = findSpecFile(specDir, '*specification*');
let featureName = 'unknown';
if (specFile) {
  const content = readFileSync(specFile, 'utf8');
  const heading = content.match(/^#\s+(.+)/m);
  if (heading) {
    featureName = heading[1].replace(/^(?:Specification|Technical Specification):\s*/i, '');
  }
}

const date = new Date().toISOString().split('T')[0];
const slug = featureName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);

// --- Header ---
console.log(`---
name: workflow-${date}-${slug}
description: "Workflow decisions for: ${featureName}"
metadata:
  type: project
  date: ${date}
---

# Workflow Decisions: ${featureName}
## Date: ${date}
`);

// --- Architecture Choices ---
const archFile = findSpecFile(specDir, '*architecture*');
if (archFile) {
  console.log('### Architecture Choices\n');
  const content = readFileSync(archFile, 'utf8');
  const headings = content.match(/^#{2,3}\s+.+/gm);
  if (headings) {
    for (const h of headings.slice(0, 10)) {
      console.log(`- ${h}`);
    }
  }
  console.log('');
}

// --- Design Decisions ---
if (specFile) {
  console.log('### Key Design Decisions\n');
  const content = readFileSync(specFile, 'utf8');
  const decisions = content.match(/^.*(?:Decision|Approach|Choice|Trade-off|Alternative).*/gim);
  if (decisions) {
    for (const d of decisions.slice(0, 20)) {
      console.log(d);
    }
  }
  console.log('');
}

// --- Rejected Alternatives ---
const reviewFile = findSpecFile(specDir, '*spec-review*') || findSpecFile(specDir, '*review*');
if (reviewFile) {
  console.log('### Review Findings & Rejected Alternatives\n');
  const content = readFileSync(reviewFile, 'utf8');
  const findings = content.match(/^.*(?:reject|concern|issue|risk|alternative).*/gim);
  if (findings) {
    for (const f of findings.slice(0, 15)) {
      console.log(f);
    }
  }
  console.log('');
}

// --- Implementation Patterns ---
const summaries = readdirSync(specDir)
  .filter(f => /implementation-summary/i.test(f))
  .map(f => join(specDir, f))
  .sort();

if (summaries.length > 0) {
  console.log('### Implementation Patterns Established\n');
  for (const f of summaries) {
    const content = readFileSync(f, 'utf8');
    const heading = content.match(/^#{1,2}\s+(.+)/m);
    const phaseName = heading ? heading[1] : basename(f);
    console.log(`- **${phaseName}**`);

    const created = content.match(/(?:Created|Modified|Added):\s*.+/gi);
    if (created) {
      for (const c of created.slice(0, 3)) console.log(`  - ${c}`);
    }
  }
  console.log('');
}

// --- Test Patterns ---
console.log('### Test Patterns\n');
const { stdout: testFiles } = git(
  ['diff', '--name-only', '--diff-filter=A', 'HEAD~10..HEAD'],
  { cwd: worktree }
);
const tests = testFiles.split('\n').filter(f => /test|spec|_test\.|\.test\./i.test(f));
if (tests.length > 0) {
  console.log('Test files created:');
  for (const t of tests.slice(0, 10)) console.log(`- \`${t}\``);
} else {
  console.log('No new test files detected in recent commits.');
}
console.log('');

// --- Files Modified Summary ---
console.log('### Files Modified\n');
const { stdout: stat } = git(['diff', '--stat', 'HEAD~10..HEAD'], { cwd: worktree });
const lastLine = stat.split('\n').filter(Boolean).pop();
if (lastLine) console.log(lastLine);
console.log('');
