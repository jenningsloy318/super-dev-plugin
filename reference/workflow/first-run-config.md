# First-Run Configuration Protocol

Loaded by: team-lead on first run per project (config absent).

## Steps

1. **Detect** — Derive project key: `PROJECT_NAME="$(basename "$(git rev-parse --show-toplevel)")"`. Check `${PLUGIN_DATA}/projects/${PROJECT_NAME}/config.json`. If present → read silently and skip remaining steps.
2. **Auto-detect** stack:
   - Language: `package.json`→Node, `Cargo.toml`→Rust, `go.mod`→Go, `pyproject.toml`→Python.
   - Framework: `next.config.*`→Next.js, `vite.config.*`→Vite.
   - Package manager: `bun.lockb`→bun, `pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn, else npm.
   - Test runner: `jest.config.*`, `vitest.config.*`, `playwright.config.*`.
3. **Confirm and Write** — Ask user to confirm detected values. Write config to `${PLUGIN_DATA}/projects/${PROJECT_NAME}/config.json`. Include `project.path` for collision detection.

Subsequent runs: read silently — do not re-prompt.
