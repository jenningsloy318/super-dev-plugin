/**
 * Filesystem utilities — cross-platform helpers for spec file discovery.
 *
 * Replaces: gate-lib.sh find_spec_file(), lib.sh find_project_root()
 * Key improvement: native path handling, no xargs/ls -t, glob via readdirSync.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';

/** Project root markers (same precedence as the bash version) */
const PROJECT_MARKERS = [
  'package.json', 'Cargo.toml', 'go.mod',
  'pyproject.toml', 'setup.py', '.git',
];

/**
 * Walk up from `start` to find the nearest project root.
 * @param {string} start - Directory to begin search from
 * @returns {string} Project root path, or `start` if none found
 */
export function findProjectRoot(start) {
  let dir = resolve(start);
  const { root } = { root: dirname(dir) === dir ? dir : undefined };

  while (true) {
    for (const marker of PROJECT_MARKERS) {
      if (existsSync(join(dir, marker))) return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return resolve(start);
}

/**
 * Find spec files matching a glob pattern in a directory.
 * Pattern supports `*` as wildcard (like shell glob) and `[doc-index]` placeholder.
 *
 * Returns the most recently modified match (replicates `ls -t | head -1`).
 *
 * @param {string} dir - Directory to search
 * @param {string} pattern - Glob pattern (e.g., '*-requirements.md')
 * @returns {string|null} Full path to best match, or null
 */
export function findSpecFile(dir, pattern) {
  if (!existsSync(dir)) return null;

  // Convert pattern to regex: * → .*, [doc-index] → \d+
  // Order matters: escape dots first, then replace wildcards
  // Use .* (zero or more) not .+ to match shell glob semantics
  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\[doc-index\]/g, '\\d+')
    .replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexStr}$`, 'i');

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  const matches = entries
    .filter(e => e.isFile() && regex.test(e.name))
    .map(e => {
      const fullPath = join(dir, e.name);
      const mtime = statSync(fullPath).mtimeMs;
      return { path: fullPath, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime); // most recent first

  return matches.length > 0 ? matches[0].path : null;
}

/**
 * Resolve a spec file: if `gateFile` is an existing file, use it directly.
 * Otherwise fall back to glob search in specDir.
 *
 * @param {string} specDir - Spec directory path
 * @param {string} pattern - Glob pattern for fallback search
 * @param {string} [gateFile] - Explicit file path override (from CLI arg)
 * @returns {string|null}
 */
export function resolveSpecFile(specDir, pattern, gateFile) {
  if (gateFile && existsSync(gateFile) && statSync(gateFile).isFile()) {
    return gateFile;
  }
  return findSpecFile(specDir, pattern);
}

/**
 * Resolve specDir from a CLI argument that could be a file or directory.
 * - If arg is a file: specDir = its parent, gateFile = arg
 * - If arg is a directory: specDir = arg, gateFile = null
 *
 * @param {string} arg - First CLI argument
 * @returns {{ specDir: string, gateFile: string|null }}
 */
export function resolveInput(arg) {
  if (!arg) return { specDir: '', gateFile: null };

  const resolved = resolve(arg);
  if (existsSync(resolved)) {
    const stat = statSync(resolved);
    if (stat.isFile()) {
      return { specDir: dirname(resolved), gateFile: resolved };
    }
    if (stat.isDirectory()) {
      return { specDir: resolved, gateFile: null };
    }
  }
  return { specDir: resolved, gateFile: null };
}

/**
 * Read file content if it exists, otherwise return null.
 * @param {string} filePath
 * @returns {string|null}
 */
export function readIfExists(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Check if a file exists and is non-empty.
 * @param {string} filePath
 * @returns {boolean}
 */
export function existsNonEmpty(filePath) {
  try {
    const stat = statSync(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}
