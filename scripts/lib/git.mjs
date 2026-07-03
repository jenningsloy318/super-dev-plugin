/**
 * Git utilities — cross-platform git subprocess wrappers.
 *
 * Uses spawnSync without shell for safety and Windows compatibility.
 */

import { spawnSync } from 'node:child_process';

/**
 * Run a git command synchronously. Returns { stdout, stderr, status }.
 *
 * @param {string[]} args - Git subcommand and arguments
 * @param {object} [opts] - Options
 * @param {string} [opts.cwd] - Working directory
 * @returns {{ stdout: string, stderr: string, status: number }}
 */
export function git(args, opts = {}) {
  const result = spawnSync('git', args, {
    cwd: opts.cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 30_000,
  });

  return {
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    status: result.status ?? 1,
  };
}

/**
 * Check if we're inside a git work tree.
 * @param {string} [cwd]
 * @returns {boolean}
 */
export function isGitRepo(cwd) {
  const { status } = git(['rev-parse', '--is-inside-work-tree'], { cwd });
  return status === 0;
}

/**
 * Get the current branch name.
 * @param {string} [cwd]
 * @returns {string}
 */
export function currentBranch(cwd) {
  const { stdout, status } = git(['branch', '--show-current'], { cwd });
  return status === 0 ? stdout : 'detached';
}

/**
 * Get changed file names between two refs.
 * @param {string} base - Base ref
 * @param {string} head - Head ref
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {string} [opts.filter] - Diff filter (e.g., 'ACMR')
 * @returns {string[]}
 */
export function diffFiles(base, head, opts = {}) {
  const args = ['diff', '--name-only'];
  if (opts.filter) args.push(`--diff-filter=${opts.filter}`);
  args.push(`${base}..${head}`);

  const { stdout, status } = git(args, { cwd: opts.cwd });
  if (status !== 0 || !stdout) return [];
  return stdout.split('\n').filter(Boolean);
}

/**
 * Create a stash commit without modifying the working tree.
 * @param {string} message - Stash message
 * @param {string} [cwd]
 * @returns {string|null} SHA of stash commit, or null if nothing to stash
 */
export function stashCreate(message, cwd) {
  const { stdout, status } = git(['stash', 'create', message], { cwd });
  return status === 0 && stdout ? stdout : null;
}

/**
 * Store a ref pointing at a SHA.
 * @param {string} refName - Full ref name (e.g., 'refs/super-dev-checkpoints/...')
 * @param {string} sha - Commit SHA to point at
 * @param {string} [cwd]
 * @returns {boolean}
 */
export function updateRef(refName, sha, cwd) {
  const { status } = git(['update-ref', refName, sha], { cwd });
  return status === 0;
}

/**
 * Check if there are any uncommitted changes (working tree or staged).
 * @param {string} [cwd]
 * @returns {boolean} true if working tree is dirty
 */
export function isDirty(cwd) {
  const { stdout: diff } = git(['diff', '--quiet'], { cwd });
  const diffResult = spawnSync('git', ['diff', '--quiet'], { cwd, encoding: 'utf8' });
  if (diffResult.status !== 0) return true;

  const cachedResult = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd, encoding: 'utf8' });
  if (cachedResult.status !== 0) return true;

  // Check untracked files
  const { stdout: untracked } = git(['ls-files', '--others', '--exclude-standard'], { cwd });
  return untracked.length > 0;
}
