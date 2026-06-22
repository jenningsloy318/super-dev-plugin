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
 * Stage any remaining changes in the worktree and commit them under a
 * Conventional-Commits message. Used at Stage 13 to capture docs/handoff
 * that landed after the last per-phase commit. Emits the new HEAD SHA on
 * stdout; emits "skip-commit:no-staged-changes" on stderr when there is
 * nothing to commit (and re-emits the prior HEAD on stdout).
 */
export function commitTrailingSnippet(worktreePath, message) {
  return commitPhaseSnippet(worktreePath, message);
}

/**
 * Merge the spec branch back into the default branch in the MAIN repo
 * (NOT inside the worktree). Sequence:
 *   1. cd repoPath
 *   2. checkout <defaultBranch>
 *   3. pull --ff-only origin <defaultBranch>  (re-sync; the user may have
 *      pulled new commits while the workflow was running)
 *   4. merge --no-ff <specBranch> -m "<message>"
 *   5. emit the new HEAD on stdout
 *
 * Refuses to do anything destructive: aborts on dirty tree, detached
 * HEAD, or non-fast-forward pull. Auto-rebase/force-merge/stash are
 * forbidden — same discipline as the Stage 1 pull-latest rule.
 */
export function mergeSpecBranchSnippet(repoPath, defaultBranch, specBranch, message) {
  return `set -e
cd ${shellQuote(repoPath)}
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: main repo working tree is dirty — refusing to merge" >&2
  echo "Resolve manually (stash, commit, or discard) before retrying." >&2
  exit 2
fi
if ! git symbolic-ref -q HEAD >/dev/null; then
  echo "ERROR: main repo HEAD is detached — checkout ${shellQuote(defaultBranch)} manually" >&2
  exit 2
fi
git fetch origin --quiet
git checkout ${shellQuote(defaultBranch)} --quiet
git pull --ff-only origin ${shellQuote(defaultBranch)}
git merge --no-ff ${shellQuote(specBranch)} -m ${shellQuote(message)}
git rev-parse HEAD
`;
}

function shellQuote(s) {
  // Single-quote, escape embedded single quotes.
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}
