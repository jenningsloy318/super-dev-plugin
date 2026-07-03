#!/usr/bin/env node
/**
 * setup-codex.mjs — Install agent configs for OpenAI Codex CLI.
 *
 * Copies .codex/agents/*.toml configs into the target project.
 * Usage: node setup-codex.mjs [target-dir]
 */

import { existsSync, readdirSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(__dirname, '..', '..', '.codex', 'agents');
const targetBase = process.argv[2] || process.cwd();
const targetDir = join(targetBase, '.codex', 'agents');

if (!existsSync(sourceDir)) {
  console.error(`Source directory not found: ${sourceDir}`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });

const files = readdirSync(sourceDir).filter(f => f.endsWith('.toml'));
let copied = 0;

for (const file of files) {
  copyFileSync(join(sourceDir, file), join(targetDir, file));
  copied++;
}

console.log(`Installed ${copied} Codex agent configs to ${targetDir}`);
console.log('Agents:');
for (const file of files) {
  console.log(`  - ${basename(file, '.toml')}`);
}
