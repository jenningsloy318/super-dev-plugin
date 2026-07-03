#!/usr/bin/env node
/**
 * Hook: Stage gate validation.
 * PreToolUse hook for Agent tool.
 * Validates prerequisite artifacts exist before spawning stage agents.
 * Exit 2 = block (missing artifacts), 0 = allow.
 */

import { createHook } from '../lib/hook-runtime.mjs';
import { findSpecFile, existsNonEmpty, readIfExists } from '../lib/fs.mjs';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(__dirname, '..', '..', 'hooks', 'stage-manifest.json');

createHook((input) => {
  const agentType = input.tool_input?.subagent_type ?? '';

  // Only gate super-dev agents
  if (!agentType.startsWith('super-dev:')) return;
  // Skip team-lead (it's the orchestrator, not a stage worker)
  if (agentType === 'super-dev:team-lead') return;

  // Load manifest
  if (!existsSync(MANIFEST_PATH)) return;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch { return; }

  // Find gate for this agent type (direct lookup, then groups)
  let gate = manifest.gates?.[agentType];
  if (!gate) {
    for (const group of Object.values(manifest.groups || {})) {
      if (group.match?.includes(agentType)) {
        gate = group.gate;
        break;
      }
    }
  }
  if (!gate) return;

  // Extract spec directory from agent prompt
  const prompt = input.tool_input?.prompt ?? '';
  let specDir = '';
  let specName = '';

  // Method 1: Extract from prompt (team-lead includes "specification/NNN-name")
  const specMatch = prompt.match(/specification\/[^\s,)"]+/);
  if (specMatch) {
    specDir = specMatch[0];
    specName = basename(specDir);
  }

  // Method 2: SUPER_DEV_SPEC_DIR env var
  if (!specDir || !existsSync(specDir)) {
    specDir = process.env.SUPER_DEV_SPEC_DIR || '';
  }

  // Method 3: Scan for spec directories in cwd
  if (!specDir || !existsSync(specDir)) {
    try {
      const entries = readdirSync('specification', { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => join('specification', e.name))
        .sort()
        .reverse(); // most recent first
      specDir = entries[0] || '';
    } catch { /* no specification/ dir */ }
  }

  // Method 4: Worktree paths
  if ((!specDir || !existsSync(specDir)) && specName) {
    const wtCandidate = join('.worktree', specName, 'specification', specName);
    if (existsSync(wtCandidate)) specDir = wtCandidate;
  }

  if (!specDir || !existsSync(specDir)) {
    // Scan all worktrees
    try {
      const worktrees = readdirSync('.worktree', { withFileTypes: true })
        .filter(e => e.isDirectory());
      for (const wt of worktrees) {
        const specPath = join('.worktree', wt.name, 'specification');
        if (existsSync(specPath)) {
          const specs = readdirSync(specPath, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => join(specPath, e.name))
            .sort()
            .reverse();
          if (specs[0]) { specDir = specs[0]; break; }
        }
      }
    } catch { /* no .worktree */ }
  }

  // Method 5: Parent directory
  if (!specDir || !existsSync(specDir)) {
    try {
      const specs = readdirSync(join('..', 'specification'), { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => join('..', 'specification', e.name))
        .sort()
        .reverse();
      specDir = specs[0] || '';
    } catch { /* ignore */ }
  }

  // If no spec directory found, allow (early phases haven't created it yet)
  if (!specDir || !existsSync(specDir)) return;

  // Remove trailing separator
  specDir = specDir.replace(/[\\/]+$/, '');

  const stage = gate.stage ?? 'unknown';
  const description = gate.description ?? '';

  // --- Check previous stage status in workflow-tracking.json ---
  const previousStages = gate.previousStages || [];
  if (previousStages.length > 0) {
    const trackingFile = findSpecFile(specDir, '*-workflow-tracking.json');
    if (trackingFile) {
      try {
        const tracking = JSON.parse(readFileSync(trackingFile, 'utf8'));
        const stages = tracking.stages || tracking.phases || [];
        const blockedStages = [];

        for (const prevId of previousStages) {
          const prevStage = stages.find(s => s.id === prevId);
          const status = prevStage?.status || 'pending';
          if (status !== 'complete' && status !== 'skipped') {
            const name = prevStage?.name || 'Unknown';
            blockedStages.push(`  - Stage ${prevId} (${name}): status is '${status}', expected 'complete' or 'skipped'`);
          }
        }

        if (blockedStages.length > 0) {
          process.stderr.write(`STAGE GATE BLOCKED: Cannot start Stage ${stage} (${agentType}).\n`);
          process.stderr.write('Reason: Previous stage(s) not complete in workflow-tracking.json.\n\n');
          process.stderr.write('Incomplete prerequisite stages:\n');
          process.stderr.write(blockedStages.join('\n') + '\n');
          process.stderr.write('Complete the previous stage(s) and update the tracking JSON before proceeding.\n');
          return 'block';
        }
      } catch { /* ignore tracking parse errors */ }
    }
  }

  // --- Check required files ---
  const requires = gate.requires || [];
  const sections = gate.sections || {};
  const missing = [];

  for (const reqFile of requires) {
    // Replace [doc-index] with wildcard for glob
    const pattern = reqFile.replace(/\[doc-index\]/g, '*');
    const found = findSpecFile(specDir, pattern);

    if (!found || !existsNonEmpty(found)) {
      missing.push(`  - ${reqFile} (not found or empty in ${specDir})`);
      continue;
    }

    // Check required sections within the file
    const requiredSections = sections[reqFile] || [];
    if (requiredSections.length > 0) {
      const content = readFileSync(found, 'utf8');
      for (const section of requiredSections) {
        if (!new RegExp(section, 'i').test(content)) {
          missing.push(`  - ${reqFile} (exists but missing required section: '${section}')`);
          break;
        }
      }
    }
  }

  if (missing.length > 0) {
    process.stderr.write(`STAGE GATE BLOCKED: Cannot start Stage ${stage} (${agentType}).\n`);
    process.stderr.write(`Reason: ${description}\n\n`);
    process.stderr.write(`Missing prerequisite artifacts in ${specDir}:\n`);
    process.stderr.write(missing.join('\n') + '\n');
    process.stderr.write('Complete the previous stage(s) and ensure all artifacts are written before proceeding.\n');
    return 'block';
  }

  // --- Run additional gate script if defined ---
  if (gate.gate) {
    // Gate scripts are now: node runner.mjs <gate-name> <spec-dir>
    // Extract gate name from the old .sh filename (e.g., "gate-visual.sh" → "visual")
    const gateKey = gate.gate.replace(/^gate-/, '').replace(/\.sh$/, '');
    const runnerPath = join(__dirname, '..', 'gates', 'runner.mjs');

    if (existsSync(runnerPath)) {
      const result = spawnSync('node', [runnerPath, gateKey, specDir], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30_000,
      });

      if (result.status !== 0) {
        process.stderr.write(result.stdout || '');
        process.stderr.write(result.stderr || '');
        process.stderr.write(`\nSTAGE GATE BLOCKED: Gate script ${gate.gate} FAILED for Stage ${stage} (${agentType}).\n`);
        return 'block';
      }
    }
  }
});
