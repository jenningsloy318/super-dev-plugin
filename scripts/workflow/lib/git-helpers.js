// super-dev/scripts/workflow/lib/git-helpers.js
//
// Git helpers used by Stage 1 setup. Run inside the Workflow runtime — uses
// Bash via the harness's normal tool channels, not Node child_process.
//
// These functions are written as small awaitable shell snippets returned as
// strings: the workflow main file invokes them through agent() with a tiny
// dedicated subagent (label "stage-1-shell") so output remains auditable in
// the run journal. Keeping shell-only helpers out of the main file keeps the
// orchestration script focused on flow control.

/** Detect the repo's default branch from origin/HEAD (never hard-codes main). */
export function detectDefaultBranchSnippet(repoPath) {
  return `set -e
cd ${shellQuote(repoPath)}
# git symbolic-ref returns refs/remotes/origin/<name>; strip the prefix.
ref="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || true)"
if [ -z "$ref" ]; then
  # origin/HEAD not set locally — fetch then retry once.
  git fetch origin --quiet
  ref="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || true)"
fi
if [ -z "$ref" ]; then
  echo "ERROR: cannot detect default branch (origin/HEAD missing)" >&2
  exit 2
fi
printf '%s\\n' "\${ref#refs/remotes/origin/}"
`;
}

/** Fetch + fast-forward the default branch. Aborts on divergence/dirty/detached. */
export function pullLatestSnippet(repoPath, defaultBranch) {
  return `set -e
cd ${shellQuote(repoPath)}
git fetch origin --quiet
# Refuse to touch a dirty tree.
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: working tree has uncommitted changes — refusing to pull" >&2
  echo "Resolve manually: stash, commit, or discard before retrying." >&2
  exit 2
fi
# Refuse to operate on a detached HEAD.
if ! git symbolic-ref -q HEAD >/dev/null; then
  echo "ERROR: HEAD is detached — checkout ${shellQuote(defaultBranch)} manually before retrying" >&2
  exit 2
fi
git checkout ${shellQuote(defaultBranch)} --quiet
# --ff-only fails loudly on local divergence; never auto-rebases/force-pulls.
git pull --ff-only origin ${shellQuote(defaultBranch)}
`;
}

/** Create the spec worktree and emit the absolute path on stdout. */
export function worktreeAddSnippet(repoPath, specIdentifier) {
  return `set -e
cd ${shellQuote(repoPath)}
git worktree add ${shellQuote('.worktree/' + specIdentifier)} -b ${shellQuote(specIdentifier)}
cd ${shellQuote('.worktree/' + specIdentifier)}
pwd
`;
}

/** Capture HEAD inside a worktree. Used as per-phase base_sha. */
export function captureHeadSnippet(worktreePath) {
  return `set -e
cd ${shellQuote(worktreePath)}
git rev-parse HEAD
`;
}

/**
 * Commit all changes in a worktree under a Conventional-Commits message,
 * then emit the new HEAD SHA on stdout. Skips cleanly with the prior HEAD
 * when there is nothing to commit (e.g. tdd-guide only updated specs that
 * were already staged, or specialist made no source changes — rare but
 * possible). The fallback keeps base_sha advancing without empty commits.
 */
export function commitPhaseSnippet(worktreePath, message) {
  return `set -e
cd ${shellQuote(worktreePath)}
git add -A
if git diff --cached --quiet; then
  echo "skip-commit:no-staged-changes" >&2
  git rev-parse HEAD
else
  git commit -m ${shellQuote(message)} --quiet
  git rev-parse HEAD
fi
`;
}

function shellQuote(s) {
  // Single-quote, escape embedded single quotes.
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}
