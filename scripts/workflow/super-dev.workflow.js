// super-dev/scripts/workflow/super-dev.workflow.js
//
// Dynamic Workflow entry point for the super-dev plugin. Replaces the
// team-lead-narrated orchestration with a deterministic JS script that
// holds the 13-stage plan, the iteration loops, and the structured
// intermediate results in code. The model focuses on each subagent
// task; the script focuses on flow.
//
// Layout (Phase B C2 — Stages 1-3 only; later stages added in C3-C9):
//   Stage 1   — Preflight + pull-latest + worktree + spec dir + tracking JSON
//   Stage 2   — Requirements + BDD (writer + doc-validator pairs)
//   Stage 3   — Research (initial + up-to-3 deep-research iterations)
//
// Phase A constraints honored:
//   - preflight-env.sh runs FIRST (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 +
//     Claude Code >= 2.1.178)
//   - main repo is fetched and fast-forwarded to origin/<default-branch>
//     before the worktree is created (no hard-coded "main")
//
// Phase B contract:
//   - every doc-producing agent returns a JSON-Schema-validated object
//   - gate verdicts are structured returns, not chat signals
//   - iteration loops are real JS while(); the model cannot drift past max=3
//
// The script is meant to be invoked by Claude Code's Workflow runtime via
// the super-dev:super-dev skill. Do NOT `node` it directly.

import { detectDefaultBranchSnippet, pullLatestSnippet, worktreeAddSnippet }
  from './lib/git-helpers.js';

// ---------------------------------------------------------------------------
// meta — pure literal as required by the Workflow runtime.
// ---------------------------------------------------------------------------
export const meta = {
  name: 'super-dev',
  description: 'Team-lead orchestrated 13-stage feature/bug/refactor workflow with per-stage gates, structured-output verdicts, and capped iteration loops.',
  whenToUse: 'New features, bug fixes, or refactors that need the full Stage 1-13 super-dev pipeline (requirements → BDD → research → assessment → design → spec → review → TDD implementation → code review → docs → handoff → cleanup → merge).',
  phases: [
    { title: 'Stage 1 — Setup' },
    { title: 'Stage 2 — Requirements + BDD' },
    { title: 'Stage 3 — Research' },
  ],
};

// ---------------------------------------------------------------------------
// JSON Schemas — loaded inline so the script is self-contained for the
// runtime. Source of truth is scripts/workflow/schemas/*.json.
// ---------------------------------------------------------------------------
const GATE_VERDICT = {
  type: 'object',
  required: ['pass', 'gate'],
  additionalProperties: false,
  properties: {
    pass: { type: 'boolean' },
    gate: { type: 'string' },
    errors: { type: 'array', items: { type: 'string' } },
    stdout_tail: { type: 'string' },
  },
};

const REQUIREMENTS_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'feature_name', 'ac_count'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    feature_name: { type: 'string' },
    ac_count: { type: 'integer', minimum: 1 },
    open_questions: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
};

const BDD_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'scenario_count'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    scenario_count: { type: 'integer', minimum: 1 },
    edge_cases_covered: { type: 'integer', minimum: 0 },
    coverage_score: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string' },
  },
};

const RESEARCH_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'options'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    options: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        required: ['name', 'summary', 'pros', 'cons'],
        properties: {
          name: { type: 'string' },
          summary: { type: 'string' },
          pros: { type: 'array', items: { type: 'string' } },
          cons: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    open_issues: { type: 'array', items: { type: 'string' } },
    iteration: { type: 'integer', minimum: 1 },
  },
};

// ---------------------------------------------------------------------------
// args — set by the caller (super-dev:super-dev skill) and accessed via the
// Workflow runtime's global `args`. Shape:
//   {
//     request:        string,   // user's natural-language ask
//     plugin_root:    string,   // absolute path to super-dev-plugin checkout
//     repo_path:      string,   // absolute path to the target project repo
//     feature_kind:   'feature' | 'bug' | 'refactor' | 'auto'  (default 'auto')
//   }
// ---------------------------------------------------------------------------
const REQUEST     = args?.request ?? '';
const PLUGIN_ROOT = args?.plugin_root ?? '';
const REPO_PATH   = args?.repo_path ?? '';
const FEATURE_KIND = args?.feature_kind ?? 'auto';

if (!REQUEST || !PLUGIN_ROOT || !REPO_PATH) {
  throw new Error('super-dev workflow: args must include {request, plugin_root, repo_path}');
}

// ---------------------------------------------------------------------------
// Stage 1 — Setup
// ---------------------------------------------------------------------------
phase('Stage 1 — Setup');

// Step 1.1 — Preflight env gate (must run BEFORE any other shell call).
log('Stage 1.1 preflight: verifying CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 and Claude Code >= v2.1.178');
const preflight = await agent(
  `Run this command and report ONLY the exit code and the LAST line of stdout/stderr:\n\n` +
  `  bash ${shellQuote(PLUGIN_ROOT + '/scripts/preflight-env.sh')}\n\n` +
  `Return JSON: {"exit_code": int, "tail": string}. Do not retry on failure.`,
  {
    label: 'preflight',
    phase: 'Stage 1 — Setup',
    agentType: 'general-purpose',
    schema: {
      type: 'object',
      required: ['exit_code', 'tail'],
      additionalProperties: false,
      properties: { exit_code: { type: 'integer' }, tail: { type: 'string' } },
    },
  },
);
if (preflight.exit_code !== 0) {
  throw new Error(
    `super-dev preflight failed (exit ${preflight.exit_code}): ${preflight.tail}\n` +
    `Resolve the environment issue, then re-run.`
  );
}

// Step 1.2 — Pull latest. Detect default branch first; never hard-code 'main'.
log('Stage 1.2 pull-latest: fetching origin and fast-forwarding default branch');
const defaultBranchResult = await agent(
  `Run this exactly and return ONLY the trimmed stdout (or the stderr if exit != 0):\n\n` +
  detectDefaultBranchSnippet(REPO_PATH) +
  `\nReturn JSON: {"ok": bool, "branch": string, "error": string}.`,
  {
    label: 'detect-default-branch',
    phase: 'Stage 1 — Setup',
    agentType: 'general-purpose',
    schema: {
      type: 'object',
      required: ['ok', 'branch'],
      properties: { ok: { type: 'boolean' }, branch: { type: 'string' }, error: { type: 'string' } },
    },
  },
);
if (!defaultBranchResult.ok) {
  throw new Error(`Stage 1: cannot detect default branch — ${defaultBranchResult.error || 'unknown'}`);
}
const DEFAULT_BRANCH = defaultBranchResult.branch;
log(`Default branch resolved to: ${DEFAULT_BRANCH}`);

const pullResult = await agent(
  `Run this exactly. Report exit code and stderr verbatim — do NOT auto-rebase, force-pull, or stash:\n\n` +
  pullLatestSnippet(REPO_PATH, DEFAULT_BRANCH) +
  `\nReturn JSON: {"ok": bool, "stderr": string}.`,
  {
    label: 'pull-latest',
    phase: 'Stage 1 — Setup',
    agentType: 'general-purpose',
    schema: {
      type: 'object',
      required: ['ok'],
      properties: { ok: { type: 'boolean' }, stderr: { type: 'string' } },
    },
  },
);
if (!pullResult.ok) {
  throw new Error(
    `Stage 1: 'git pull --ff-only' failed on ${DEFAULT_BRANCH}. ` +
    `Resolve manually (divergence / dirty tree / detached HEAD) and retry.\n` +
    `git stderr:\n${pullResult.stderr || '(empty)'}`
  );
}

// Step 1.3 — Spec index, name, identifier.
log('Stage 1.3 spec naming');
const specMeta = await agent(
  `In the repo at ${shellQuote(REPO_PATH)}, look at the 'specification/' directory (it may not exist yet). ` +
  `Find the highest existing 2-digit numeric prefix (folders named NN-something). Compute next_index = max + 1, ` +
  `zero-padded to 2 digits (e.g. '07'). Derive spec_name from this user request as kebab-case lowercase: ` +
  `${JSON.stringify(REQUEST)}. Return JSON: {"next_index": "NN", "spec_name": "kebab-case", "spec_identifier": "NN-kebab-case"}.`,
  {
    label: 'spec-naming',
    phase: 'Stage 1 — Setup',
    agentType: 'general-purpose',
    schema: {
      type: 'object',
      required: ['next_index', 'spec_name', 'spec_identifier'],
      properties: {
        next_index: { type: 'string', pattern: '^[0-9]{2}$' },
        spec_name: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$' },
        spec_identifier: { type: 'string' },
      },
    },
  },
);
log(`Spec identifier: ${specMeta.spec_identifier}`);

// Step 1.4 — Create worktree and capture the absolute path.
log('Stage 1.4 worktree');
const worktreeResult = await agent(
  `Run this exactly and return the trimmed stdout (which is the absolute worktree path):\n\n` +
  worktreeAddSnippet(REPO_PATH, specMeta.spec_identifier) +
  `\nReturn JSON: {"ok": bool, "worktree_path": string, "stderr": string}.`,
  {
    label: 'worktree-add',
    phase: 'Stage 1 — Setup',
    agentType: 'general-purpose',
    schema: {
      type: 'object',
      required: ['ok'],
      properties: { ok: { type: 'boolean' }, worktree_path: { type: 'string' }, stderr: { type: 'string' } },
    },
  },
);
if (!worktreeResult.ok) {
  throw new Error(`Stage 1: 'git worktree add' failed — ${worktreeResult.stderr || 'unknown'}`);
}
const WORKTREE_PATH = worktreeResult.worktree_path;
const SPEC_DIRECTORY = `${WORKTREE_PATH}/specification/${specMeta.spec_identifier}`;

// Step 1.5 — Spec directory + tracking JSON.
log('Stage 1.5 spec dir + tracking JSON');
await agent(
  `Run: mkdir -p ${shellQuote(SPEC_DIRECTORY)}\n` +
  `Then copy ${shellQuote(PLUGIN_ROOT + '/reference/workflow-tracking-template.json')} to ` +
  `${shellQuote(SPEC_DIRECTORY + '/' + specMeta.spec_identifier + '-workflow-tracking.json')} and ` +
  `edit it so:\n` +
  `  - top-level "worktreePath" = ${JSON.stringify(WORKTREE_PATH)}\n` +
  `  - top-level "team.name" = ${JSON.stringify('super-dev-' + specMeta.spec_name)} (informational only)\n` +
  `  - the "stages" array contains 13 entries (id 1..13) with status "pending"\n` +
  `Return JSON: {"ok": bool, "tracking_path": string}.`,
  {
    label: 'init-tracking-json',
    phase: 'Stage 1 — Setup',
    agentType: 'general-purpose',
    schema: {
      type: 'object',
      required: ['ok', 'tracking_path'],
      properties: { ok: { type: 'boolean' }, tracking_path: { type: 'string' } },
    },
  },
);

log(`Stage 1 complete. Worktree: ${WORKTREE_PATH}`);
log(`Spec dir: ${SPEC_DIRECTORY}`);

// ---------------------------------------------------------------------------
// Stage 2 — Requirements + BDD
//   Two sequential writer+validator pairs, each pair runs in parallel.
// ---------------------------------------------------------------------------
phase('Stage 2 — Requirements + BDD');

// 2A — Requirements + gate-requirements
log('Stage 2A: requirements-clarifier + doc-validator (gate-requirements) in parallel');
const [req, reqVerdict] = await parallel([
  () => agent(
    `User request: ${JSON.stringify(REQUEST)}\n\n` +
    `Write the requirements document to ${shellQuote(SPEC_DIRECTORY + '/01-requirements.md')}. ` +
    `Capture acceptance criteria, scope, non-goals, constraints, and open questions. ` +
    `Worktree: ${WORKTREE_PATH}. Plugin root: ${PLUGIN_ROOT}.`,
    {
      label: 'requirements-clarifier',
      phase: 'Stage 2 — Requirements + BDD',
      agentType: 'requirements-clarifier',
      schema: REQUIREMENTS_OUTPUT,
    },
  ),
  () => agent(
    `Wait for ${shellQuote(SPEC_DIRECTORY + '/01-requirements.md')} to appear, then run ` +
    `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-requirements.sh')} ${shellQuote(SPEC_DIRECTORY + '/01-requirements.md')}. ` +
    `Return the gate verdict.`,
    {
      label: 'doc-validator:gate-requirements',
      phase: 'Stage 2 — Requirements + BDD',
      agentType: 'doc-validator',
      schema: GATE_VERDICT,
    },
  ),
]);
if (!reqVerdict?.pass) {
  throw new Error(`Stage 2A gate-requirements failed: ${(reqVerdict?.errors || []).join('; ')}`);
}
log(`Requirements: ${req.ac_count} ACs captured.`);

// 2B — BDD scenarios + gate-bdd
log('Stage 2B: bdd-scenario-writer + doc-validator (gate-bdd) in parallel');
const [bdd, bddVerdict] = await parallel([
  () => agent(
    `Read ${shellQuote(req.doc_path)} from the spec directory. Produce BDD Given/When/Then scenarios at ` +
    `${shellQuote(SPEC_DIRECTORY + '/02-bdd-scenarios.md')} covering every acceptance criterion. ` +
    `Feature name: ${req.feature_name}. Worktree: ${WORKTREE_PATH}.`,
    {
      label: 'bdd-scenario-writer',
      phase: 'Stage 2 — Requirements + BDD',
      agentType: 'bdd-scenario-writer',
      schema: BDD_OUTPUT,
    },
  ),
  () => agent(
    `Wait for ${shellQuote(SPEC_DIRECTORY + '/02-bdd-scenarios.md')} to appear, then run ` +
    `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-bdd.sh')} ${shellQuote(SPEC_DIRECTORY + '/02-bdd-scenarios.md')}. ` +
    `Return the gate verdict.`,
    {
      label: 'doc-validator:gate-bdd',
      phase: 'Stage 2 — Requirements + BDD',
      agentType: 'doc-validator',
      schema: GATE_VERDICT,
    },
  ),
]);
if (!bddVerdict?.pass) {
  throw new Error(`Stage 2B gate-bdd failed: ${(bddVerdict?.errors || []).join('; ')}`);
}
log(`BDD: ${bdd.scenario_count} scenarios (coverage ${Math.round((bdd.coverage_score ?? 0) * 100)}%).`);

// ---------------------------------------------------------------------------
// Stage 3 — Research
//   Initial pass, then up to 2 deep-research iterations if open_issues
//   surface. Capped at 3 total iterations (the project rule).
// ---------------------------------------------------------------------------
phase('Stage 3 — Research');

const researchReports = [];
let researchIteration = 0;
let openIssues = [];
const MAX_RESEARCH = 3;

while (researchIteration < MAX_RESEARCH) {
  researchIteration += 1;
  const isDeep = researchIteration > 1;
  const outName = isDeep
    ? `04-deep-research-report-${researchIteration - 1}.md`
    : '03-research-report.md';
  log(`Stage 3 iteration ${researchIteration} (${isDeep ? 'deep-research' : 'initial'})`);

  const report = await agent(
    `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}.\n` +
    `Inputs to read yourself: ${req.doc_path}, ${bdd.doc_path}` +
    (researchReports.length
      ? `, plus prior reports ${researchReports.map(r => r.doc_path).join(', ')}\n` +
        `Issues to resolve this iteration:\n - ${openIssues.join('\n - ')}`
      : '\n') +
    `\nProduce ${outName} in the spec directory. Present 3-5 design options with explicit pros/cons. ` +
    `If the prior pass left unresolved issues, address each.`,
    {
      label: isDeep ? `deep-research-${researchIteration - 1}` : 'research-initial',
      phase: 'Stage 3 — Research',
      agentType: 'research-agent',
      schema: RESEARCH_OUTPUT,
    },
  );
  researchReports.push(report);
  openIssues = report.open_issues ?? [];

  if (openIssues.length === 0) {
    log(`Stage 3 settled after ${researchIteration} iteration(s); ${report.options.length} options presented.`);
    break;
  }
  log(`Stage 3 iteration ${researchIteration} flagged ${openIssues.length} open issue(s); ` +
      `${MAX_RESEARCH - researchIteration} iteration(s) remaining.`);
}

// ---------------------------------------------------------------------------
// Return value — read by the super-dev skill so it can present options to
// the user before subsequent stages run. Stages 4-13 land in C3-C9.
// ---------------------------------------------------------------------------
return {
  worktree_path: WORKTREE_PATH,
  spec_directory: SPEC_DIRECTORY,
  spec_identifier: specMeta.spec_identifier,
  default_branch: DEFAULT_BRANCH,
  requirements: { doc: req.doc_path, ac_count: req.ac_count, summary: req.summary },
  bdd: { doc: bdd.doc_path, scenario_count: bdd.scenario_count },
  research: {
    iterations: researchIteration,
    latest_doc: researchReports[researchReports.length - 1].doc_path,
    options: researchReports[researchReports.length - 1].options,
  },
  next_stage: 4,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function shellQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}
