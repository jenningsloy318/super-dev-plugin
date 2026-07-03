/**
 * Toolchain detection — find and run formatters, linters, test runners.
 *
 * Cross-platform: uses spawnSync without shell, detects available tools
 * by checking config files (not `command -v` which is shell-specific).
 */

import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * Run a tool, capturing output. Returns success boolean.
 *
 * @param {string} cmd - Command to run
 * @param {string[]} args - Arguments
 * @param {object} [opts]
 * @param {string} [opts.cwd] - Working directory
 * @param {number} [opts.timeout] - Timeout in ms (default 60s)
 * @returns {{ ok: boolean, stdout: string, stderr: string }}
 */
export function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: opts.timeout || 60_000,
  });

  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

/**
 * Detect the package manager for a Node.js project.
 * @param {string} root - Project root
 * @returns {'bun'|'pnpm'|'yarn'|'npm'}
 */
export function detectPM(root) {
  if (existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'))) return 'bun';
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

/**
 * @typedef {object} Formatter
 * @property {string} cmd
 * @property {string[]} args - Template where '%f' is replaced with the file path
 */

/**
 * Detect the formatter for a given file extension.
 * @param {string} root - Project root
 * @param {string} ext - File extension (without dot)
 * @returns {Formatter|null}
 */
export function detectFormatter(root, ext) {
  // JavaScript/TypeScript ecosystem
  if (['js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'json', 'yaml', 'yml', 'html', 'vue', 'svelte', 'md'].includes(ext)) {
    if (existsSync(join(root, 'biome.json')) || existsSync(join(root, 'biome.jsonc'))) {
      return { cmd: 'npx', args: ['@biomejs/biome', 'format', '--write', '%f'] };
    }
    if (existsSync(join(root, 'deno.json')) || existsSync(join(root, 'deno.jsonc'))) {
      return { cmd: 'deno', args: ['fmt', '%f'] };
    }
    const prettierConfigs = [
      '.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.mjs',
      'prettier.config.js', 'prettier.config.mjs', 'prettier.config.cjs',
    ];
    if (prettierConfigs.some(c => existsSync(join(root, c)))) {
      return { cmd: 'npx', args: ['prettier', '--write', '%f'] };
    }
    return null;
  }

  const formatters = {
    py: [
      { check: () => commandExists('ruff'), cmd: 'ruff', args: ['format', '%f'] },
      { check: () => commandExists('black'), cmd: 'black', args: ['--quiet', '%f'] },
    ],
    go: [{ check: () => commandExists('gofmt'), cmd: 'gofmt', args: ['-w', '%f'] }],
    rs: [{ check: () => commandExists('rustfmt'), cmd: 'rustfmt', args: ['%f'] }],
    rb: [{ check: () => commandExists('rubocop'), cmd: 'rubocop', args: ['-a', '--stderr', '%f'] }],
    swift: [{ check: () => commandExists('swift-format'), cmd: 'swift-format', args: ['-i', '%f'] }],
    kt: [{ check: () => commandExists('ktlint'), cmd: 'ktlint', args: ['-F', '%f'] }],
    kts: [{ check: () => commandExists('ktlint'), cmd: 'ktlint', args: ['-F', '%f'] }],
    cs: [{ check: () => commandExists('dotnet'), cmd: 'dotnet', args: ['format', '--include', '%f'] }],
  };

  const candidates = formatters[ext];
  if (!candidates) return null;

  for (const c of candidates) {
    if (c.check()) return { cmd: c.cmd, args: c.args };
  }
  return null;
}

/**
 * Detect the linter for a given file extension.
 * @param {string} root - Project root
 * @param {string} ext - File extension (without dot)
 * @returns {Formatter|null}
 */
export function detectLinter(root, ext) {
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
    if (existsSync(join(root, 'biome.json')) || existsSync(join(root, 'biome.jsonc'))) {
      return { cmd: 'npx', args: ['@biomejs/biome', 'lint', '--write', '%f'] };
    }
    const eslintConfigs = [
      'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs',
      '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs',
    ];
    if (eslintConfigs.some(c => existsSync(join(root, c)))) {
      return { cmd: 'npx', args: ['eslint', '--fix', '%f'] };
    }
    return null;
  }

  const linters = {
    py: [
      { check: () => commandExists('ruff'), cmd: 'ruff', args: ['check', '--fix', '%f'] },
      { check: () => commandExists('flake8'), cmd: 'flake8', args: ['%f'] },
    ],
    go: [{ check: () => commandExists('golangci-lint'), cmd: 'golangci-lint', args: ['run', '--fix', '%f'] }],
    rs: [{ check: () => commandExists('cargo'), cmd: 'cargo', args: ['clippy', '--fix', '--allow-dirty', '--allow-staged'] }],
    rb: [{ check: () => commandExists('rubocop'), cmd: 'rubocop', args: ['-a', '--stderr', '%f'] }],
  };

  const candidates = linters[ext];
  if (!candidates) return null;

  for (const c of candidates) {
    if (c.check()) return { cmd: c.cmd, args: c.args };
  }
  return null;
}

/**
 * Detect and return the test runner command for a project.
 * @param {string} root - Project root
 * @returns {{ cmd: string, args: string[] }|null}
 */
export function detectTestRunner(root) {
  if (existsSync(join(root, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      if (pkg.scripts?.test) {
        const pm = detectPM(root);
        return { cmd: pm, args: pm === 'npm' ? ['run', 'test', '--silent'] : ['test'] };
      }
    } catch { /* ignore malformed package.json */ }
    return null;
  }
  if (existsSync(join(root, 'Cargo.toml'))) return { cmd: 'cargo', args: ['test'] };
  if (existsSync(join(root, 'go.mod'))) return { cmd: 'go', args: ['test', './...'] };
  if (existsSync(join(root, 'pyproject.toml')) || existsSync(join(root, 'setup.py'))) {
    if (commandExists('pytest')) return { cmd: 'pytest', args: ['--tb=short', '-q'] };
    return null;
  }
  if (existsSync(join(root, 'Makefile'))) {
    const makefile = readIfExists(join(root, 'Makefile'));
    if (makefile && /^test:/m.test(makefile)) return { cmd: 'make', args: ['test'] };
  }
  return null;
}

// --- Internal helpers ---

import { readFileSync as readFileSync_ } from 'node:fs';

function readIfExists(filePath) {
  try { return readFileSync_(filePath, 'utf8'); } catch { return null; }
}

/**
 * Check if a command is available on PATH.
 * Uses `which` on Unix, `where` on Windows — via spawnSync without shell.
 */
function commandExists(cmd) {
  const which = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(which, [cmd], { encoding: 'utf8', stdio: 'pipe' });
  return result.status === 0;
}
