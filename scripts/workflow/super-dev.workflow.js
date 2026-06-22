// super-dev/scripts/workflow/super-dev.workflow.js
//
// Dynamic Workflow entry point for the super-dev plugin. Replaces the
// team-lead-narrated orchestration with a deterministic JS script that
// holds the 13-stage plan, the iteration loops, and the structured
// intermediate results in code. The model focuses on each subagent
// task; the script focuses on flow.
//
// Layout (Phase B C2-C5 — Stages 1-9 only; later stages added in C6-C9):
//   Stage 1   — Preflight + pull-latest + worktree + spec dir + tracking JSON
//   Stage 2   — Requirements + BDD (writer + doc-validator pairs)
//   Stage 3   — Research (initial + up-to-3 deep-research iterations)
//   Stage 4   — Debug analysis (bugs only; supports parallel multi-hypothesis)
//   Stage 5   — Code assessment (first code-reading stage)
//   Stage 6   — Design routing (architecture / ui-ux / product, by feature_kind)
//   Stage 6.5 — Prototype (conditional: only when design declares numeric constants)
//   Stage 7   — Specification (spec-writer + gate-spec-trace)
//   Stage 8   — Spec review (spec-reviewer + gate-spec-review) with iteration loop (max 3)
//   Stage 9   — Per-phase TDD pipeline with per-phase commits + gate-build
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

import { detectDefaultBranchSnippet, pullLatestSnippet, worktreeAddSnippet,
         captureHeadSnippet, commitPhaseSnippet }
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
    { title: 'Stage 4 — Debug Analysis' },
    { title: 'Stage 5 — Code Assessment' },
    { title: 'Stage 6 — Design' },
    { title: 'Stage 6.5 — Prototype' },
    { title: 'Stage 7 — Specification' },
    { title: 'Stage 8 — Spec Review' },
    { title: 'Stage 9 — Implementation' },
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

const DEBUG_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'hypotheses'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    hypotheses: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['statement', 'confidence', 'status'],
        properties: {
          statement: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          status: { type: 'string', enum: ['confirmed', 'refuted', 'untested'] },
          evidence: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    root_cause: { type: 'string' },
    reproduction_steps: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
};

const ASSESSMENT_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'patterns', 'files_assessed'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    patterns: { type: 'array', items: { type: 'string' } },
    files_assessed: { type: 'integer', minimum: 0 },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'priority'],
        properties: {
          title: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          rationale: { type: 'string' },
        },
      },
    },
    summary: { type: 'string' },
  },
};

const DESIGN_OUTPUT = {
  type: 'object',
  required: ['designer', 'docs'],
  additionalProperties: false,
  properties: {
    designer: {
      type: 'string',
      enum: ['architecture-designer', 'architecture-improver', 'ui-ux-designer', 'product-designer'],
    },
    docs: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['kind', 'path'],
        properties: {
          kind: { type: 'string', enum: ['architecture', 'ui-ux-design', 'product-design-summary'] },
          path: { type: 'string' },
        },
      },
    },
    modules: { type: 'array', items: { type: 'string' } },
    has_numeric_constants: { type: 'boolean' },
    summary: { type: 'string' },
  },
};

const PROTOTYPE_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'constants_tested', 'verdict'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    constants_tested: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'spec_value', 'measured_value', 'within_tolerance'],
        properties: {
          name: { type: 'string' },
          spec_value: { type: 'number' },
          measured_value: { type: 'number' },
          within_tolerance: { type: 'boolean' },
          tolerance: { type: 'number' },
          samples: { type: 'integer', minimum: 1 },
        },
      },
    },
    verdict: { type: 'string', enum: ['PROTOTYPE_OK', 'PROTOTYPE_FAILED'] },
    failing_constants: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
};

const SPEC_OUTPUT = {
  type: 'object',
  required: ['specification_path', 'plan_path', 'tasks_path', 'phase_count'],
  additionalProperties: false,
  properties: {
    specification_path: { type: 'string' },
    plan_path: { type: 'string' },
    tasks_path: { type: 'string' },
    phase_count: { type: 'integer', minimum: 1 },
    phases: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['number', 'name'],
        properties: {
          number: { type: 'integer', minimum: 1 },
          name: { type: 'string' },
          depends_on: { type: 'array', items: { type: 'integer' } },
        },
      },
    },
    summary: { type: 'string' },
  },
};

const SPEC_REVIEW_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'verdict'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    verdict: { type: 'string', enum: ['APPROVED', 'REVISIONS NEEDED', 'REJECTED'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['section', 'severity', 'issue'],
        properties: {
          section: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          issue: { type: 'string' },
          recommendation: { type: 'string' },
        },
      },
    },
    dimensions_scored: {
      type: 'object',
      additionalProperties: { type: 'number', minimum: 0, maximum: 1 },
    },
    summary: { type: 'string' },
  },
};

const TDD_OUTPUT = {
  type: 'object',
  required: ['phase_number', 'test_files', 'expected_state'],
  additionalProperties: false,
  properties: {
    phase_number: { type: 'integer', minimum: 1 },
    test_files: { type: 'array', minItems: 1, items: { type: 'string' } },
    expected_state: { type: 'string', enum: ['RED', 'GREEN'] },
    coverage_map: {
      type: 'array',
      items: {
        type: 'object',
        required: ['scenario_id', 'test'],
        properties: { scenario_id: { type: 'string' }, test: { type: 'string' } },
      },
    },
    summary: { type: 'string' },
  },
};

const IMPL_OUTPUT = {
  type: 'object',
  required: ['phase_number', 'specialist', 'files_modified', 'all_tests_green'],
  additionalProperties: false,
  properties: {
    phase_number: { type: 'integer', minimum: 1 },
    specialist: {
      type: 'string',
      enum: [
        'rust-developer', 'golang-developer', 'frontend-developer', 'backend-developer',
        'ios-developer', 'android-developer', 'macos-app-developer', 'windows-app-developer',
        'dev-executor',
      ],
    },
    files_modified: { type: 'array', items: { type: 'string' } },
    all_tests_green: { type: 'boolean' },
    build_command: { type: 'string' },
    summary: { type: 'string' },
  },
};

const IMPL_SUMMARY_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'phase_number', 'files_changed'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    phase_number: { type: 'integer', minimum: 1 },
    phase_name: { type: 'string' },
    files_changed: {
      type: 'object',
      additionalProperties: false,
      properties: {
        created:  { type: 'array', items: { type: 'string' } },
        modified: { type: 'array', items: { type: 'string' } },
        deleted:  { type: 'array', items: { type: 'string' } },
      },
    },
    tasks_complete: { type: 'array', items: { type: 'string' } },
    tasks_partial:  { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
};

const QA_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'phase_number', 'tests_total', 'tests_passed', 'all_green'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    phase_number: { type: 'integer', minimum: 1 },
    tests_total:  { type: 'integer', minimum: 0 },
    tests_passed: { type: 'integer', minimum: 0 },
    tests_failed: { type: 'integer', minimum: 0 },
    all_green:    { type: 'boolean' },
    coverage_overall: { type: 'number', minimum: 0, maximum: 1 },
    coverage_new:     { type: 'number', minimum: 0, maximum: 1 },
    uncovered_scenarios: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
};

const E2E_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'phase_number', 'browsers_run', 'all_green'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    phase_number: { type: 'integer', minimum: 1 },
    browsers_run: { type: 'array', minItems: 1, items: { type: 'string' } },
    scenarios_run:    { type: 'integer', minimum: 0 },
    scenarios_passed: { type: 'integer', minimum: 0 },
    all_green: { type: 'boolean' },
    performance_budget_met: { type: 'boolean' },
    accessibility_violations: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
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
//     ui_scope:       'none' | 'ui-only' | 'ui+arch'           (default 'none')
//                       Drives Stage 6 designer routing:
//                         feature/refactor + 'none'    -> architecture-designer / -improver
//                         any              + 'ui-only' -> ui-ux-designer
//                         any              + 'ui+arch' -> product-designer
//     bug_evidence:   string,   // evidence/logs/repro for bugs (Stage 4)
//     input_samples:  string[]  // optional Stage 6.5 sample paths / inline data
//                                  used by prototype-runner when the design
//                                  declares numeric constants. Required for
//                                  any feature with empirical constants;
//                                  without them Stage 6.5 fails closed.
//     max_spec_iters: integer,  // Stage 8 iteration cap (default 3)
//     language:       'rust' | 'go' | 'frontend' | 'backend' | 'ios' |
//                     'android' | 'macos' | 'windows' | 'mixed'  (default 'mixed')
//                       Routes the Stage 9.2 domain specialist. 'mixed'
//                       falls back to dev-executor.
//     is_web_ui:      boolean,   // Stage 9.5 e2e gate. Default: false.
//     max_phase_iters: integer,  // Stage 9 per-phase build-fix iteration cap (default 3)
//   }
// ---------------------------------------------------------------------------
const REQUEST     = args?.request ?? '';
const PLUGIN_ROOT = args?.plugin_root ?? '';
const REPO_PATH   = args?.repo_path ?? '';
const FEATURE_KIND = args?.feature_kind ?? 'auto';
const UI_SCOPE    = args?.ui_scope ?? 'none';
const BUG_EVIDENCE = args?.bug_evidence ?? '';
const INPUT_SAMPLES = Array.isArray(args?.input_samples) ? args.input_samples : [];
const MAX_SPEC_ITERS = Number.isInteger(args?.max_spec_iters) ? args.max_spec_iters : 3;
const LANGUAGE   = args?.language ?? 'mixed';
const IS_WEB_UI  = Boolean(args?.is_web_ui ?? (UI_SCOPE !== 'none'));
const MAX_PHASE_ITERS = Number.isInteger(args?.max_phase_iters) ? args.max_phase_iters : 3;

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
// Document index counter — file prefixes follow "max existing + 1" rule.
// We track the next prefix in JS so we don't have to grep the spec dir
// between every stage. Initial value 1 because the spec dir is empty at
// Stage 2 entry.
// ---------------------------------------------------------------------------
let nextDocIndex = 1;
const docName = (suffix) => {
  const idx = String(nextDocIndex).padStart(2, '0');
  nextDocIndex += 1;
  return `${idx}-${suffix}`;
};

// ---------------------------------------------------------------------------
// Stage 2 — Requirements + BDD
//   Two sequential writer+validator pairs, each pair runs in parallel.
// ---------------------------------------------------------------------------
phase('Stage 2 — Requirements + BDD');

// 2A — Requirements + gate-requirements
log('Stage 2A: requirements-clarifier + doc-validator (gate-requirements) in parallel');
const requirementsName = docName('requirements.md');
const [req, reqVerdict] = await parallel([
  () => agent(
    `User request: ${JSON.stringify(REQUEST)}\n\n` +
    `Write the requirements document to ${shellQuote(SPEC_DIRECTORY + '/' + requirementsName)}. ` +
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
    `Wait for ${shellQuote(SPEC_DIRECTORY + '/' + requirementsName)} to appear, then run ` +
    `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-requirements.sh')} ${shellQuote(SPEC_DIRECTORY + '/' + requirementsName)}. ` +
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
const bddName = docName('bdd-scenarios.md');
const [bdd, bddVerdict] = await parallel([
  () => agent(
    `Read ${shellQuote(req.doc_path)} from the spec directory. Produce BDD Given/When/Then scenarios at ` +
    `${shellQuote(SPEC_DIRECTORY + '/' + bddName)} covering every acceptance criterion. ` +
    `Feature name: ${req.feature_name}. Worktree: ${WORKTREE_PATH}.`,
    {
      label: 'bdd-scenario-writer',
      phase: 'Stage 2 — Requirements + BDD',
      agentType: 'bdd-scenario-writer',
      schema: BDD_OUTPUT,
    },
  ),
  () => agent(
    `Wait for ${shellQuote(SPEC_DIRECTORY + '/' + bddName)} to appear, then run ` +
    `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-bdd.sh')} ${shellQuote(SPEC_DIRECTORY + '/' + bddName)}. ` +
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
    ? docName(`deep-research-report-${researchIteration - 1}.md`)
    : docName('research-report.md');
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
// Stage 4 — Debug Analysis (bugs only)
//   Multi-hypothesis: when an initial triage returns 2+ hypotheses with
//   similar confidence, fan out parallel debug-analyzers (one per hypothesis)
//   so the first confirmed cause wins without serializing investigation.
// ---------------------------------------------------------------------------
phase('Stage 4 — Debug Analysis');

let debugResult = null;
const isBug = FEATURE_KIND === 'bug' || (FEATURE_KIND === 'auto' && /\b(bug|broken|crash|fail|regression|error|panic)\b/i.test(REQUEST));
if (!isBug) {
  log(`Stage 4 skipped (feature_kind=${FEATURE_KIND}, no bug signals in request).`);
} else {
  log('Stage 4: initial triage to enumerate hypotheses');
  const debugName = docName('debug-analysis.md');
  const triage = await agent(
    `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}.\n` +
    `Inputs to read yourself: ${req.doc_path}, ${bdd.doc_path}, ${researchReports[researchReports.length - 1].doc_path}.\n` +
    `User report: ${JSON.stringify(REQUEST)}\n` +
    `Evidence/logs/repro provided: ${JSON.stringify(BUG_EVIDENCE)}\n\n` +
    `Produce ${shellQuote(SPEC_DIRECTORY + '/' + debugName)}. ` +
    `Generate 3-5 ranked, FALSIFIABLE root-cause hypotheses, each with the evidence ` +
    `you'd need to confirm/refute. Do NOT investigate code yet — that is a follow-up ` +
    `pass. Mark every hypothesis status='untested' on this pass.`,
    {
      label: 'debug-analyzer:triage',
      phase: 'Stage 4 — Debug Analysis',
      agentType: 'debug-analyzer',
      schema: DEBUG_OUTPUT,
    },
  );

  // Multi-hypothesis parallel investigation when the top candidates are
  // closely ranked. The trigger from team-lead.md is: 2+ hypotheses with
  // similar evidence (no single one above ~60% confidence).
  const top = [...triage.hypotheses].sort((a, b) => b.confidence - a.confidence);
  const leader = top[0]?.confidence ?? 0;
  const tied = top.filter(h => h.confidence >= Math.max(leader - 0.1, 0.4)).slice(0, 3);

  if (tied.length >= 2 && leader < 0.6) {
    log(`Stage 4: ${tied.length} tied hypotheses (leader ${leader.toFixed(2)} < 0.6) — fanning out parallel investigators`);
    const investigations = await parallel(
      tied.map((h, idx) => () => agent(
        `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}.\n` +
        `Investigate ONLY this hypothesis from ${triage.doc_path}:\n  ${h.statement}\n\n` +
        `Build a minimal reproduction, instrument the code, and confirm OR refute. ` +
        `Append your findings to ${shellQuote(SPEC_DIRECTORY + '/' + debugName)} ` +
        `under a new section "Hypothesis ${idx + 1}: ${h.statement.slice(0, 80)}". ` +
        `Return a fresh DebugOutput reflecting ALL hypotheses with this one updated.`,
        {
          label: `debug-investigate:${idx + 1}`,
          phase: 'Stage 4 — Debug Analysis',
          agentType: 'debug-analyzer',
          schema: DEBUG_OUTPUT,
        },
      )),
    );
    // First confirmed hypothesis wins; otherwise keep the highest-confidence result.
    const confirmed = investigations.filter(Boolean).find(d =>
      d.hypotheses.some(h => h.status === 'confirmed'),
    );
    debugResult = confirmed ?? investigations.filter(Boolean).sort((a, b) => {
      const max = (d) => Math.max(...d.hypotheses.map(h => h.confidence));
      return max(b) - max(a);
    })[0] ?? triage;
  } else {
    debugResult = triage;
  }
  const rootCause = debugResult.root_cause || '(unresolved — escalate or pivot)';
  log(`Stage 4 complete: root cause = ${rootCause}`);
}

// ---------------------------------------------------------------------------
// Stage 5 — Code Assessment (first code-reading stage)
// ---------------------------------------------------------------------------
phase('Stage 5 — Code Assessment');

log('Stage 5: code-assessor — first codebase exploration');
const assessmentName = docName('code-assessment.md');
const assessment = await agent(
  `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}.\n` +
  `Inputs to read yourself: ${req.doc_path}, ${bdd.doc_path}, ${researchReports[researchReports.length - 1].doc_path}` +
    (debugResult ? `, ${debugResult.doc_path}` : '') + `.\n\n` +
  `This is the FIRST code-reading stage. Inspect the codebase rooted at ${WORKTREE_PATH} ` +
  `and identify the patterns/idioms the new code MUST follow. Cite files and line numbers. ` +
  `Produce ${shellQuote(SPEC_DIRECTORY + '/' + assessmentName)}.`,
  {
    label: 'code-assessor',
    phase: 'Stage 5 — Code Assessment',
    agentType: 'code-assessor',
    schema: ASSESSMENT_OUTPUT,
  },
);
log(`Stage 5 complete: ${assessment.files_assessed} files assessed, ${assessment.patterns.length} patterns to follow.`);

// ---------------------------------------------------------------------------
// Stage 6 — Design (routed by feature_kind + ui_scope)
//   feature + 'none'    → architecture-designer
//   refactor + 'none'   → architecture-improver
//   any      + 'ui-only' → ui-ux-designer
//   any      + 'ui+arch' → product-designer (composite)
//   bug      + 'none'   → SKIP (design changes only on confirmed pivot)
// ---------------------------------------------------------------------------
phase('Stage 6 — Design');

let design = null;
let designerType = null;
if (UI_SCOPE === 'ui+arch') {
  designerType = 'product-designer';
} else if (UI_SCOPE === 'ui-only') {
  designerType = 'ui-ux-designer';
} else if (FEATURE_KIND === 'bug') {
  log('Stage 6 skipped (bug fixes do not redesign — pivot-protocol owns design changes).');
} else if (FEATURE_KIND === 'refactor') {
  designerType = 'architecture-improver';
} else {
  designerType = 'architecture-designer';
}

if (designerType) {
  log(`Stage 6: routing to ${designerType}`);
  const designerInputs =
    `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}.\n` +
    `Inputs to read yourself: ${req.doc_path}, ${bdd.doc_path}, ` +
    `${researchReports[researchReports.length - 1].doc_path}, ${assessment.doc_path}` +
    (debugResult ? `, ${debugResult.doc_path}` : '') + `.\n` +
    `Selected research option(s): present 3-5 architecture/design options aligned with the ` +
    `research report's preferred direction; pick one and document the rationale and trade-offs.`;

  const expectedSuffix = {
    'architecture-designer': 'architecture.md',
    'architecture-improver': 'architecture.md',
    'ui-ux-designer': 'ui-ux-design.md',
    'product-designer': 'product-design-summary.md',
  }[designerType];
  const outputFile = docName(expectedSuffix);

  design = await agent(
    `${designerInputs}\n\n` +
    `Produce ${shellQuote(SPEC_DIRECTORY + '/' + outputFile)}. ` +
    (designerType === 'product-designer'
      ? `As a product designer you also coordinate the architecture and ui-ux sub-documents — ` +
        `co-write ${shellQuote(SPEC_DIRECTORY + '/' + docName('architecture.md'))} and ` +
        `${shellQuote(SPEC_DIRECTORY + '/' + docName('ui-ux-design.md'))} alongside the summary. ` +
        `Return DesignOutput with all three docs.`
      : `Return DesignOutput with the document path and a list of declared modules. ` +
        `Set has_numeric_constants=true if the design fixes any numeric values that ` +
        `Stage 6.5 prototype-runner should validate empirically.`),
    {
      label: designerType,
      phase: 'Stage 6 — Design',
      agentType: designerType,
      schema: DESIGN_OUTPUT,
    },
  );
  log(`Stage 6 complete: ${design.docs.length} doc(s) written; numeric constants present: ${design.has_numeric_constants ?? false}`);
}

// ---------------------------------------------------------------------------
// Stage 6.5 — Prototype (CONDITIONAL)
//   Fires only when Stage 6 declared numeric design constants. Validates
//   them against representative real input samples BEFORE Stage 7 writes
//   the spec. On PROTOTYPE_FAILED, throws — the orchestrating skill must
//   invoke pivot-protocol with the failing constants and re-run from
//   Stage 6 with revised design before continuing.
// ---------------------------------------------------------------------------
phase('Stage 6.5 — Prototype');

let prototype = null;
const needPrototype = design?.has_numeric_constants === true;
if (!needPrototype) {
  log(`Stage 6.5 skipped (no numeric design constants declared).`);
} else if (INPUT_SAMPLES.length === 0) {
  // Fail-closed: empirical validation cannot proceed without real inputs.
  throw new Error(
    `Stage 6.5: design declares numeric constants but args.input_samples is empty. ` +
    `Provide 5-10 representative real input paths/strings before re-running the workflow ` +
    `(see "Discipline A" in reference/lessons-learned/spec-29-visual-verification.md).`
  );
} else {
  log(`Stage 6.5: prototype-runner validating constants against ${INPUT_SAMPLES.length} sample(s)`);
  const protoName = docName('prototype-report.md');
  const designDoc = (design.docs.find(d => d.kind === 'architecture')?.path)
    ?? design.docs[0].path;
  const [proto, protoVerdict] = await parallel([
    () => agent(
      `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}.\n` +
      `Design document: ${designDoc}\n` +
      `Input samples (JSON): ${JSON.stringify(INPUT_SAMPLES)}\n\n` +
      `Extract every numeric design constant from the design document (thresholds, ratios, ` +
      `percentages, alphas, sizes). Build a minimal prototype that exercises each constant ` +
      `against the supplied samples. Measure the actual value(s) achieved. Compare to the ` +
      `spec value within the tolerance declared in the design (or 10% if unspecified). ` +
      `Write ${shellQuote(SPEC_DIRECTORY + '/' + protoName)} with a table of ` +
      `name | spec | measured | tolerance | within? per constant. Set verdict='PROTOTYPE_OK' ` +
      `iff every constant is within tolerance, otherwise 'PROTOTYPE_FAILED' and list the ` +
      `failing constants by name.`,
      {
        label: 'prototype-runner',
        phase: 'Stage 6.5 — Prototype',
        agentType: 'prototype-runner',
        schema: PROTOTYPE_OUTPUT,
      },
    ),
    () => agent(
      `Wait for ${shellQuote(SPEC_DIRECTORY + '/' + protoName)} to appear, then run ` +
      `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-prototype.sh')} ${shellQuote(SPEC_DIRECTORY + '/' + protoName)}. ` +
      `Return the gate verdict.`,
      {
        label: 'doc-validator:gate-prototype',
        phase: 'Stage 6.5 — Prototype',
        agentType: 'doc-validator',
        schema: GATE_VERDICT,
      },
    ),
  ]);
  if (!protoVerdict?.pass) {
    throw new Error(`Stage 6.5 gate-prototype failed: ${(protoVerdict?.errors || []).join('; ')}`);
  }
  if (proto.verdict === 'PROTOTYPE_FAILED') {
    throw new Error(
      `Stage 6.5: prototype empirically failed for constants ${JSON.stringify(proto.failing_constants)}. ` +
      `The spec design is built on wrong numbers — invoke pivot-protocol with these constants ` +
      `and re-run the workflow from Stage 6 (Design) with corrected values. ` +
      `Prototype report: ${proto.doc_path}`
    );
  }
  prototype = proto;
  log(`Stage 6.5 complete: ${proto.constants_tested.length} constants validated within tolerance.`);
}

// ---------------------------------------------------------------------------
// Stage 7 — Specification
//   spec-writer produces specification.md + implementation-plan.md +
//   task-list.md in a single invocation. doc-validator runs gate-spec-trace
//   to confirm every AC and BDD scenario is traced into the plan.
// ---------------------------------------------------------------------------
phase('Stage 7 — Specification');

const specName = docName('specification.md');
const planName = docName('implementation-plan.md');
const tasksName = docName('task-list.md');

const designDocList = design?.docs.map(d => d.path).join(', ') ?? '(no design — bug fix path)';
const baseSpecInputs =
  `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
  `Inputs to read yourself:\n` +
  `  - requirements: ${req.doc_path}\n` +
  `  - bdd: ${bdd.doc_path}\n` +
  `  - research: ${researchReports[researchReports.length - 1].doc_path}\n` +
  `  - assessment: ${assessment.doc_path}\n` +
  (debugResult ? `  - debug: ${debugResult.doc_path}\n` : '') +
  (design ? `  - design: ${designDocList}\n` : '') +
  (prototype ? `  - prototype: ${prototype.doc_path}\n` : '');

const spawnSpecWriter = (extraGuidance = '') => agent(
  `${baseSpecInputs}\n` +
  `Produce three documents:\n` +
  `  1. ${shellQuote(SPEC_DIRECTORY + '/' + specName)}\n` +
  `  2. ${shellQuote(SPEC_DIRECTORY + '/' + planName)} — implementation plan with phases\n` +
  `  3. ${shellQuote(SPEC_DIRECTORY + '/' + tasksName)} — task list (DAG with phase numbers)\n` +
  `Every AC from requirements and every BDD scenario MUST be traced into at least one phase. ` +
  `Set phase_count to the number of phases in the plan; return SpecOutput.` +
  (extraGuidance ? `\n\n--- Targeted revisions from prior review ---\n${extraGuidance}` : ''),
  {
    label: 'spec-writer',
    phase: 'Stage 7 — Specification',
    agentType: 'spec-writer',
    schema: SPEC_OUTPUT,
  },
);

let spec = await spawnSpecWriter();

const specTraceVerdict = await agent(
  `Wait for ${shellQuote(SPEC_DIRECTORY + '/' + specName)}, ${shellQuote(SPEC_DIRECTORY + '/' + planName)}, ` +
  `and ${shellQuote(SPEC_DIRECTORY + '/' + tasksName)} to appear, then run ` +
  `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-spec-trace.sh')} ${shellQuote(SPEC_DIRECTORY)}. ` +
  `Return the gate verdict.`,
  {
    label: 'doc-validator:gate-spec-trace',
    phase: 'Stage 7 — Specification',
    agentType: 'doc-validator',
    schema: GATE_VERDICT,
  },
);
if (!specTraceVerdict?.pass) {
  throw new Error(`Stage 7 gate-spec-trace failed: ${(specTraceVerdict?.errors || []).join('; ')}`);
}
log(`Stage 7 complete: spec + plan (${spec.phase_count} phases) + tasks; spec-trace gate PASS.`);

// ---------------------------------------------------------------------------
// Stage 8 — Spec Review (with iteration loop, max MAX_SPEC_ITERS)
//   spec-reviewer produces a verdict (APPROVED / REVISIONS NEEDED / REJECTED).
//   The loop body:
//     1. Spawn spec-reviewer + doc-validator(gate-spec-review) in parallel
//     2. If verdict==='APPROVED' and gate PASS → done
//     3. If verdict==='REVISIONS NEEDED' and iter < max → re-spawn spec-writer
//        with the reviewer's findings as targeted guidance, re-run gate-spec-trace,
//        then loop back to step 1
//     4. If verdict==='REJECTED' → throw (caller invokes pivot-protocol)
//     5. If iter === max → throw (escalate to user)
// ---------------------------------------------------------------------------
phase('Stage 8 — Spec Review');

let specReview = null;
let specIter = 0;
while (specIter < MAX_SPEC_ITERS) {
  specIter += 1;
  const reviewName = specIter === 1
    ? docName('spec-review.md')
    : docName(`spec-review-${specIter}.md`);
  log(`Stage 8 iteration ${specIter}/${MAX_SPEC_ITERS}: spec-reviewer + gate-spec-review`);

  const [review, reviewVerdict] = await parallel([
    () => agent(
      `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}.\n` +
      `Review the spec authored at ${spec.specification_path}, ${spec.plan_path}, ${spec.tasks_path}. ` +
      `Apply Fagan-style inspection across all 8 quality dimensions. Verify every reference ` +
      `(files, APIs, dependencies) against the actual codebase rooted at ${WORKTREE_PATH}. ` +
      `Produce ${shellQuote(SPEC_DIRECTORY + '/' + reviewName)} with verdict ` +
      `'APPROVED' | 'REVISIONS NEEDED' | 'REJECTED' and itemised findings. ` +
      `Do NOT rewrite the spec.`,
      {
        label: `spec-reviewer:${specIter}`,
        phase: 'Stage 8 — Spec Review',
        agentType: 'spec-reviewer',
        schema: SPEC_REVIEW_OUTPUT,
      },
    ),
    () => agent(
      `Wait for ${shellQuote(SPEC_DIRECTORY + '/' + reviewName)} to appear, then run ` +
      `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-spec-review.sh')} ${shellQuote(SPEC_DIRECTORY + '/' + reviewName)}. ` +
      `Return the gate verdict.`,
      {
        label: `doc-validator:gate-spec-review:${specIter}`,
        phase: 'Stage 8 — Spec Review',
        agentType: 'doc-validator',
        schema: GATE_VERDICT,
      },
    ),
  ]);

  if (!reviewVerdict?.pass) {
    throw new Error(
      `Stage 8 gate-spec-review failed on iteration ${specIter}: ` +
      `${(reviewVerdict?.errors || []).join('; ')}`
    );
  }

  specReview = review;

  if (review.verdict === 'APPROVED') {
    log(`Stage 8 complete on iteration ${specIter}: APPROVED.`);
    break;
  }
  if (review.verdict === 'REJECTED') {
    throw new Error(
      `Stage 8: spec REJECTED on iteration ${specIter}. The design is fundamentally flawed — ` +
      `invoke pivot-protocol and re-run the workflow from Stage 6 with a corrected design. ` +
      `Review report: ${review.doc_path}\n` +
      `Findings:\n${(review.findings || []).map(f => `  [${f.severity}] ${f.section}: ${f.issue}`).join('\n')}`
    );
  }

  // REVISIONS NEEDED — bail out only if we've used our iteration budget.
  if (specIter >= MAX_SPEC_ITERS) {
    throw new Error(
      `Stage 8: spec still 'REVISIONS NEEDED' after ${MAX_SPEC_ITERS} iterations — escalating to user. ` +
      `Final review: ${review.doc_path}`
    );
  }

  // Compose targeted guidance from findings and re-spawn spec-writer.
  log(`Stage 8 iteration ${specIter}: REVISIONS NEEDED — ${review.findings?.length ?? 0} finding(s); ` +
      `re-running spec-writer with targeted guidance.`);
  const guidance = (review.findings || [])
    .map(f => `- [${f.severity}] ${f.section}: ${f.issue}` +
              (f.recommendation ? `\n    Fix: ${f.recommendation}` : ''))
    .join('\n');
  spec = await spawnSpecWriter(guidance);

  // Re-validate trace gate after the rewrite.
  const reTrace = await agent(
    `Wait for the updated ${shellQuote(SPEC_DIRECTORY + '/' + specName)}, ` +
    `${shellQuote(SPEC_DIRECTORY + '/' + planName)}, and ${shellQuote(SPEC_DIRECTORY + '/' + tasksName)} ` +
    `to be stable, then run ` +
    `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-spec-trace.sh')} ${shellQuote(SPEC_DIRECTORY)}. ` +
    `Return the gate verdict.`,
    {
      label: `doc-validator:gate-spec-trace:revise-${specIter}`,
      phase: 'Stage 8 — Spec Review',
      agentType: 'doc-validator',
      schema: GATE_VERDICT,
    },
  );
  if (!reTrace?.pass) {
    throw new Error(
      `Stage 8 iteration ${specIter}: gate-spec-trace failed after spec rewrite: ` +
      `${(reTrace.errors || []).join('; ')}`
    );
  }
}

// ---------------------------------------------------------------------------
// Stage 9 — Per-phase TDD implementation
//   Sequential per phase (TDD discipline + per-phase commit ordering), but
//   each phase is its own self-contained pipeline:
//     9.1 capture base_sha
//     9.2 tdd-guide  (RED)
//     9.3 domain specialist (GREEN)  — routed by `language`
//     9.4 impl-summary-writer (DOCUMENT)
//     9.5 qa-agent (VERIFY)
//     9.6 e2e-runner (CONDITIONAL — only when is_web_ui)
//     9.7 doc-validator(gate-build) — final phase gate
//     9.8 commit the phase to git with feat(<phase-name>): summary message
//   On gate-build FAIL: re-run domain specialist with QA findings as guidance
//   (max MAX_PHASE_ITERS per phase). After cap, throw.
//
//   Why sequential across phases? Per-phase commits must land in plan order
//   so the running base_sha is monotonic and impl-summary diffs are clean.
//   Spec phases declare depends_on in SpecOutput.phases; we honour that
//   ordering and skip parallelism for safety (parallel-safe specialists are
//   added in C8 via isolation: worktree).
// ---------------------------------------------------------------------------
phase('Stage 9 — Implementation');

const phases = spec.phases?.length
  ? [...spec.phases].sort((a, b) => a.number - b.number)
  : Array.from({ length: spec.phase_count }, (_, i) => ({ number: i + 1, name: `Phase ${i + 1}` }));

// Domain specialist routing. 'mixed' / unrecognised falls back to dev-executor.
const SPECIALIST_BY_LANG = {
  rust:     'rust-developer',
  go:       'golang-developer',
  frontend: 'frontend-developer',
  backend:  'backend-developer',
  ios:      'ios-developer',
  android:  'android-developer',
  macos:    'macos-app-developer',
  windows:  'windows-app-developer',
};
const specialistAgent = SPECIALIST_BY_LANG[LANGUAGE] ?? 'dev-executor';
log(`Stage 9: ${phases.length} phase(s) total; domain specialist = ${specialistAgent}; is_web_ui=${IS_WEB_UI}`);

const phaseResults = [];

for (const ph of phases) {
  log(`Stage 9 phase ${ph.number}/${phases.length}: "${ph.name}"`);

  // 9.1 — capture base_sha BEFORE any test/code change.
  const baseSha = (await agent(
    `Run exactly:\n${captureHeadSnippet(WORKTREE_PATH)}\nReturn JSON: {"sha": string}.`,
    {
      label: `phase-${ph.number}:capture-base-sha`,
      phase: 'Stage 9 — Implementation',
      agentType: 'general-purpose',
      schema: { type: 'object', required: ['sha'], properties: { sha: { type: 'string' } } },
    },
  )).sha;

  // 9.2 — tdd-guide: write failing tests scoped to this phase.
  log(`  Phase ${ph.number}/9.2: tdd-guide (RED)`);
  const tdd = await agent(
    `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}.\n` +
    `Inputs to read yourself:\n` +
    `  - requirements: ${req.doc_path}\n` +
    `  - bdd: ${bdd.doc_path}\n` +
    `  - specification: ${spec.specification_path}\n` +
    `  - plan: ${spec.plan_path}\n` +
    `  - tasks: ${spec.tasks_path}\n` +
    `phase_scope: ${ph.number} ("${ph.name}").\n\n` +
    `Write failing tests scoped to THIS phase only. Tests SHOULD be RED (fail or fail to ` +
    `compile). If they accidentally pass against existing code, they are testing nothing — ` +
    `tighten the assertions and report expected_state='RED'.`,
    {
      label: `phase-${ph.number}:tdd-guide`,
      phase: 'Stage 9 — Implementation',
      agentType: 'tdd-guide',
      schema: TDD_OUTPUT,
    },
  );

  // 9.3-9.7 — implementation, summary, QA, e2e, gate-build, with a max-N
  // fix loop on gate-build failure (re-spawn specialist with QA findings).
  let impl = null, implSummary = null, qa = null, e2e = null, buildVerdict = null;
  let phaseIter = 0;
  while (phaseIter < MAX_PHASE_ITERS) {
    phaseIter += 1;
    log(`  Phase ${ph.number} iteration ${phaseIter}/${MAX_PHASE_ITERS}: specialist + impl-summary + qa` + (IS_WEB_UI ? ' + e2e' : ''));

    // 9.3 — domain specialist (GREEN). Pass review/QA findings on iter 2+.
    const reviewGuidance = (phaseIter > 1 && qa)
      ? `\n--- Targeted fixes from prior QA on this phase ---\n` +
        (qa.uncovered_scenarios?.length
          ? `Uncovered scenarios:\n  - ${qa.uncovered_scenarios.join('\n  - ')}\n`
          : '') +
        `tests_failed: ${qa.tests_failed ?? 0}, coverage_overall: ${qa.coverage_overall ?? 0}, ` +
        `coverage_new: ${qa.coverage_new ?? 0}. ` +
        `Re-read the failing-test output, fix the implementation, and ensure all_tests_green=true.`
      : '';

    impl = await agent(
      `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
      `Inputs to read yourself:\n` +
      `  - specification: ${spec.specification_path}\n` +
      `  - plan: ${spec.plan_path}\n` +
      `  - tasks: ${spec.tasks_path}\n` +
      `  - assessment patterns: ${assessment.doc_path}\n` +
      `  - failing tests: ${tdd.test_files.join(', ')}\n` +
      `phase_scope: ${ph.number} ("${ph.name}").\n\n` +
      `Implement the smallest code necessary to make ALL phase tests pass. Follow the ` +
      `patterns from the assessment. Do NOT touch files outside this phase's scope. ` +
      `Return ImplOutput with the exact build_command used.` + reviewGuidance,
      {
        label: `phase-${ph.number}:specialist:${phaseIter}`,
        phase: 'Stage 9 — Implementation',
        agentType: specialistAgent,
        schema: IMPL_OUTPUT,
      },
    );

    // 9.4 — impl-summary-writer (append per-phase section).
    implSummary = await agent(
      `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
      `phase_number: ${ph.number}. phase_name: "${ph.name}".\n` +
      `base_sha: ${baseSha}.\n` +
      `Append a section for this phase to the implementation-summary document (create it on ` +
      `phase 1, append on later phases). Diff against base_sha to enumerate files_changed.`,
      {
        label: `phase-${ph.number}:impl-summary:${phaseIter}`,
        phase: 'Stage 9 — Implementation',
        agentType: 'impl-summary-writer',
        schema: IMPL_SUMMARY_OUTPUT,
      },
    );

    // 9.5 — qa-agent (VERIFY).
    qa = await agent(
      `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
      `Inputs to read yourself: ${req.doc_path}, ${bdd.doc_path}, ${spec.specification_path}, ` +
      `${spec.plan_path}, ${spec.tasks_path}.\n` +
      `phase_scope: ${ph.number}.\n\n` +
      `Run the build_command (${JSON.stringify(impl.build_command)}). Verify ALL phase tests ` +
      `pass and coverage thresholds hold (overall 80%+, new 90%+). Map every test back to ` +
      `an AC-ID/SCENARIO-ID. Report uncovered scenarios honestly — a green build with gaps ` +
      `is worse than a red build with full coverage intent.`,
      {
        label: `phase-${ph.number}:qa:${phaseIter}`,
        phase: 'Stage 9 — Implementation',
        agentType: 'qa-agent',
        schema: QA_OUTPUT,
      },
    );

    // 9.6 — e2e-runner (CONDITIONAL).
    if (IS_WEB_UI) {
      e2e = await agent(
        `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
        `phase_number: ${ph.number}. Run E2E tests against the implementation. ` +
        `Cover all UI scenarios for this phase across the project's configured browsers. ` +
        `Verify performance and accessibility budgets.`,
        {
          label: `phase-${ph.number}:e2e:${phaseIter}`,
          phase: 'Stage 9 — Implementation',
          agentType: 'e2e-runner',
          schema: E2E_OUTPUT,
        },
      );
    }

    // 9.7 — gate-build. Final phase gate.
    buildVerdict = await agent(
      `Wait for the build to settle, then run ` +
      `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-build.sh')} ${shellQuote(WORKTREE_PATH)}. ` +
      `Return the gate verdict.`,
      {
        label: `phase-${ph.number}:gate-build:${phaseIter}`,
        phase: 'Stage 9 — Implementation',
        agentType: 'doc-validator',
        schema: GATE_VERDICT,
      },
    );

    const e2eOk = !IS_WEB_UI || (e2e?.all_green === true);
    if (buildVerdict?.pass && qa?.all_green && impl?.all_tests_green && e2eOk) {
      log(`  Phase ${ph.number} iteration ${phaseIter}: gate-build PASS`);
      break;
    }

    if (phaseIter >= MAX_PHASE_ITERS) {
      throw new Error(
        `Stage 9 phase ${ph.number} ("${ph.name}") failed after ${MAX_PHASE_ITERS} iteration(s). ` +
        `gate-build: ${buildVerdict?.pass ? 'PASS' : 'FAIL'}; ` +
        `qa.all_green: ${qa?.all_green}; impl.all_tests_green: ${impl?.all_tests_green}; ` +
        `e2e.all_green: ${e2e?.all_green ?? 'n/a'}. ` +
        `Escalating to user. QA report: ${qa?.doc_path}. ` +
        `gate-build errors: ${(buildVerdict?.errors || []).join('; ')}`
      );
    }
    log(`  Phase ${ph.number} iteration ${phaseIter}: gate failed, retrying with QA findings`);
  }

  // 9.8 — commit the phase. impl-summary-writer ran the diff against
  // base_sha; the commit message is feat(<phase-name>): <summary>.
  const phaseShortName = ph.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const commitMessage = `feat(${phaseShortName || 'phase-' + ph.number}): ${implSummary.summary?.split('\n')[0] ?? 'implement phase ' + ph.number}`;
  const commit = await agent(
    `Run exactly:\n${commitPhaseSnippet(WORKTREE_PATH, commitMessage)}\n` +
    `Return JSON: {"new_sha": string, "skipped": boolean}.`,
    {
      label: `phase-${ph.number}:commit`,
      phase: 'Stage 9 — Implementation',
      agentType: 'general-purpose',
      schema: {
        type: 'object',
        required: ['new_sha'],
        properties: { new_sha: { type: 'string' }, skipped: { type: 'boolean' } },
      },
    },
  );
  log(`  Phase ${ph.number} committed at ${commit.new_sha}${commit.skipped ? ' (no changes — empty commit skipped)' : ''}`);

  phaseResults.push({
    number: ph.number,
    name: ph.name,
    base_sha: baseSha,
    head_sha: commit.new_sha,
    test_files: tdd.test_files,
    impl_files: impl.files_modified,
    summary_doc: implSummary.doc_path,
    qa_doc: qa.doc_path,
    e2e_doc: e2e?.doc_path ?? null,
    iterations: phaseIter,
  });
}
log(`Stage 9 complete: ${phaseResults.length} phase(s) implemented & committed.`);
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
  debug: debugResult
    ? { doc: debugResult.doc_path, root_cause: debugResult.root_cause, reproduction_steps: debugResult.reproduction_steps }
    : null,
  assessment: { doc: assessment.doc_path, patterns: assessment.patterns, files_assessed: assessment.files_assessed },
  design: design
    ? { designer: design.designer, docs: design.docs, modules: design.modules ?? [], has_numeric_constants: design.has_numeric_constants ?? false }
    : null,
  prototype: prototype
    ? { doc: prototype.doc_path, constants_tested: prototype.constants_tested.length, verdict: prototype.verdict }
    : null,
  spec: {
    specification: spec.specification_path,
    plan: spec.plan_path,
    tasks: spec.tasks_path,
    phase_count: spec.phase_count,
    phases: spec.phases ?? [],
  },
  spec_review: {
    doc: specReview.doc_path,
    verdict: specReview.verdict,
    iterations: specIter,
  },
  implementation: {
    specialist: specialistAgent,
    phases: phaseResults,
    is_web_ui: IS_WEB_UI,
  },
  next_stage: 10,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function shellQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}
