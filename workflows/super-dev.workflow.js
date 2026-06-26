// super-dev/workflows/super-dev.workflow.js
//
// Dynamic Workflow entry point for the super-dev plugin. Replaces the
// team-lead-narrated orchestration with a deterministic JS script that
// holds the 13-stage plan, the iteration loops, and the structured
// intermediate results in code. The model focuses on each subagent
// task; the script focuses on flow.
//
// Layout (Phase B C2-C7 — Stages 1-13 complete; C8-C9 polish):
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
//   Stage 10  — Code review + adversarial review (parallel) with iteration loop + pivot trigger
//   Stage 11  — Docs (docs-executor -> gate-docs-drift) + optional handoff-writer
//   Stage 12  — build-cleaner (artifacts + sensitive-data scan; blocking on findings)
//   Stage 13  — Trailing commit + manual merge instructions
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
//
// IMPORTANT: per the Workflow runtime contract, `export const meta` MUST
// be the first statement in the file. Imports are NOT permitted before
// it. All helpers (git snippets, shellQuote) are defined as `function`
// declarations at the bottom — they hoist within the module so the body
// can call them even though they appear after the call sites.

// ---------------------------------------------------------------------------
// meta — pure literal as required by the Workflow runtime. MUST be the
// first statement in the file.
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
    { title: 'Stage 10 — Code Review' },
    { title: 'Stage 11 — Documentation' },
    { title: 'Stage 12 — Cleanup' },
    { title: 'Stage 13 — Merge' },
  ],
};

// ---------------------------------------------------------------------------
// JSON Schemas — loaded inline so the script is self-contained for the
// runtime. Source of truth is schemas/*.json.
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

const CODE_REVIEW_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'verdict', 'findings'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    verdict: {
      type: 'string',
      enum: ['Approved', 'Approved with Comments', 'Changes Requested', 'Blocked'],
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'severity', 'issue'],
        properties: {
          file: { type: 'string' },
          line: { type: 'integer', minimum: 1 },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
          category: { type: 'string' },
          issue: { type: 'string' },
          recommendation: { type: 'string' },
          uncertain: { type: 'boolean' },
        },
      },
    },
    dimensions_covered: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
};

const ADVERSARIAL_REVIEW_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'verdict', 'findings'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    verdict: { type: 'string', enum: ['PASS', 'CONTEST', 'REJECT'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['lens', 'severity', 'issue'],
        properties: {
          lens: { type: 'string', enum: ['skeptic', 'architect', 'minimalist'] },
          file: { type: 'string' },
          line: { type: 'integer', minimum: 1 },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          issue: { type: 'string' },
          recommendation: { type: 'string' },
          uncertain: { type: 'boolean' },
          research_ref: { type: 'string' },
        },
      },
    },
    spec_faithful_but_wrong: { type: 'boolean' },
    summary: { type: 'string' },
  },
};

const DOCS_OUTPUT = {
  type: 'object',
  required: ['docs_updated'],
  additionalProperties: false,
  properties: {
    docs_updated: { type: 'array', items: { type: 'string' } },
    spec_dir_files_reviewed: { type: 'integer', minimum: 0 },
    spec_dir_files_updated:  { type: 'integer', minimum: 0 },
    deviations_documented: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
};

const HANDOFF_OUTPUT = {
  type: 'object',
  required: ['doc_path', 'lines'],
  additionalProperties: false,
  properties: {
    doc_path: { type: 'string' },
    lines: { type: 'integer', minimum: 1 },
    unfinished_items: { type: 'array', items: { type: 'string' } },
    next_steps:       { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
};

const CLEANUP_OUTPUT = {
  type: 'object',
  required: ['languages_detected', 'sensitive_data_findings', 'blocked'],
  additionalProperties: false,
  properties: {
    languages_detected: { type: 'array', items: { type: 'string' } },
    directories_removed: { type: 'array', items: { type: 'string' } },
    commands_run: { type: 'array', items: { type: 'string' } },
    disk_reclaimed_bytes: { type: 'integer', minimum: 0 },
    sensitive_data_findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'kind'],
        properties: {
          file: { type: 'string' },
          kind: { type: 'string' },
          line: { type: 'integer', minimum: 1 },
        },
      },
    },
    blocked: { type: 'boolean' },
    summary: { type: 'string' },
  },
};

// ---------------------------------------------------------------------------
// args — set by the caller (team-lead agent). Shape:
//   {
//     request:     string,   // user's natural-language ask
//     plugin_root: string,   // absolute path to super-dev-plugin install
//     repo_path:   string,   // absolute path to the target project repo
//   }
// All other behavior (feature_kind, language, ui_scope) is auto-detected.
// ---------------------------------------------------------------------------

// Phase MUST be declared before any agent() call — the runtime requires it.
phase('Stage 1 — Setup');

// ---------------------------------------------------------------------------
// Retry wrapper — MUST be defined before any usage (const doesn't hoist).
// Retries agent() calls up to MAX_RETRIES on null returns.
// ---------------------------------------------------------------------------
const MAX_RETRIES = 10;
const agentWithRetry = async (prompt, opts) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const effectivePrompt = attempt === 1
      ? prompt
      : `${prompt}\n\n[RETRY ${attempt}/${MAX_RETRIES}: Prior attempt(s) returned no result ` +
        `(likely API timeout or rate limit). Simplify if possible. Attempt ${attempt}.]`;
    const result = await agent(effectivePrompt, opts);
    if (result !== null && result !== undefined) return result;
    if (attempt < MAX_RETRIES) {
      log(`[retry] ${opts?.label || 'agent'} returned null — attempt ${attempt}/${MAX_RETRIES}, retrying with backoff context...`);
    }
  }
  log(`[retry] ${opts?.label || 'agent'} exhausted ${MAX_RETRIES} retries — returning null`);
  return null;
};

// ---------------------------------------------------------------------------
// Args normalization — the workflow MUST work even when args is undefined,
// a string, or missing keys. When invoked by name (not scriptPath), agent()
// calls may return null instantly. Parse flags inline without agents.
// ---------------------------------------------------------------------------
let _args = args;
log(`[super-dev] args received: type=${typeof args}`);
if (typeof _args === 'string') {
  _args = { request: _args };
}
if (!_args || typeof _args !== 'object') {
  _args = {};
}

let REQUEST     = _args.request ?? '';
let PLUGIN_ROOT = _args.plugin_root ?? '';
let REPO_PATH   = _args.repo_path ?? '';
const MAX_SPEC_ITERS = 3;
const MAX_REQ_ITERS = 3;
const MAX_BDD_ITERS = 3;
const MAX_PROTOTYPE_ITERS = 3;
const MAX_SPEC_TRACE_ITERS = 3;
const MAX_PHASE_ITERS = 3;
const MAX_REVIEW_ITERS = 3;

// Parse --skip-worktree from args key OR from request text (fallback if team-lead
// embeds the flag in the request string instead of extracting it).
const SKIP_WORKTREE = Boolean(
  _args.skip_worktree ?? /--skip-worktree/i.test(REQUEST)
);
// Strip the flag from request text so downstream stages don't see it
if (/--skip-worktree/i.test(REQUEST)) {
  REQUEST = REQUEST.replace(/--skip-worktree/gi, '').trim();
}

// Auto-detect feature_kind from request text
const FEATURE_KIND = /\b(bug|fix|broken|crash|error|panic|fail|regression)\b/i.test(REQUEST) ? 'bug'
  : /\b(refactor|restructure|improve|cleanup|clean up)\b/i.test(REQUEST) ? 'refactor'
  : 'feature';
// These are always auto-discovered by the workflow stages themselves
const BUG_EVIDENCE = '';
const INPUT_SAMPLES = [];
const UI_SCOPE = 'none';
// IS_WEB_UI and LANGUAGE are auto-detected after REPO_PATH is resolved
let IS_WEB_UI = false;
let LANGUAGE = 'mixed';

// Auto-discover missing paths via agent. If agents return null (0s invocation
// by name), fall back to ${PLUGIN_ROOT} harness variable.
if (!PLUGIN_ROOT || !REPO_PATH) {
  log(`[super-dev] Auto-discovering paths...`);
  const discovery = await agentWithRetry(
    `Run these two commands and return the results as JSON:\n` +
    `1. Find the super-dev plugin root:\n` +
    `   bash -c "find ~/.claude/plugins -name 'super-dev.workflow.js' -path '*/workflows/*' 2>/dev/null | head -1 | xargs dirname | xargs dirname"\n` +
    `2. Get current working directory:\n` +
    `   pwd\n\n` +
    `Return JSON: {"plugin_root": "<result of command 1>", "repo_path": "<result of command 2>"}`,
    {
      label: 'discover-paths',
      phase: 'Stage 1 — Setup',
      agentType: 'general-purpose',
      schema: {
        type: 'object',
        required: ['plugin_root', 'repo_path'],
        properties: { plugin_root: { type: 'string' }, repo_path: { type: 'string' } },
      },
    },
  );
  if (discovery) {
    if (!PLUGIN_ROOT) PLUGIN_ROOT = discovery.plugin_root;
    if (!REPO_PATH) REPO_PATH = discovery.repo_path;
  }
  log(`[super-dev] After discovery: plugin_root=${PLUGIN_ROOT}, repo_path=${REPO_PATH}`);
}

// If request is still empty, use a generic placeholder — the requirements stage
// will ask the user for details anyway.
if (!REQUEST) {
  REQUEST = _args.request || 'Implement the requested changes (see conversation context)';
  log(`[super-dev] No explicit request in args — using placeholder. The requirements stage will clarify.`);
}

if (!PLUGIN_ROOT || !REPO_PATH) {
  // Last resort: if auto-discovery agent also failed, try hardcoded common paths
  if (!PLUGIN_ROOT) {
    PLUGIN_ROOT = '/home/' + (REPO_PATH.split('/')[2] || 'user') + '/.claude/plugins/marketplaces/super-dev';
    log(`[super-dev] WARNING: plugin_root discovery failed — using best-guess: ${PLUGIN_ROOT}`);
  }
  if (!REPO_PATH) {
    // Cannot proceed without knowing where the repo is
    throw new Error(
      `super-dev workflow: could not determine repo_path (current working directory).\n` +
      `The auto-discovery agent failed to run. Ensure the workflow is invoked with:\n` +
      `  Workflow({scriptPath: "...", args: {request: "...", plugin_root: "...", repo_path: "..."}})`
    );
  }
}

// Auto-detect language and IS_WEB_UI from project structure
if (REPO_PATH) {
  const detect = await agentWithRetry(
    `In the directory ${shellQuote(REPO_PATH)}, check which files exist and return JSON:\n` +
    `- has_cargo_toml: does Cargo.toml exist?\n` +
    `- has_go_mod: does go.mod exist?\n` +
    `- has_package_json: does package.json exist?\n` +
    `- has_ui_framework: does package.json contain "react", "next", "vue", "svelte", "angular", or "nuxt"?\n` +
    `Return JSON: {"has_cargo_toml": bool, "has_go_mod": bool, "has_package_json": bool, "has_ui_framework": bool}`,
    {
      label: 'detect-project-type',
      phase: 'Stage 1 — Setup',
      agentType: 'general-purpose',
      schema: {
        type: 'object',
        required: ['has_cargo_toml', 'has_go_mod', 'has_package_json', 'has_ui_framework'],
        properties: {
          has_cargo_toml: { type: 'boolean' },
          has_go_mod: { type: 'boolean' },
          has_package_json: { type: 'boolean' },
          has_ui_framework: { type: 'boolean' },
        },
      },
    },
  );
  if (detect) {
    if (detect.has_cargo_toml) LANGUAGE = 'rust';
    else if (detect.has_go_mod) LANGUAGE = 'go';
    else if (detect.has_ui_framework) LANGUAGE = 'frontend';
    else if (detect.has_package_json) LANGUAGE = 'backend';
    IS_WEB_UI = detect.has_ui_framework;
  }
  log(`[super-dev] Auto-detected: language=${LANGUAGE}, is_web_ui=${IS_WEB_UI}`);
}

// ---------------------------------------------------------------------------
// Stage 1 — Setup (continued — phase already declared above for auto-discovery)
// ---------------------------------------------------------------------------

// Step 1.1 — Preflight env gate (must run BEFORE any other shell call).
log('Stage 1.1 preflight: verifying CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 and Claude Code >= v2.1.178');
const preflight = await agentWithRetry(
  `Run this command and report:\n` +
  `  - the exit code\n` +
  `  - the LAST line of stdout/stderr (the 'preflight: ok ...' line on success, or the\n` +
  `    final error line on failure)\n` +
  `  - the plugin_version (extracted from the success line: the value after 'plugin ').\n` +
  `    On failure, set plugin_version to 'unknown'.\n\n` +
  `  bash ${shellQuote(PLUGIN_ROOT + '/scripts/preflight-env.sh')}\n\n` +
  `Return JSON: {"exit_code": int, "tail": string, "plugin_version": string}. Do not retry on failure.`,
  {
    label: 'preflight',
    phase: 'Stage 1 — Setup',
    agentType: 'general-purpose',
    schema: {
      type: 'object',
      required: ['exit_code', 'tail', 'plugin_version'],
      additionalProperties: false,
      properties: {
        exit_code:      { type: 'integer' },
        tail:           { type: 'string' },
        plugin_version: { type: 'string' },
      },
    },
  },
);
if (preflight.exit_code !== 0) {
  throw new Error(
    `super-dev preflight failed (exit ${preflight.exit_code}): ${preflight.tail}\n` +
    `Resolve the environment issue, then re-run.`
  );
}
// Surface the plugin version up front so cache staleness is obvious: a run
// that logs an older version than origin/main means the user needs to
// refresh the plugin cache (~/.claude/plugins/cache/super-dev/super-dev/).
log(`super-dev plugin v${preflight.plugin_version} — preflight OK (${preflight.tail.trim()})`);

// Step 1.2 — Pull latest. Detect default branch first; never hard-code 'main'.
// When SKIP_WORKTREE=true, skip entirely — user is already on their feature branch.
const RAW_SHELL_SCHEMA = {
  type: 'object',
  required: ['exit_code', 'stdout', 'stderr'],
  additionalProperties: false,
  properties: {
    exit_code: { type: 'integer' },
    stdout:    { type: 'string' },
    stderr:    { type: 'string' },
  },
};

let DEFAULT_BRANCH = '';
if (SKIP_WORKTREE) {
  log('Stage 1.2 SKIPPED (skip_worktree=true — staying on current branch)');
} else {
  const defaultBranchResult = await agentWithRetry(
    `Run this shell snippet in a single Bash call and report the result. ` +
    `Do NOT interpret success — report exactly what bash returns, even on non-zero exit:\n\n` +
    detectDefaultBranchSnippet(REPO_PATH) +
    `\nReturn JSON: {"exit_code": int, "stdout": string (trimmed), "stderr": string (verbatim)}.`,
    {
      label: 'detect-default-branch',
      phase: 'Stage 1 — Setup',
      agentType: 'general-purpose',
      schema: RAW_SHELL_SCHEMA,
    },
  );
  if (defaultBranchResult.exit_code !== 0) {
    throw new Error(
      `Stage 1: cannot detect default branch (exit ${defaultBranchResult.exit_code}).\n` +
      `stdout: ${defaultBranchResult.stdout || '(empty)'}\n` +
      `stderr: ${defaultBranchResult.stderr || '(empty)'}`
    );
  }
  DEFAULT_BRANCH = defaultBranchResult.stdout.trim();
  if (!DEFAULT_BRANCH) {
    throw new Error(
      `Stage 1: default-branch detection returned exit 0 but empty stdout.\n` +
      `stderr: ${defaultBranchResult.stderr || '(empty)'}`
    );
  }
  log(`Default branch resolved to: ${DEFAULT_BRANCH}`);

  log('Stage 1.2 pull-latest: fetching origin and fast-forwarding default branch');
  const pullResult = await agentWithRetry(
    `Run this shell snippet in a single Bash call and report the result. ` +
    `Do NOT auto-rebase, force-pull, or stash. Do NOT interpret success — report ` +
    `exactly what bash returns, even on non-zero exit:\n\n` +
    pullLatestSnippet(REPO_PATH, DEFAULT_BRANCH) +
    `\nReturn JSON: {"exit_code": int, "stdout": string (verbatim), "stderr": string (verbatim)}.`,
    {
      label: 'pull-latest',
      phase: 'Stage 1 — Setup',
      agentType: 'general-purpose',
      schema: RAW_SHELL_SCHEMA,
    },
  );
  if (pullResult.exit_code !== 0) {
    throw new Error(
      `Stage 1: 'git pull --ff-only' failed on ${DEFAULT_BRANCH} (exit ${pullResult.exit_code}). ` +
      `Resolve manually (divergence / dirty tree / detached HEAD) and retry.\n` +
      `stdout:\n${pullResult.stdout || '(empty)'}\n` +
      `stderr:\n${pullResult.stderr || '(empty)'}`
    );
  }
}

// Step 1.3 — Spec index, name, identifier.
log('Stage 1.3 spec naming');
const specMeta = await agentWithRetry(
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
// When SKIP_WORKTREE=true, use REPO_PATH directly (user is on their feature branch).
let WORKTREE_PATH;
if (SKIP_WORKTREE) {
  log('Stage 1.4 worktree SKIPPED (skip_worktree=true — using repo path directly)');
  WORKTREE_PATH = REPO_PATH;
} else {
  log('Stage 1.4 worktree');
  const worktreeResult = await agentWithRetry(
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
  WORKTREE_PATH = worktreeResult.worktree_path;
}
const SPEC_DIRECTORY = `${WORKTREE_PATH}/specification/${specMeta.spec_identifier}`;

// ---------------------------------------------------------------------------
// Bootstrap recipes — defined here so Step 1.6 (worktree bootstrap) and the
// Stage 9 qa/e2e prompts share the same idempotent bash. Two recipes:
//
//   ENV_COPY_RECIPE      — recursive copy of every .env / .env.* file from
//                          the main repo to the matching relative path
//                          under the worktree. Skips *.example/*.template
//                          and prunes vendored/build directories.
//
//   INSTALL_DEPS_RECIPE  — walks the worktree, detects every package
//                          manifest (package.json, Cargo.toml, go.mod,
//                          pyproject.toml, requirements.txt, Pipfile,
//                          Gemfile, composer.json, mix.exs), and runs the
//                          appropriate install command per manifest in
//                          dependency-graph order (lockfile-aware for
//                          Node). Idempotent — no-ops when nothing changed.
//
// Both recipes echo `installed`/`copied` lines so the run journal records
// what happened.
// ---------------------------------------------------------------------------
const ENV_COPY_RECIPE =
  `set -u\n` +
  `src=${shellQuote(REPO_PATH)}\n` +
  `dst=${shellQuote(WORKTREE_PATH)}\n` +
  `# Build a find expression that prunes vendored / build dirs and matches\n` +
  `# any .env* file that is NOT a committed example/template.\n` +
  `find "$src" \\\n` +
  `  \\( -name .git -o -name node_modules -o -name target -o -name dist \\\n` +
  `     -o -name build -o -name .next -o -name .nuxt -o -name vendor \\\n` +
  `     -o -name .venv -o -name venv -o -name __pycache__ \\) -prune -o \\\n` +
  `  -type f \\( -name '.env' -o -name '.env.*' \\) ! -name '*.example' \\\n` +
  `    ! -name '*.template' -print \\\n` +
  `| while IFS= read -r abs; do\n` +
  `  rel=\${abs#$src/}\n` +
  `  mkdir -p "$(dirname "$dst/$rel")"\n` +
  `  cp -p "$abs" "$dst/$rel"\n` +
  `  echo "copied $rel bytes=$(wc -c <"$dst/$rel" | tr -d ' ')"\n` +
  `done\n`;

// Install-deps recipe. Walks worktree top-level + workspace members for
// every supported manifest and runs the matching install. Lockfile-aware
// for Node (pnpm-lock.yaml -> pnpm; yarn.lock -> yarn; package-lock.json
// -> npm ci). The order is: backend first (Cargo/Go/Python/Ruby/PHP/
// Elixir) then frontend (Node), so backend services that frontends consume
// at build time are ready first.
const INSTALL_DEPS_RECIPE =
  `set -u\n` +
  `cd ${shellQuote(WORKTREE_PATH)}\n` +
  `# Skip these dirs everywhere — they never carry source-of-truth manifests.\n` +
  `PRUNE=' ( -name .git -o -name node_modules -o -name target -o -name dist \\\n` +
  `          -o -name build -o -name .next -o -name .nuxt -o -name vendor \\\n` +
  `          -o -name .venv -o -name venv -o -name __pycache__ ) -prune '\n` +
  `run() { echo "+ $*" >&2; "$@"; }\n` +
  `\n` +
  `# Pass 1 — backend manifests, processed first.\n` +
  `find . $PRUNE -o -type f \\( -name Cargo.toml -o -name go.mod -o -name pyproject.toml \\\n` +
  `   -o -name Pipfile -o -name requirements.txt -o -name Gemfile \\\n` +
  `   -o -name composer.json -o -name mix.exs \\) -print \\\n` +
  `| while IFS= read -r manifest; do\n` +
  `  dir=$(dirname "$manifest"); name=$(basename "$manifest")\n` +
  `  ( cd "$dir" || exit 0\n` +
  `    case "$name" in\n` +
  `      Cargo.toml)        echo "installed Cargo.toml in $dir (cargo fetches on first build)";;\n` +
  `      go.mod)            run go mod download && echo "installed go.mod in $dir";;\n` +
  `      pyproject.toml)\n` +
  `        if [ -f poetry.lock ]; then run poetry install --no-interaction && echo "installed pyproject.toml (poetry) in $dir"\n` +
  `        elif command -v pdm >/dev/null && [ -f pdm.lock ]; then run pdm install && echo "installed pyproject.toml (pdm) in $dir"\n` +
  `        else echo "skipped pyproject.toml in $dir (no poetry.lock/pdm.lock)"; fi ;;\n` +
  `      Pipfile)           run pipenv install --deploy && echo "installed Pipfile in $dir";;\n` +
  `      requirements.txt)  run pip install -r requirements.txt && echo "installed requirements.txt in $dir";;\n` +
  `      Gemfile)           run bundle install && echo "installed Gemfile in $dir";;\n` +
  `      composer.json)     run composer install --no-interaction && echo "installed composer.json in $dir";;\n` +
  `      mix.exs)           run mix deps.get && echo "installed mix.exs in $dir";;\n` +
  `    esac ) || echo "ERROR installing $manifest" >&2\n` +
  `done\n` +
  `\n` +
  `# Pass 2 — Node manifests. Workspace roots install once for the whole tree,\n` +
  `# so detect by lockfile location (workspace root has the lockfile) rather\n` +
  `# than installing per workspace member.\n` +
  `find . $PRUNE -o -type f -name package.json -print \\\n` +
  `| while IFS= read -r manifest; do\n` +
  `  dir=$(dirname "$manifest")\n` +
  `  ( cd "$dir" || exit 0\n` +
  `    # Only install at the LOCKFILE directory (workspace root or single project).\n` +
  `    if   [ -f pnpm-lock.yaml ];    then run pnpm install --frozen-lockfile && echo "installed package.json (pnpm) in $dir"\n` +
  `    elif [ -f yarn.lock ];         then run yarn install --frozen-lockfile && echo "installed package.json (yarn) in $dir"\n` +
  `    elif [ -f package-lock.json ]; then run npm ci && echo "installed package.json (npm ci) in $dir"\n` +
  `    else\n` +
  `      # No lockfile here — check if a parent directory has one (we're a workspace member).\n` +
  `      up="$dir"; found=""\n` +
  `      while [ "$up" != "." ] && [ "$up" != "/" ]; do\n` +
  `        up=$(dirname "$up")\n` +
  `        if [ -f "$up/pnpm-lock.yaml" ] || [ -f "$up/yarn.lock" ] || [ -f "$up/package-lock.json" ]; then\n` +
  `          found="$up"; break\n` +
  `        fi\n` +
  `      done\n` +
  `      if [ -n "$found" ]; then echo "skipped package.json in $dir (workspace member of $found)"\n` +
  `      else run npm install && echo "installed package.json (npm install, no lockfile) in $dir"; fi\n` +
  `    fi ) || echo "ERROR installing $manifest" >&2\n` +
  `done\n`;

// Step 1.5 — Spec directory + tracking JSON.
log('Stage 1.5 spec dir + tracking JSON');
await agentWithRetry(
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

// Step 1.6 — Worktree bootstrap. Copy .env files and install deps.
// Skip when SKIP_WORKTREE=true — the user's repo already has deps installed.
if (SKIP_WORKTREE) {
  log('Stage 1.6 worktree bootstrap SKIPPED (skip_worktree=true — repo already set up)');
} else {
  // The worktree needs env files copied from the main repo and deps installed.
  // Without this step the downstream gates fail in non-obvious ways: e.g.
  // gate-build.sh's `pnpm run build` fails with `next: command not found`
  // because the worktree has no node_modules even though the main repo does.
  // Polyglot monorepos with workspace package managers are especially fragile
  // here — qa-agent installs JS deps when the phase is JS-heavy, but a Go-
  // only phase skips the JS install and gate-build still tries to build the
  // frontend. Doing this once at Stage 1 means every downstream stage finds
  // a usable workspace.
  //
  // Both recipes are idempotent. If you resume a workflow, the bootstrap
  // re-runs but no-ops on already-installed deps and re-copies env files
  // (cheap, deterministic).
  log('Stage 1.6 worktree bootstrap: copy .env files + install dependencies');
  const bootstrapResult = await agentWithRetry(
    `Run the following two recipes in sequence. After each, report the captured ` +
    `stdout lines verbatim — those tell the user what was copied/installed.\n\n` +
    `--- Recipe 1: copy .env files ---\n` +
    `\`\`\`bash\n${ENV_COPY_RECIPE}\`\`\`\n` +
    `--- Recipe 2: install dependencies ---\n` +
    `\`\`\`bash\n${INSTALL_DEPS_RECIPE}\`\`\`\n` +
    `Return JSON: {"env_files_copied": int, "manifests_installed": int, ` +
    `"install_errors": [string], "summary": string}. Count "copied <rel>" lines ` +
    `for env_files_copied. Count "installed <manifest> in <dir>" lines for ` +
    `manifests_installed (NOT "skipped" lines). Collect any "ERROR installing" ` +
    `lines into install_errors verbatim. Do not retry on failure — surface the ` +
    `errors so the user sees them.`,
    {
      label: 'worktree-bootstrap',
      phase: 'Stage 1 — Setup',
      agentType: 'general-purpose',
      schema: {
        type: 'object',
        required: ['env_files_copied', 'manifests_installed', 'install_errors', 'summary'],
        additionalProperties: false,
        properties: {
          env_files_copied:    { type: 'integer', minimum: 0 },
          manifests_installed: { type: 'integer', minimum: 0 },
          install_errors:      { type: 'array', items: { type: 'string' } },
          summary:             { type: 'string' },
        },
      },
    },
  );
  if (bootstrapResult.install_errors.length > 0) {
    log(`Stage 1.6 had ${bootstrapResult.install_errors.length} install error(s):`);
    for (const err of bootstrapResult.install_errors) log(`  - ${err}`);
    log(`  Downstream gates (gate-build, qa, e2e) may still fail. Continuing.`);
  }
  log(`Stage 1.6 complete: ${bootstrapResult.env_files_copied} env file(s) copied, ` +
      `${bootstrapResult.manifests_installed} manifest(s) installed.`);
}

log(`Stage 1 complete. Worktree: ${WORKTREE_PATH}`);
log(`Spec dir: ${SPEC_DIRECTORY}`);

// ---------------------------------------------------------------------------
// Tracking JSON path — computed once; used by updateTracking() calls below.
// ---------------------------------------------------------------------------
const TRACKING_JSON_PATH = `${SPEC_DIRECTORY}/${specMeta.spec_identifier}-workflow-tracking.json`;

// ---------------------------------------------------------------------------
// updateTracking() — updates the workflow tracking JSON at stage/phase
// boundaries. Delegates to a tiny general-purpose agent because the Workflow
// runtime has no fs access. Each call is cheap (~2-3s) and ensures the
// tracking JSON always reflects the actual workflow state for gate-
// implementation-complete and any post-mortem analysis.
//
// Usage:
//   await updateTracking({ stage: N, status: 'in_progress' })
//   await updateTracking({ stage: N, status: 'complete', docs: [...], files: {created, modified, deleted} })
//   await updateTracking({ implPhase: { number: N, name: '...', status: 'in_progress' } })
//   await updateTracking({ implPhase: { number: N, name: '...', status: 'complete', files: {...} } })
// ---------------------------------------------------------------------------
async function updateTracking(opts) {
  const parts = [];
  if (opts.stage != null) {
    parts.push(
      `In the "stages" array, find the entry with id=${opts.stage}. ` +
      `Set status="${opts.status}".` +
      (opts.status === 'in_progress' ? ` Set startedAt to current ISO 8601 timestamp (seconds precision).` : '') +
      (opts.status === 'complete' ? ` Set completedAt to current ISO 8601 timestamp (seconds precision).` : '') +
      (opts.status === 'skipped' ? ` Set completedAt to current ISO 8601 timestamp (seconds precision).` : '') +
      (opts.docs ? ` Set docs to ${JSON.stringify(opts.docs)}.` : '') +
      (opts.files ? ` Set files to ${JSON.stringify(opts.files)}.` : '')
    );
  }
  if (opts.implPhase) {
    const p = opts.implPhase;
    if (p.status === 'in_progress') {
      parts.push(
        `In the "implementationPhases" array, append (or update if phaseNumber=${p.number} exists) ` +
        `an entry: {"phaseNumber": ${p.number}, "name": ${JSON.stringify(p.name)}, ` +
        `"status": "in_progress", "startedAt": "<current ISO 8601>", "completedAt": null, ` +
        `"reviewIterations": 0}. ` +
        `Also set "iteration.currentPhase" = ${p.number}, ` +
        `"iteration.totalPhases" = ${p.totalPhases ?? p.number}, ` +
        `"iteration.loops" = 0, "iteration.lastReviewVerdict" = null.`
      );
    } else if (p.status === 'complete') {
      parts.push(
        `In the "implementationPhases" array, find the entry with phaseNumber=${p.number}. ` +
        `Set status="complete", completedAt to current ISO 8601 timestamp (seconds precision), ` +
        `reviewIterations=${p.reviewIterations ?? 1}.` +
        (p.files ? ` Set files to ${JSON.stringify(p.files)}.` : '')
      );
    }
  }
  if (parts.length === 0) return;
  await agentWithRetry(
    `Read ${shellQuote(TRACKING_JSON_PATH)}, apply these updates, then write it back:\n` +
    parts.map((p, i) => `  ${i + 1}. ${p}`).join('\n') +
    `\nReturn JSON: {"ok": true}.`,
    {
      label: `tracking:${opts.stage != null ? 's' + opts.stage + ':' + (opts.status || '') : 'p' + opts.implPhase.number + ':' + opts.implPhase.status}`,
      phase: opts.currentPhase || 'Stage 1 — Setup',
      agentType: 'general-purpose',
      schema: { type: 'object', required: ['ok'], properties: { ok: { type: 'boolean' } } },
    },
  );
}

// ---------------------------------------------------------------------------
// fileFingerprint() — DEPRECATED/REMOVED.
//
// The original design attempted to bust the resume cache by reading file
// md5 hashes and injecting them into gate prompts. This DOES NOT WORK
// because the fingerprint agent() call itself gets cached on resume (the
// prompt is byte-identical: same path, same nonce sequence). The research
// confirms: cache key = hash(prompt, opts) with prefix chaining; there is
// no per-call noCache option; and the only way to bust cache is to change
// the prompt string.
//
// The correct behavior on resume: if a gate threw (Stage 10 gate FAIL),
// the throw happened AFTER the parallel() that spawned the gates returned.
// That means the parallel() result (including FAIL) IS cached. On resume,
// the cached FAIL replays and the throw fires again.
//
// RESOLUTION: After manually fixing a file that caused a gate failure,
// users should re-invoke the workflow WITHOUT resumeFromRunId (fresh run).
// The early stages (1-8) re-run cheaply (doc-producing, fast). Stage 9
// implementation phases already committed their code to git — a fresh run
// on the same branch detects the existing commits and gate-build passes.
//
// If partial resume is needed (to save Stage 9 time), edit the workflow
// script trivially (add a comment) before resuming — per the research,
// any script change invalidates the entire resume cache.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Stable prompt prefix — front-loaded so downstream agent() prompts benefit
// from the Workflow runtime's prompt caching (prefix matching). Varying
// context (iteration guidance, gate errors) goes AFTER this block.
// ---------------------------------------------------------------------------
const STABLE_PREFIX =
  `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n`;

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

// Mark Stage 1 complete, Stage 2 starting in tracking JSON.
await updateTracking({ stage: 1, status: 'complete', currentPhase: 'Stage 1 — Setup' });

// ---------------------------------------------------------------------------
// Stage 2 — Requirements + BDD
//   Two sequential writer+validator pairs, each pair runs in parallel.
// ---------------------------------------------------------------------------
phase('Stage 2 — Requirements + BDD');
await updateTracking({ stage: 2, status: 'in_progress', currentPhase: 'Stage 2 — Requirements + BDD' });

// 2A — Requirements + gate-requirements (with format-fix loop)
const requirementsName = docName('requirements.md');
const reqLoop = await gatedStage2WriterLoop({
  stage: 'Stage 2A',
  gateName: 'gate-requirements',
  writerLabel: 'requirements-clarifier',
  maxIters: MAX_REQ_ITERS,
  spawnWriter: (iter, guidance) => agentWithRetry(
    `User request: ${JSON.stringify(REQUEST)}\n\n` +
    `Write the requirements document to ${shellQuote(SPEC_DIRECTORY + '/' + requirementsName)}. ` +
    `Capture acceptance criteria, scope, non-goals, constraints, and open questions. ` +
    `Worktree: ${WORKTREE_PATH}. Plugin root: ${PLUGIN_ROOT}.` + guidance,
    {
      label: `requirements-clarifier:${iter}`,
      phase: 'Stage 2 — Requirements + BDD',
      agentType: 'super-dev:requirements-clarifier',
      schema: REQUIREMENTS_OUTPUT,
    },
  ),
  spawnGate: () => agentWithRetry(
    `Wait for ${shellQuote(SPEC_DIRECTORY + '/' + requirementsName)} to appear, then run ` +
    `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-requirements.sh')} ${shellQuote(SPEC_DIRECTORY + '/' + requirementsName)}. ` +
    `Return the gate verdict.`,
    {
      label: 'doc-validator:gate-requirements',
      phase: 'Stage 2 — Requirements + BDD',
      agentType: 'super-dev:doc-validator',
      schema: GATE_VERDICT,
    },
  ),
});
const req = reqLoop.writer;
log(`Requirements: ${req.ac_count} ACs captured (${reqLoop.iterations} iteration${reqLoop.iterations === 1 ? '' : 's'}).`);

// 2B — BDD scenarios + gate-bdd (with format-fix loop)
const bddName = docName('bdd-scenarios.md');
const bddLoop = await gatedStage2WriterLoop({
  stage: 'Stage 2B',
  gateName: 'gate-bdd',
  writerLabel: 'bdd-scenario-writer',
  maxIters: MAX_BDD_ITERS,
  spawnWriter: (iter, guidance) => agentWithRetry(
    `Read ${shellQuote(req.doc_path)} from the spec directory. Produce BDD Given/When/Then scenarios at ` +
    `${shellQuote(SPEC_DIRECTORY + '/' + bddName)} covering every acceptance criterion. ` +
    `Feature name: ${req.feature_name}. Worktree: ${WORKTREE_PATH}.` + guidance,
    {
      label: `bdd-scenario-writer:${iter}`,
      phase: 'Stage 2 — Requirements + BDD',
      agentType: 'super-dev:bdd-scenario-writer',
      schema: BDD_OUTPUT,
    },
  ),
  spawnGate: () => agentWithRetry(
    `Wait for ${shellQuote(SPEC_DIRECTORY + '/' + bddName)} to appear, then run ` +
    `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-bdd.sh')} ${shellQuote(SPEC_DIRECTORY + '/' + bddName)}. ` +
    `Return the gate verdict.`,
    {
      label: 'doc-validator:gate-bdd',
      phase: 'Stage 2 — Requirements + BDD',
      agentType: 'super-dev:doc-validator',
      schema: GATE_VERDICT,
    },
  ),
});
const bdd = bddLoop.writer;
log(`BDD: ${bdd.scenario_count} scenarios (coverage ${Math.round((bdd.coverage_score ?? 0) * 100)}%, ${bddLoop.iterations} iteration${bddLoop.iterations === 1 ? '' : 's'}).`);
await updateTracking({ stage: 2, status: 'complete', docs: [requirementsName, bddName], currentPhase: 'Stage 2 — Requirements + BDD' });

// ---------------------------------------------------------------------------
// Stage 3 — Research
//   Initial pass, then up to 2 deep-research iterations if open_issues
//   surface. Capped at 3 total iterations (the project rule).
// ---------------------------------------------------------------------------
phase('Stage 3 — Research');
await updateTracking({ stage: 3, status: 'in_progress', currentPhase: 'Stage 3 — Research' });

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

  const report = await agentWithRetry(
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
      agentType: 'super-dev:research-agent',
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
await updateTracking({ stage: 3, status: 'complete', currentPhase: 'Stage 3 — Research' });

// ---------------------------------------------------------------------------
// Stages 4 + 5 — Debug Analysis (bugs only) + Code Assessment
//   These two stages both depend on Stage 3 (research) but NOT on each other.
//   For bug-type tasks, both run in parallel to save wall-clock time.
//   For non-bug tasks, Stage 4 is skipped and Stage 5 runs alone.
//
//   Stage 4: Multi-hypothesis parallel debug investigation.
//   Stage 5: First code-reading stage — patterns/idioms discovery.
// ---------------------------------------------------------------------------
phase('Stage 4 — Debug Analysis');

let debugResult = null;
const isBug = FEATURE_KIND === 'bug' || (FEATURE_KIND === 'auto' && /\b(bug|broken|crash|fail|regression|error|panic)\b/i.test(REQUEST));

// Pre-allocate doc names before parallel execution to maintain sequential numbering
const debugName = isBug ? docName('debug-analysis.md') : null;
const assessmentName = docName('code-assessment.md');
let assessment = null;

if (isBug) {
  // Run Stage 4 (debug) and Stage 5 (assessment) in parallel — no mutual dependency
  log('Stages 4+5: running debug analysis + code assessment in parallel (bug-type task)');
  await updateTracking({ stage: 4, status: 'in_progress', currentPhase: 'Stage 4 — Debug Analysis' });
  await updateTracking({ stage: 5, status: 'in_progress', currentPhase: 'Stage 5 — Code Assessment' });

  const [debugOut, assessmentOut] = await parallel([
    () => {
      // Stage 4 — Debug triage
      return agentWithRetry(
        `${STABLE_PREFIX}` +
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
          agentType: 'super-dev:debug-analyzer',
          schema: DEBUG_OUTPUT,
        },
      );
    },
    () => {
      // Stage 5 — Code Assessment
      return agentWithRetry(
        `${STABLE_PREFIX}` +
        `Inputs to read yourself: ${req.doc_path}, ${bdd.doc_path}, ${researchReports[researchReports.length - 1].doc_path}.\n\n` +
        `This is the FIRST code-reading stage. Inspect the codebase rooted at ${WORKTREE_PATH} ` +
        `and identify the patterns/idioms the new code MUST follow. Cite files and line numbers. ` +
        `Produce ${shellQuote(SPEC_DIRECTORY + '/' + assessmentName)}.`,
        {
          label: 'code-assessor',
          phase: 'Stage 5 — Code Assessment',
          agentType: 'super-dev:code-assessor',
          schema: ASSESSMENT_OUTPUT,
        },
      );
    },
  ]);

  // Process Stage 4 result — multi-hypothesis parallel investigation if needed
  const triage = debugOut;
  if (triage) {
    const top = [...triage.hypotheses].sort((a, b) => b.confidence - a.confidence);
    const leader = top[0]?.confidence ?? 0;
    const tied = top.filter(h => h.confidence >= Math.max(leader - 0.1, 0.4)).slice(0, 3);

    if (tied.length >= 2 && leader < 0.6) {
      log(`Stage 4: ${tied.length} tied hypotheses (leader ${leader.toFixed(2)} < 0.6) — fanning out parallel investigators`);
      const investigations = await parallel(
        tied.map((h, idx) => () => agentWithRetry(
          `${STABLE_PREFIX}` +
          `Investigate ONLY this hypothesis from ${triage.doc_path}:\n  ${h.statement}\n\n` +
          `Build a minimal reproduction, instrument the code, and confirm OR refute. ` +
          `Append your findings to ${shellQuote(SPEC_DIRECTORY + '/' + debugName)} ` +
          `under a new section "Hypothesis ${idx + 1}: ${h.statement.slice(0, 80)}". ` +
          `Return a fresh DebugOutput reflecting ALL hypotheses with this one updated.`,
          {
            label: `debug-investigate:${idx + 1}`,
            phase: 'Stage 4 — Debug Analysis',
            agentType: 'super-dev:debug-analyzer',
            schema: DEBUG_OUTPUT,
          },
        )),
      );
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
    await updateTracking({ stage: 4, status: 'complete', currentPhase: 'Stage 4 — Debug Analysis' });
  } else {
    log(`Stage 4: debug-analyzer returned null — skipping`);
    await updateTracking({ stage: 4, status: 'skipped', currentPhase: 'Stage 4 — Debug Analysis' });
  }

  // Stage 5 result
  assessment = assessmentOut;
  if (assessment) {
    log(`Stage 5 complete: ${assessment.files_assessed} files assessed, ${assessment.patterns.length} patterns to follow.`);
  } else {
    throw new Error('Stage 5: code-assessor returned null after retries — cannot proceed without codebase assessment.');
  }
  await updateTracking({ stage: 5, status: 'complete', currentPhase: 'Stage 5 — Code Assessment' });

} else {
  // Non-bug: skip Stage 4, run Stage 5 alone
  log(`Stage 4 skipped (feature_kind=${FEATURE_KIND}, no bug signals in request).`);
  await updateTracking({ stage: 4, status: 'skipped', currentPhase: 'Stage 4 — Debug Analysis' });

  phase('Stage 5 — Code Assessment');
  await updateTracking({ stage: 5, status: 'in_progress', currentPhase: 'Stage 5 — Code Assessment' });

  log('Stage 5: code-assessor — first codebase exploration');
  assessment = await agentWithRetry(
    `${STABLE_PREFIX}` +
    `Inputs to read yourself: ${req.doc_path}, ${bdd.doc_path}, ${researchReports[researchReports.length - 1].doc_path}.\n\n` +
    `This is the FIRST code-reading stage. Inspect the codebase rooted at ${WORKTREE_PATH} ` +
    `and identify the patterns/idioms the new code MUST follow. Cite files and line numbers. ` +
    `Produce ${shellQuote(SPEC_DIRECTORY + '/' + assessmentName)}.`,
    {
      label: 'code-assessor',
      phase: 'Stage 5 — Code Assessment',
      agentType: 'super-dev:code-assessor',
      schema: ASSESSMENT_OUTPUT,
    },
  );
  if (!assessment) {
    throw new Error('Stage 5: code-assessor returned null after retries — cannot proceed without codebase assessment.');
  }
  log(`Stage 5 complete: ${assessment.files_assessed} files assessed, ${assessment.patterns.length} patterns to follow.`);
  await updateTracking({ stage: 5, status: 'complete', currentPhase: 'Stage 5 — Code Assessment' });
}

// ---------------------------------------------------------------------------
// Stage 6 — Design (routed by feature_kind + ui_scope)
//   feature + 'none'    → architecture-designer
//   refactor + 'none'   → architecture-improver
//   any      + 'ui-only' → ui-ux-designer
//   any      + 'ui+arch' → product-designer (composite)
//   bug      + 'none'   → SKIP (design changes only on confirmed pivot)
// ---------------------------------------------------------------------------
phase('Stage 6 — Design');
await updateTracking({ stage: 6, status: 'in_progress', currentPhase: 'Stage 6 — Design' });

let design = null;
let designerType = null;
if (UI_SCOPE === 'ui+arch') {
  designerType = 'product-designer';
} else if (UI_SCOPE === 'ui-only') {
  designerType = 'ui-ux-designer';
} else if (FEATURE_KIND === 'bug') {
  log('Stage 6 skipped (bug fixes do not redesign — pivot-protocol owns design changes).');
  await updateTracking({ stage: 6, status: 'skipped', currentPhase: 'Stage 6 — Design' });
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

  design = await agentWithRetry(
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
      agentType: `super-dev:${designerType}`,
      schema: DESIGN_OUTPUT,
    },
  );
  log(`Stage 6 complete: ${design.docs.length} doc(s) written; numeric constants present: ${design.has_numeric_constants ?? false}`);
  await updateTracking({ stage: 6, status: 'complete', currentPhase: 'Stage 6 — Design' });
}

// ---------------------------------------------------------------------------
// Stage 6.5 — Prototype (CONDITIONAL)
//   Fires only when Stage 6 declared numeric design constants. Two sub-steps:
//
//     6.5.1 — sample-finder: resolves the input_samples list. If
//             args.input_samples is non-empty the user already chose;
//             respect their input verbatim. Otherwise spawn a
//             general-purpose agent that reads Stage 3 research, Stage 5
//             assessment, and Stage 6 design, walks the codebase under
//             $WORKTREE_PATH for fixtures / test data / sample inputs
//             matching the constants' domain, and returns 5-10
//             representative samples. The discovered list is logged so
//             the user sees what the workflow chose.
//
//     6.5.2 — prototype-runner: validates the design's numeric constants
//             against the resolved samples (via gatedPrototypeLoop, the
//             format-fix loop). PROTOTYPE_FAILED — the empirical verdict
//             that the constants themselves are wrong — short-circuits
//             the loop; the caller invokes pivot-protocol and re-runs
//             Stage 6 with corrected constants.
//
//   Last-resort fallback: if sample-finder also returns empty (genuinely
//   no representative inputs exist in the codebase), throw with the
//   original "provide args.input_samples" message so the user can supply
//   them and resume.
// ---------------------------------------------------------------------------
phase('Stage 6.5 — Prototype');

let prototype = null;
const needPrototype = design?.has_numeric_constants === true;
if (!needPrototype) {
  log(`Stage 6.5 skipped (no numeric design constants declared).`);
} else {
  // Step 6.5.1 — sample-finder. User-supplied samples win; auto-discover
  // only when args.input_samples is empty.
  let samples = INPUT_SAMPLES;
  let sampleSource = 'args.input_samples (user-supplied)';
  let sampleRationale = '';

  if (samples.length === 0) {
    log(`Stage 6.5.1: sample-finder (args.input_samples empty; auto-discovering from codebase + prior-stage docs)`);
    const finder = await agentWithRetry(
      `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}.\n` +
      `The design at Stage 6 declared numeric constants that Stage 6.5.2 ` +
      `prototype-runner must validate against representative real input samples. ` +
      `args.input_samples is empty — your job is to discover 5-10 representative ` +
      `samples without asking the user.\n\n` +
      `Inputs to read yourself:\n` +
      `  - requirements: ${req.doc_path}\n` +
      `  - bdd: ${bdd.doc_path}\n` +
      `  - research: ${researchReports[researchReports.length - 1].doc_path}\n` +
      `  - assessment: ${assessment.doc_path}\n` +
      `  - design: ${design.docs.map(d => d.path).join(', ')}\n` +
      (debugResult ? `  - debug: ${debugResult.doc_path}\n` : '') +
      `\nDiscovery process:\n` +
      `  1. From the design + research, identify what KIND of input the constants ` +
      `     measure against (e.g. ID strings of a specific format, image dimensions, ` +
      `     OData payloads, RSS feed URLs, transaction IDs, file paths).\n` +
      `  2. Walk the worktree under ${shellQuote(WORKTREE_PATH)} for matching data: ` +
      `     test fixtures, sample data files, .json/.yaml/.xml fixtures, recorded ` +
      `     API responses, seed scripts, redacted production captures.\n` +
      `  3. Pick 5-10 samples spanning the realistic range: small/medium/large, ` +
      `     happy path + edge cases (empty, max-length, special chars, error cases).\n` +
      `  4. If the constants need RUNTIME values (e.g. URLs that must be reachable) ` +
      `     and only test fixtures exist, USE THE FIXTURES — they're closer to ` +
      `     production than synthetic placeholders.\n` +
      `  5. If genuinely nothing relevant exists in the codebase, return an empty ` +
      `     samples array AND set rationale='no_codebase_samples_found:<one-line ` +
      `     explanation of what was searched and why nothing matched>'. The workflow ` +
      `     will surface this to the user.\n\n` +
      `Return JSON: {"samples": [string], "source": string, "rationale": string}.\n` +
      `  - samples: 5-10 strings (file paths absolute under worktree, OR inline ` +
      `             literal values like ID strings). Empty array iff nothing found.\n` +
      `  - source:  one-line description ("test fixtures under backend-service/testdata/", ` +
      `             "redacted API captures in specification/<spec>/fixtures/", etc).\n` +
      `  - rationale: why these samples are representative (range coverage, edge cases ` +
      `               included, etc), OR the 'no_codebase_samples_found:...' marker.`,
      {
        label: 'sample-finder',
        phase: 'Stage 6.5 — Prototype',
        agentType: 'general-purpose',
        schema: {
          type: 'object',
          required: ['samples', 'source', 'rationale'],
          additionalProperties: false,
          properties: {
            samples:   { type: 'array', items: { type: 'string' } },
            source:    { type: 'string' },
            rationale: { type: 'string' },
          },
        },
      },
    );
    samples = finder.samples ?? [];
    sampleSource = finder.source ?? '(unknown)';
    sampleRationale = finder.rationale ?? '';
    if (samples.length === 0) {
      throw new Error(
        `Stage 6.5.1: sample-finder found no representative samples in the codebase.\n` +
        `Source searched: ${sampleSource}\n` +
        `Rationale: ${sampleRationale}\n\n` +
        `Provide 5-10 representative samples via args.input_samples and re-run the ` +
        `workflow with resumeFromRunId (see "Discipline A" in ` +
        `reference/lessons-learned/spec-29-visual-verification.md).`
      );
    }
    log(`Stage 6.5.1 complete: ${samples.length} sample(s) auto-discovered from ${sampleSource}.`);
    if (sampleRationale) log(`  rationale: ${sampleRationale}`);
  } else {
    log(`Stage 6.5.1 skipped (args.input_samples already populated with ${samples.length} sample(s)).`);
  }

  // Step 6.5.2 — prototype-runner. Validates constants against the resolved
  // samples (whether user-supplied or auto-discovered).
  log(`Stage 6.5.2: prototype-runner validating constants against ${samples.length} sample(s)`);
  const protoName = docName('prototype-report.md');
  const designDoc = (design.docs.find(d => d.kind === 'architecture')?.path)
    ?? design.docs[0].path;

  const protoLoop = await gatedPrototypeLoop({
    stage: 'Stage 6.5',
    gateName: 'gate-prototype',
    writerLabel: 'prototype-runner',
    maxIters: MAX_PROTOTYPE_ITERS,
    spawnWriter: (iter, guidance) => agentWithRetry(
      `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}.\n` +
      `Design document: ${designDoc}\n` +
      `Input samples (JSON): ${JSON.stringify(samples)}\n` +
      `Sample source: ${sampleSource}` + (sampleRationale ? ` — ${sampleRationale}` : '') + `\n\n` +
      `Extract every numeric design constant from the design document (thresholds, ratios, ` +
      `percentages, alphas, sizes). Build a minimal prototype that exercises each constant ` +
      `against the supplied samples. Measure the actual value(s) achieved. Compare to the ` +
      `spec value within the tolerance declared in the design (or 10% if unspecified). ` +
      `Write ${shellQuote(SPEC_DIRECTORY + '/' + protoName)} with a table of ` +
      `name | spec | measured | tolerance | within? per constant. ` +
      // Gate-prototype regex requires literal phrasing — bake it in to reduce loop iterations.
      `Required document structure: heading "## Constants Under Test" (or include the phrase ` +
      `"Constants Under Test" in a subheading), heading "## Measurement Results", heading ` +
      `"## Verdict" with overall PASS/FAIL, heading "## Recommendation" (proceed / caveats / ` +
      `pivot), and a reference to the prototype source directory under "prototype/". ` +
      `Set verdict='PROTOTYPE_OK' iff every constant is within tolerance, otherwise ` +
      `'PROTOTYPE_FAILED' and list failing_constants by name; FAIL verdict must mention ` +
      `pivot-protocol in the Recommendation section.` + guidance,
      {
        label: `prototype-runner:${iter}`,
        phase: 'Stage 6.5 — Prototype',
        agentType: 'super-dev:prototype-runner',
        schema: PROTOTYPE_OUTPUT,
      },
    ),
    spawnGate: () => agentWithRetry(
      `Wait for ${shellQuote(SPEC_DIRECTORY + '/' + protoName)} to appear, then run ` +
      `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-prototype.sh')} ${shellQuote(SPEC_DIRECTORY)}. ` +
      `Return the gate verdict.`,
      {
        label: 'doc-validator:gate-prototype',
        phase: 'Stage 6.5 — Prototype',
        agentType: 'super-dev:doc-validator',
        schema: GATE_VERDICT,
      },
    ),
  });

  // PROTOTYPE_FAILED short-circuit (empirical, not format): throw with the
  // stage-specific pivot message; the gate may have already passed, but the
  // measurement itself contradicts the design.
  if (protoLoop.pivot) {
    throw new Error(
      `Stage 6.5: prototype empirically failed for constants ${JSON.stringify(protoLoop.writer.failing_constants)}. ` +
      `The spec design is built on wrong numbers — invoke pivot-protocol with these constants ` +
      `and re-run the workflow from Stage 6 (Design) with corrected values. ` +
      `Prototype report: ${protoLoop.writer.doc_path}`
    );
  }
  prototype = protoLoop.writer;
  log(`Stage 6.5 complete: ${prototype.constants_tested.length} constants validated within tolerance (${protoLoop.iterations} iteration${protoLoop.iterations === 1 ? '' : 's'}).`);
}

// ---------------------------------------------------------------------------
// Stage 7 — Specification
//   spec-writer produces specification.md + implementation-plan.md +
//   task-list.md in a single invocation. doc-validator runs gate-spec-trace
//   to confirm every AC and BDD scenario is traced into the plan.
// ---------------------------------------------------------------------------
phase('Stage 7 — Specification');
await updateTracking({ stage: 7, status: 'in_progress', currentPhase: 'Stage 7 — Specification' });

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

const spawnSpecWriter = async (extraGuidance = '', iter = 1) => {
  const result = await agentWithRetry(
    `${baseSpecInputs}\n` +
    `Produce three documents:\n` +
    `  1. ${shellQuote(SPEC_DIRECTORY + '/' + specName)}\n` +
    `  2. ${shellQuote(SPEC_DIRECTORY + '/' + planName)} — implementation plan with phases\n` +
    `  3. ${shellQuote(SPEC_DIRECTORY + '/' + tasksName)} — task list (DAG with phase numbers)\n` +
    `Every AC from requirements and every BDD scenario MUST be traced into at least one phase. ` +
    `Set phase_count to the number of phases in the plan; return SpecOutput.` +
    (extraGuidance ? `\n\n--- Targeted revisions from prior review ---\n${extraGuidance}` : ''),
    {
      label: iter === 1 ? 'spec-writer' : `spec-writer:revise-${iter}`,
      phase: 'Stage 7 — Specification',
      agentType: 'super-dev:spec-writer',
      schema: SPEC_OUTPUT,
    },
  );
  // Pass through happy-path results untouched.
  if (result && result.specification_path) return result;

  // Disk-fallback path. Observed failure: spec-writer ran to completion
  // (~70min), wrote all three docs, then the API connection dropped before
  // the structured response reached the runtime — agent() returned null
  // even though the artifacts were on disk. Synthesize SpecOutput from the
  // existing files so the workflow doesn't lose the entire writer pass.
  //
  // Safety vs. Stage 8 spec-iteration revisions: when this runs during a
  // revision pass, the on-disk files may be partially overwritten. That's
  // OK — gate-spec-trace runs right after this and FAILs on inconsistent
  // files, which triggers the Stage 8 loop to re-iterate. Recovery doesn't
  // mask spec staleness; it only handles the "structured return lost in
  // transit" case.
  log(`Stage 7: spec-writer iter ${iter} returned ${result === null ? 'null' : 'incomplete object'} — attempting on-disk recovery`);
  const recovered = await _recoverSpecFromDisk(SPEC_DIRECTORY, specName, planName, tasksName);
  if (!recovered) {
    throw new Error(
      `Stage 7: spec-writer iter ${iter} returned no usable result and on-disk recovery failed. ` +
      `Expected ${specName}, ${planName}, ${tasksName} in ${SPEC_DIRECTORY}. ` +
      `If the writer was interrupted before writing any file, re-run the workflow.`
    );
  }
  log(`Stage 7: recovered SpecOutput from disk (${recovered.phase_count} phases).`);
  return recovered;
};

const spawnSpecTraceGate = () => agentWithRetry(
  `Wait for ${shellQuote(SPEC_DIRECTORY + '/' + specName)}, ${shellQuote(SPEC_DIRECTORY + '/' + planName)}, ` +
  `and ${shellQuote(SPEC_DIRECTORY + '/' + tasksName)} to appear, then run ` +
  `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-spec-trace.sh')} ${shellQuote(SPEC_DIRECTORY)}. ` +
  `Return the gate verdict.`,
  {
    label: 'doc-validator:gate-spec-trace',
    phase: 'Stage 7 — Specification',
    agentType: 'super-dev:doc-validator',
    schema: GATE_VERDICT,
  },
);

const specTraceLoop = await gatedSpecTraceLoop({
  stage: 'Stage 7',
  gateName: 'gate-spec-trace',
  writerLabel: 'spec-writer',
  maxIters: MAX_SPEC_TRACE_ITERS,
  spawnWriter: (iter, guidance) => spawnSpecWriter(guidance, iter),
  spawnGate: spawnSpecTraceGate,
});
let spec = specTraceLoop.writer;
log(`Stage 7 complete: spec + plan (${spec.phase_count} phases) + tasks; spec-trace gate PASS (${specTraceLoop.iterations} iteration${specTraceLoop.iterations === 1 ? '' : 's'}).`);
await updateTracking({ stage: 7, status: 'complete', currentPhase: 'Stage 7 — Specification' });

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
await updateTracking({ stage: 8, status: 'in_progress', currentPhase: 'Stage 8 — Spec Review' });

let specReview = null;
let specIter = 0;
while (specIter < MAX_SPEC_ITERS) {
  specIter += 1;
  const reviewName = specIter === 1
    ? docName('spec-review.md')
    : docName(`spec-review-${specIter}.md`);
  log(`Stage 8 iteration ${specIter}/${MAX_SPEC_ITERS}: spec-reviewer + gate-spec-review`);

  const [review, reviewVerdict] = await parallel([
    () => agentWithRetry(
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
        agentType: 'super-dev:spec-reviewer',
        schema: SPEC_REVIEW_OUTPUT,
      },
    ),
    () => agentWithRetry(
      `Wait for ${shellQuote(SPEC_DIRECTORY + '/' + reviewName)} to appear, then run ` +
      `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-spec-review.sh')} ${shellQuote(SPEC_DIRECTORY + '/' + reviewName)}. ` +
      `Return the gate verdict.`,
      {
        label: `doc-validator:gate-spec-review:${specIter}`,
        phase: 'Stage 8 — Spec Review',
        agentType: 'super-dev:doc-validator',
        schema: GATE_VERDICT,
      },
    ),
  ]);

  if (!reviewVerdict?.pass) {
    if (specIter >= MAX_SPEC_ITERS) {
      throw new Error(
        `Stage 8 gate-spec-review still failing after ${MAX_SPEC_ITERS} iteration(s): ` +
        `${(reviewVerdict?.errors || []).join('; ')}`
      );
    }
    log(`Stage 8 iteration ${specIter}: gate-spec-review FAIL — ${(reviewVerdict?.errors || []).join('; ')}. Iterating.`);
    continue;
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
  spec = await spawnSpecWriter(guidance, 1 + specIter);

  // Re-validate trace gate after the rewrite.
  const reTrace = await agentWithRetry(
    `Wait for the updated ${shellQuote(SPEC_DIRECTORY + '/' + specName)}, ` +
    `${shellQuote(SPEC_DIRECTORY + '/' + planName)}, and ${shellQuote(SPEC_DIRECTORY + '/' + tasksName)} ` +
    `to be stable, then run ` +
    `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-spec-trace.sh')} ${shellQuote(SPEC_DIRECTORY)}. ` +
    `Return the gate verdict.`,
    {
      label: `doc-validator:gate-spec-trace:revise-${specIter}`,
      phase: 'Stage 8 — Spec Review',
      agentType: 'super-dev:doc-validator',
      schema: GATE_VERDICT,
    },
  );
  if (!reTrace?.pass) {
    if (specIter >= MAX_SPEC_ITERS) {
      throw new Error(
        `Stage 8: gate-spec-trace still failing after spec rewrite (iteration ${specIter}): ` +
        `${(reTrace.errors || []).join('; ')}`
      );
    }
    log(`Stage 8 iteration ${specIter}: gate-spec-trace FAIL after rewrite — ${(reTrace.errors || []).join('; ')}. Iterating.`);
    // Loop continues — next iteration re-runs spec-reviewer which triggers another rewrite cycle
  }
}
await updateTracking({ stage: 8, status: 'complete', currentPhase: 'Stage 8 — Spec Review' });

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
//   On any failure inside the loop (qa.tests_failed > 0, qa.uncovered_scenarios
//   non-empty, e2e.all_green=false, impl.all_tests_green=false, or
//   gate-build FAIL), the next iteration CLASSIFIES the cause:
//     - Test gap (uncovered_scenarios non-empty, or e2e fails on a scenario
//       with no test at all) -> re-spawn tdd-guide:fix FIRST to add the
//       missing failing tests, then specialist to make them green.
//     - Code fault (tests exist and fail on assertion, or e2e fails on
//       wired-up scenarios) -> skip tdd-guide, re-spawn specialist with
//       the QA / e2e finding quoted verbatim.
//   Max MAX_PHASE_ITERS iterations per phase; after cap, throw with the
//   final qa / e2e / gate-build state.
//
//   Why sequential across phases? Per-phase commits must land in plan order
//   so the running base_sha is monotonic and impl-summary diffs are clean.
//   Spec phases declare depends_on in SpecOutput.phases; we honour that
//   ordering and skip parallelism for safety (parallel-safe specialists are
//   added in C8 via isolation: worktree).
// ---------------------------------------------------------------------------
phase('Stage 9 — Implementation');
await updateTracking({ stage: 9, status: 'in_progress', currentPhase: 'Stage 9 — Implementation' });

const phases = spec.phases?.length
  ? [...spec.phases].sort((a, b) => a.number - b.number)
  : Array.from({ length: spec.phase_count }, (_, i) => ({ number: i + 1, name: `Phase ${i + 1}` }));

// Domain specialist routing. All names are super-dev-prefixed (plugin scope).
// 'mixed' / unrecognised falls back to super-dev:dev-executor.
const SPECIALIST_BY_LANG = {
  rust:     'super-dev:rust-developer',
  go:       'super-dev:golang-developer',
  frontend: 'super-dev:frontend-developer',
  backend:  'super-dev:backend-developer',
  ios:      'super-dev:ios-developer',
  android:  'super-dev:android-developer',
  macos:    'super-dev:macos-app-developer',
  windows:  'super-dev:windows-app-developer',
};
const specialistAgent = SPECIALIST_BY_LANG[LANGUAGE] ?? 'super-dev:dev-executor';
log(`Stage 9: ${phases.length} phase(s) total; domain specialist = ${specialistAgent}; is_web_ui=${IS_WEB_UI}`);

// ENV_COPY_RECIPE + INSTALL_DEPS_RECIPE are defined near the top of the
// file (right after WORKTREE_PATH/SPEC_DIRECTORY) so Stage 1.6 and Stage 9
// share the same bash.

const phaseResults = [];

for (const ph of phases) {
  log(`Stage 9 phase ${ph.number}/${phases.length}: "${ph.name}"`);
  await updateTracking({ implPhase: { number: ph.number, name: ph.name, status: 'in_progress', totalPhases: phases.length }, currentPhase: 'Stage 9 — Implementation' });

  // 9.1 — capture base_sha BEFORE any test/code change.
  const baseSha = (await agentWithRetry(
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
  const tdd = await agentWithRetry(
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
      agentType: 'super-dev:tdd-guide',
      schema: TDD_OUTPUT,
    },
  );

  // 9.3-9.7 — implementation, summary, QA, e2e, gate-build, with a max-N
  // fix loop on gate-build failure. On iteration 2+ the loop CLASSIFIES the
  // prior failure: test/coverage gaps (uncovered_scenarios non-empty, e2e
  // failing on scenarios that have no test at all) re-run tdd-guide FIRST
  // to add the missing tests, then the specialist; pure code/UI bugs (tests
  // exist and fail on assertion) skip tdd-guide and re-spawn the specialist
  // with the failure verbatim. Mirrors the Stage 10 review-loop classifier.
  let impl = null, implSummary = null, qa = null, e2e = null, buildVerdict = null;
  let phaseIter = 0;
  while (phaseIter < MAX_PHASE_ITERS) {
    phaseIter += 1;
    log(`  Phase ${ph.number} iteration ${phaseIter}/${MAX_PHASE_ITERS}: specialist + impl-summary + qa` + (IS_WEB_UI ? ' + e2e' : ''));

    // Iteration 2+: classify what failed last round so we re-spawn the right
    // agent before the specialist.
    let testGapGuidance = '';
    let codeFixGuidance = '';
    if (phaseIter > 1) {
      const uncovered = qa?.uncovered_scenarios ?? [];
      const qaTestsFailed = qa?.tests_failed ?? 0;
      const e2eFailedNoCoverage = IS_WEB_UI && e2e && !e2e.all_green && uncovered.length > 0;

      const hasTestGap = uncovered.length > 0 || e2eFailedNoCoverage;
      const hasCodeFault = qaTestsFailed > 0 ||
        (impl && impl.all_tests_green === false) ||
        (IS_WEB_UI && e2e && !e2e.all_green && uncovered.length === 0);

      if (hasTestGap) {
        log(`  Phase ${ph.number} iter ${phaseIter}: detected test gap (${uncovered.length} uncovered scenario${uncovered.length === 1 ? '' : 's'}` +
            (e2eFailedNoCoverage ? ', e2e fails on uncovered flow' : '') +
            `) — re-running tdd-guide BEFORE specialist`);
        await agentWithRetry(
          `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
          `Inputs to read yourself:\n` +
          `  - requirements: ${req.doc_path}\n` +
          `  - bdd: ${bdd.doc_path}\n` +
          `  - specification: ${spec.specification_path}\n` +
          `  - plan: ${spec.plan_path}\n` +
          `phase_scope: ${ph.number}.\n\n` +
          `The prior iteration's QA report flagged ${uncovered.length} uncovered scenario(s). ` +
          `Add failing tests that cover ONLY these scenarios — do NOT touch production code, ` +
          `do NOT modify existing tests. Tests should be RED on commit (fail or fail to compile) ` +
          `against the current implementation; the specialist will be re-spawned right after to ` +
          `make them GREEN.\n\n` +
          `Uncovered scenarios:\n` +
          uncovered.map(s => `  - ${s}`).join('\n') +
          (e2eFailedNoCoverage
            ? `\n\nAlso add e2e tests for the uncovered flows above — the e2e suite reports ` +
              `all_green=false but the failures are on scenarios that have no test at all.`
            : ''),
          {
            label: `phase-${ph.number}:tdd-guide:fix:${phaseIter}`,
            phase: 'Stage 9 — Implementation',
            agentType: 'super-dev:tdd-guide',
            schema: TDD_OUTPUT,
          },
        );
        testGapGuidance =
          `\n--- Test gap from prior QA (iter ${phaseIter - 1}) ---\n` +
          `tdd-guide just added failing tests for: ${uncovered.join(', ')}. ` +
          `Make THESE tests pass in addition to the existing ones; do not delete or weaken them.`;
      }

      if (hasCodeFault) {
        codeFixGuidance =
          `\n--- Code fault from prior QA (iter ${phaseIter - 1}) ---\n` +
          `tests_failed: ${qaTestsFailed}, coverage_overall: ${qa?.coverage_overall ?? 0}, ` +
          `coverage_new: ${qa?.coverage_new ?? 0}, impl.all_tests_green: ${impl?.all_tests_green ?? 'n/a'}` +
          (IS_WEB_UI ? `, e2e.all_green: ${e2e?.all_green ?? 'n/a'}` : '') +
          `.\nRe-read the failing-test output (qa report: ${qa?.doc_path}` +
          (IS_WEB_UI && e2e ? `; e2e report: ${e2e.doc_path}` : '') +
          `), fix the implementation, and ensure all_tests_green=true. ` +
          `Quote the reviewer's exact assertion message — do not paraphrase.`;
      }
    }

    const reviewGuidance = testGapGuidance + codeFixGuidance;

    // 9.3 — domain specialist (GREEN).
    impl = await agentWithRetry(
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
    implSummary = await agentWithRetry(
      `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
      `phase_number: ${ph.number}. phase_name: "${ph.name}".\n` +
      `base_sha: ${baseSha}.\n` +
      `Append a section for this phase to the implementation-summary document (create it on ` +
      `phase 1, append on later phases). Diff against base_sha to enumerate files_changed.`,
      {
        label: `phase-${ph.number}:impl-summary:${phaseIter}`,
        phase: 'Stage 9 — Implementation',
        agentType: 'super-dev:impl-summary-writer',
        schema: IMPL_SUMMARY_OUTPUT,
      },
    );

    // 9.5 — qa-agent (VERIFY).
    qa = await agentWithRetry(
      `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
      `Inputs to read yourself: ${req.doc_path}, ${bdd.doc_path}, ${spec.specification_path}, ` +
      `${spec.plan_path}, ${spec.tasks_path}.\n` +
      `phase_scope: ${ph.number}.\n\n` +
      // Install dependencies BEFORE running any test. The specialist may have
      // added new dependencies in this phase, and a fresh worktree on a CI-
      // like environment may have no node_modules / .venv / vendor at all.
      // Without this step, the build_command commonly fails with
      // 'command not found: pnpm' or 'module not found' on the first run.
      `Step 1 — Copy environment files from the main repo to the worktree. The Stage 1 worktree ` +
      `was created from a branch and does NOT inherit .gitignore'd files, so .env / .env.local / ` +
      `.env.test / etc. are missing — including any nested in monorepo subdirectories ` +
      `(apps/<name>/.env.local, services/<name>/.env, packages/<name>/.env, etc.). Tests that ` +
      `need DB URLs, API keys, or feature flags will fail with 'connection refused' or ` +
      `'undefined env var' before the assertion phase. Run this recursive copy verbatim:\n` +
      `\`\`\`bash\n${ENV_COPY_RECIPE}\`\`\`\n` +
      `This walks the entire main-repo tree, prunes vendored/build dirs (.git, node_modules, ` +
      `target, dist, build, .next, .nuxt, vendor, .venv, venv, __pycache__), copies every ` +
      `.env or .env.* file (excluding *.example / *.template) to the matching relative path ` +
      `under the worktree, creating intermediate directories with mkdir -p. Echo the list of ` +
      `copied files into the QA report 'summary' field. Missing .env files when the app needs ` +
      `them is an INSTALL failure — set all_green=false rather than masking with mocks.\n\n` +
      `Step 2 — Install dependencies BEFORE any test execution. Detect the package manager(s) ` +
      `from the worktree manifest files and run the appropriate install command(s) idempotently:\n` +
      `  - Cargo.toml          -> (no install step; cargo fetches on first test run)\n` +
      `  - package.json + pnpm-lock.yaml      -> pnpm install --frozen-lockfile\n` +
      `  - package.json + yarn.lock           -> yarn install --frozen-lockfile\n` +
      `  - package.json + package-lock.json   -> npm ci\n` +
      `  - package.json (no lockfile)          -> npm install\n` +
      `  - go.mod              -> go mod download\n` +
      `  - Pipfile             -> pipenv install --deploy\n` +
      `  - poetry.lock         -> poetry install --no-interaction\n` +
      `  - requirements.txt    -> pip install -r requirements.txt\n` +
      `  - Gemfile             -> bundle install\n` +
      `  - composer.json       -> composer install --no-interaction\n` +
      `  - mix.exs             -> mix deps.get\n` +
      `Polyglot projects: run each detected install in dependency-graph order ` +
      `(backend deps before frontend tests, etc). Report install failures verbatim in the QA ` +
      `report 'summary' field and set all_green=false — never paper over a broken install.\n\n` +
      `Step 3 — Run the build_command (${JSON.stringify(impl.build_command)}). Verify ALL phase tests ` +
      `pass and coverage thresholds hold (overall 80%+, new 90%+). Map every test back to ` +
      `an AC-ID/SCENARIO-ID. Report uncovered scenarios honestly — a green build with gaps ` +
      `is worse than a red build with full coverage intent.`,
      {
        label: `phase-${ph.number}:qa:${phaseIter}`,
        phase: 'Stage 9 — Implementation',
        agentType: 'super-dev:qa-agent',
        schema: QA_OUTPUT,
      },
    );

    // 9.6 — e2e-runner (CONDITIONAL).
    if (IS_WEB_UI) {
      e2e = await agentWithRetry(
        `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
        `phase_number: ${ph.number}.\n\n` +
        // E2E suites are the most fragile w.r.t. env config: the dev server
        // needs every NEXT_PUBLIC_* / VITE_* / DATABASE_URL / etc. that the
        // app reads at boot, otherwise the server crashes before any browser
        // attaches and Playwright/Cypress reports the unhelpful "ECONNREFUSED
        // localhost:3000". Copy env files first, then deps, then drivers.
        `Step 1 — Copy environment files from the main repo. The worktree was created from a ` +
        `branch and does NOT have .gitignore'd env files at ANY depth — root, monorepo apps, ` +
        `packages, services, crates, etc. An e2e dev server cannot start without them. Run ` +
        `this recursive copy verbatim:\n` +
        `\`\`\`bash\n${ENV_COPY_RECIPE}\`\`\`\n` +
        `This walks the full main-repo tree, prunes vendored/build directories, copies every ` +
        `.env / .env.* file (excluding *.example / *.template) to the matching relative path ` +
        `under the worktree, and echoes the list of copied files. After the copy, BEFORE ` +
        `starting the dev server, sanity-check that every env var the app reads at boot ` +
        `(search code for process.env.* and import.meta.env.*) actually has a value — log ` +
        `missing vars in the report's 'summary' field and set all_green=false. A failed ` +
        `env-copy is reported as an install failure, not a test failure.\n\n` +
        // E2E suites typically need BOTH the app's runtime deps AND a browser-
        // driver toolchain (Playwright, Cypress, etc.). Browser-driver installs
        // are slow (~30-90s for Playwright chromium+webkit+firefox), so they
        // must be deterministic — skip silently if the install was already done.
        // If the app does not declare an e2e tool at all, install Playwright
        // on the fly via npx (no app-package.json mutation) so the workflow
        // can still produce real browser-level coverage for the UI feature.
        `Step 2 — Install dependencies BEFORE any E2E test. Detect package manager(s) the same ` +
        `way qa-agent does (pnpm-lock.yaml -> pnpm install --frozen-lockfile; yarn.lock -> ` +
        `yarn install --frozen-lockfile; package-lock.json -> npm ci; no lockfile -> npm install).\n\n` +
        `Then ensure an e2e tool is available. First, inspect the worktree's package.json (root ` +
        `AND every workspace member) for ALL of these candidates in 'dependencies' / ` +
        `'devDependencies' / 'optionalDependencies':\n` +
        `  - @playwright/test, playwright\n` +
        `  - cypress\n` +
        `  - webdriverio, @wdio/cli\n` +
        `  - puppeteer\n` +
        `  - testcafe\n` +
        `  - selenium-webdriver\n` +
        `For Python projects also check requirements.txt / Pipfile / pyproject.toml for: ` +
        `playwright (Python bindings), selenium, splinter, pytest-playwright.\n\n` +
        `Case A — App already declares an e2e tool: install its driver:\n` +
        `  - @playwright/test or playwright (Node)  -> <pm> exec playwright install --with-deps\n` +
        `  - playwright (Python)                    -> python -m playwright install --with-deps\n` +
        `  - cypress                                -> <pm> exec cypress install\n` +
        `  - webdriverio                            -> driver bundled with the runner; no extra step\n` +
        `  - puppeteer                              -> downloads Chromium on first install; no extra step\n` +
        `  - testcafe                               -> driver bundled; no extra step\n` +
        `  - selenium-webdriver / Python selenium   -> ensure chromedriver / geckodriver on PATH ` +
        `(install via 'brew install chromedriver' on macOS, 'apt-get install chromium-driver' on Linux, ` +
        `or download from the official mirror) AND verify with 'chromedriver --version'\n\n` +
        `Case B — App does NOT declare an e2e tool but has a UI to test: install Playwright on ` +
        `the fly WITHOUT mutating the app's package.json. Use one of (in priority order):\n` +
        `  1. 'npx --yes @playwright/test@latest install --with-deps' to fetch the driver, then ` +
        `'npx --yes @playwright/test@latest test <test-files>' to run\n` +
        `  2. If npx is unavailable, install into a sibling tmp dir: ` +
        `'mkdir -p ${shellQuote(WORKTREE_PATH)}/.e2e-tools && cd ${shellQuote(WORKTREE_PATH)}/.e2e-tools && ` +
        `npm init -y >/dev/null && npm install --save-dev @playwright/test && ` +
        `npx playwright install --with-deps'\n` +
        `Either way the install is logged and the on-the-fly toolchain is documented in the ` +
        `E2E report's 'summary' field so the user knows the tool was provisioned by the ` +
        `workflow rather than declared by the project.\n\n` +
        `All install commands are idempotent — they no-op when the binaries are already cached.\n\n` +
        `Step 3 — Start the app/dev server if the E2E config doesn't auto-start one (Playwright's ` +
        `webServer block handles this; raw test runners may not). Wait for the readiness probe ` +
        `(HTTP 200 on the configured base URL) before launching browsers. If the server crashes ` +
        `at boot, capture its stderr and surface it in the report.\n\n` +
        `Step 4 — Run E2E tests against the implementation. Cover all UI scenarios for this ` +
        `phase across the project's configured browsers. Verify performance and accessibility ` +
        `budgets. Report install / env-copy / server-start failures verbatim and set ` +
        `all_green=false.`,
        {
          label: `phase-${ph.number}:e2e:${phaseIter}`,
          phase: 'Stage 9 — Implementation',
          agentType: 'super-dev:e2e-runner',
          schema: E2E_OUTPUT,
        },
      );
    }

    // 9.7 — gate-build. Final phase gate.
    buildVerdict = await agentWithRetry(
      `Wait for the build to settle, then run ` +
      `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-build.sh')} ${shellQuote(WORKTREE_PATH)}. ` +
      `Return the gate verdict.`,
      {
        label: `phase-${ph.number}:gate-build:${phaseIter}`,
        phase: 'Stage 9 — Implementation',
        agentType: 'super-dev:doc-validator',
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
  const commit = await agentWithRetry(
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
  await updateTracking({
    implPhase: {
      number: ph.number, name: ph.name, status: 'complete', reviewIterations: phaseIter,
      files: { created: tdd.test_files || [], modified: impl.files_modified || [], deleted: [] },
    },
    currentPhase: 'Stage 9 — Implementation',
  });

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
await updateTracking({
  stage: 9, status: 'complete', currentPhase: 'Stage 9 — Implementation',
  files: {
    created: Array.from(new Set(phaseResults.flatMap(p => p.test_files))),
    modified: Array.from(new Set(phaseResults.flatMap(p => p.impl_files))),
    deleted: [],
  },
});

// ---------------------------------------------------------------------------
// Stage 10 — Code review + adversarial review (parallel) with iteration loop
//   Five agents in parallel per iteration:
//     1. code-reviewer                              (Approved/AwC/Changes/Blocked)
//     2. adversarial-reviewer                        (PASS/CONTEST/REJECT)
//     3. doc-validator (gate-review on code-review.md)
//     4. doc-validator (gate-review on adversarial-review.md)
//     5. doc-validator (gate-implementation-complete on tracking JSON)
//
//   Exit (Stage 10 PASS) iff:
//     - code-reviewer.verdict === 'Approved' AND
//     - adversarial-reviewer.verdict === 'PASS' AND
//     - ALL three gate verdicts pass
//   Otherwise iterate: re-spawn tdd-guide (when reviewer findings indicate
//   missing/incorrect tests) + domain specialist (for code fixes) + qa-agent,
//   then re-run all 5 reviewers.
//
//   Pivot trigger (checked starting iteration 2):
//     Same class of failure persists AND adversarial-reviewer set
//     spec_faithful_but_wrong=true. Throws a PIVOT_REQUIRED error so the
//     caller invokes pivot-protocol and re-runs the workflow from Stage 6
//     with a revised design.
// ---------------------------------------------------------------------------
phase('Stage 10 — Code Review');
await updateTracking({ stage: 10, status: 'in_progress', currentPhase: 'Stage 10 — Code Review' });
const overallBaseSha = phaseResults[0]?.base_sha ?? null;
const overallHeadSha = phaseResults[phaseResults.length - 1]?.head_sha ?? null;
const filesChanged = Array.from(new Set(phaseResults.flatMap(p => [...p.impl_files, ...p.test_files])));

let codeReview = null;
let advReview = null;
let reviewIter = 0;
let priorFindingSignature = null;

while (reviewIter < MAX_REVIEW_ITERS) {
  reviewIter += 1;
  const codeReviewName = reviewIter === 1 ? docName('code-review.md') : docName(`code-review-${reviewIter}.md`);
  const advReviewName  = reviewIter === 1 ? docName('adversarial-review.md') : docName(`adversarial-review-${reviewIter}.md`);
  log(`Stage 10 iteration ${reviewIter}/${MAX_REVIEW_ITERS}: 5 reviewers in parallel`);

  const reviewerBase =
    `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
    `Inputs to read yourself:\n` +
    `  - requirements: ${req.doc_path}\n` +
    `  - bdd: ${bdd.doc_path}\n` +
    `  - research: ${researchReports[researchReports.length - 1].doc_path}\n` +
    `  - specification: ${spec.specification_path}\n` +
    `  - plan: ${spec.plan_path}\n` +
    `  - tasks: ${spec.tasks_path}\n` +
    `  - assessment: ${assessment.doc_path}\n` +
    (design ? `  - design: ${design.docs.map(d => d.path).join(', ')}\n` : '') +
    `  - implementation summaries: ${phaseResults.map(p => p.summary_doc).join(', ')}\n` +
    `  - QA reports: ${phaseResults.map(p => p.qa_doc).join(', ')}\n` +
    (phaseResults.some(p => p.e2e_doc) ? `  - E2E reports: ${phaseResults.filter(p => p.e2e_doc).map(p => p.e2e_doc).join(', ')}\n` : '') +
    `Diff base_sha: ${overallBaseSha ?? '(none — no Stage 9 phases)'}\n` +
    `Diff head_sha: ${overallHeadSha ?? '(none)'}\n` +
    `files_changed (${filesChanged.length}):` +
    (filesChanged.length <= 30
      ? `\n${filesChanged.map(f => '  ' + f).join('\n')}`
      : `\n${filesChanged.slice(0, 30).map(f => '  ' + f).join('\n')}\n  ... and ${filesChanged.length - 30} more (read impl summaries for full list)`);

  const [cr, ar, gateRevCode, gateRevAdv, gateImplComplete] = await parallel([
    () => agentWithRetry(
      `${reviewerBase}\n\n` +
      `Produce ${shellQuote(SPEC_DIRECTORY + '/' + codeReviewName)}. Cover ALL dimensions ` +
      `(correctness, security, performance, maintainability, style). Report EVERY finding ` +
      `including UNCERTAIN ones (confidence < 0.5); never suppress.\n` +
      `Verdict rules: 'Approved' when zero Critical + zero High + zero Medium findings ` +
      `(Low/Info findings are acceptable). 'Changes Requested' when any Medium+ finding ` +
      `exists. 'Blocked' when any Critical finding exists.`,
      {
        label: `code-reviewer:${reviewIter}`,
        phase: 'Stage 10 — Code Review',
        agentType: 'super-dev:code-reviewer',
        schema: CODE_REVIEW_OUTPUT,
      },
    ),
    () => agentWithRetry(
      `${reviewerBase}\n\n` +
      `Produce ${shellQuote(SPEC_DIRECTORY + '/' + advReviewName)}. Run all three lenses ` +
      `(Skeptic / Architect / Minimalist). PASS only when zero high-severity findings remain. ` +
      `REJECT only for production-failure / data-loss / security-breach risks. ` +
      `If the implementation faithfully follows the spec but the spec itself produces the ` +
      `wrong outcome, set spec_faithful_but_wrong=true so Stage 10 can route to pivot-protocol.`,
      {
        label: `adversarial-reviewer:${reviewIter}`,
        phase: 'Stage 10 — Code Review',
        agentType: 'super-dev:adversarial-reviewer',
        schema: ADVERSARIAL_REVIEW_OUTPUT,
      },
    ),
    () => agentWithRetry(
      `Wait for ${shellQuote(SPEC_DIRECTORY + '/' + codeReviewName)} to appear, then run ` +
      `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-review.sh')} ${shellQuote(SPEC_DIRECTORY)} --type code. ` +
      `Return the gate verdict.`,
      {
        label: `doc-validator:gate-review:code:${reviewIter}`,
        phase: 'Stage 10 — Code Review',
        agentType: 'super-dev:doc-validator',
        schema: GATE_VERDICT,
      },
    ),
    () => agentWithRetry(
      `Wait for ${shellQuote(SPEC_DIRECTORY + '/' + advReviewName)} to appear, then run ` +
      `${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-review.sh')} ${shellQuote(SPEC_DIRECTORY)} --type adversarial. ` +
      `Return the gate verdict.`,
      {
        label: `doc-validator:gate-review:adversarial:${reviewIter}`,
        phase: 'Stage 10 — Code Review',
        agentType: 'super-dev:doc-validator',
        schema: GATE_VERDICT,
      },
    ),
    () => agentWithRetry(
      `Run ${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-implementation-complete.sh')} ` +
      `${shellQuote(SPEC_DIRECTORY)}. This gate verifies all implementation-plan phases ` +
      `show status='complete' in the tracking JSON. Return the gate verdict.`,
      {
        label: `doc-validator:gate-implementation-complete:${reviewIter}`,
        phase: 'Stage 10 — Code Review',
        agentType: 'super-dev:doc-validator',
        schema: GATE_VERDICT,
      },
    ),
  ]);

  codeReview = cr;
  advReview = ar;

  // Gate failures: instead of throwing, feed errors back into the iteration
  // loop so the reviewer/specialist can fix the issue. Only throw if we've
  // exhausted all iterations with a persistent gate failure.
  const gateFailures = [gateRevCode, gateRevAdv, gateImplComplete]
    .filter(v => !v?.pass);
  if (gateFailures.length > 0) {
    if (reviewIter >= MAX_REVIEW_ITERS) {
      throw new Error(
        `Stage 10: gate(s) still failing after ${MAX_REVIEW_ITERS} iteration(s). ` +
        `Escalating to user.\n` +
        gateFailures.map(v => `  - ${v?.gate ?? 'unknown'}: ${(v?.errors || []).join('; ')}`).join('\n')
      );
    }
    const gateGuidance = gateFailures
      .map(v => `Gate '${v?.gate ?? 'unknown'}' FAILED:\n  ${(v?.errors || []).join('\n  ')}`)
      .join('\n');
    log(`Stage 10 iteration ${reviewIter}: gate failure(s) — feeding back to reviewers:\n${gateGuidance}`);
    // Loop continues — next iteration re-spawns reviewers with the gate
    // errors visible in the log, and the reviewer prompt naturally produces
    // a corrected document on the next pass.
    continue;
  }

  const codePass = cr?.verdict === 'Approved';
  const advPass  = ar?.verdict === 'PASS';
  if (codePass && advPass) {
    log(`Stage 10 PASS on iteration ${reviewIter}: code-review Approved, adversarial PASS, all gates pass.`);
    break;
  }

  // Hard pivot signal from adversarial reviewer at iter >= 2.
  if (reviewIter >= 2 && ar?.spec_faithful_but_wrong === true) {
    throw new Error(
      `Stage 10 iteration ${reviewIter}: PIVOT_REQUIRED — adversarial-reviewer reports the ` +
      `implementation is faithful to the spec but the spec itself produces the wrong outcome. ` +
      `Invoke pivot-protocol with these findings and re-run the workflow from Stage 6 with a ` +
      `revised design.\n` +
      `code-review: ${cr?.doc_path}\nadversarial-review: ${ar?.doc_path}`
    );
  }

  // Hard REJECT halts the loop — fixing the implementation cannot make a
  // production-failure / data-loss / security-breach class issue go away.
  if (ar?.verdict === 'REJECT') {
    throw new Error(
      `Stage 10 iteration ${reviewIter}: adversarial-reviewer REJECT — ` +
      `production-failure / data-loss / security-breach class issue. Stop and escalate. ` +
      `Report: ${ar.doc_path}`
    );
  }

  // Implementation-pivot detection by signature stagnation: if the SAME
  // set of files+severities is reported on iteration 2 as on iteration 1,
  // the implementation iteration is not converging and a pivot is likely.
  // We surface this with a clear escalation message rather than auto-pivot.
  const findingSig = [
    ...(cr?.findings ?? []).map(f => `${f.severity}:${f.file}:${f.issue.slice(0, 40)}`),
    ...(ar?.findings ?? []).map(f => `${f.severity}:${f.lens}:${(f.issue || '').slice(0, 40)}`),
  ].sort().join('|');
  const stalled = reviewIter >= 2 && findingSig && findingSig === priorFindingSignature;
  if (stalled) {
    throw new Error(
      `Stage 10 iteration ${reviewIter}: findings unchanged since prior iteration — ` +
      `implementation iteration is not converging. Likely a spec/design issue. ` +
      `Stop and consider pivot-protocol. code-review: ${cr?.doc_path}, adversarial: ${ar?.doc_path}`
    );
  }
  priorFindingSignature = findingSig;

  if (reviewIter >= MAX_REVIEW_ITERS) {
    throw new Error(
      `Stage 10: exhausted ${MAX_REVIEW_ITERS} review iterations with code-review='${cr?.verdict}' ` +
      `/ adversarial='${ar?.verdict}'. Escalating to user. ` +
      `Reports: ${cr?.doc_path}, ${ar?.doc_path}`
    );
  }

  // ----- Iteration: re-spawn tdd-guide (when tests are at fault) +
  //       domain specialist (code fixes) + qa-agent + new code-review. -----
  const testFindings = (cr?.findings ?? []).filter(f =>
    /test|coverage|missing.{0,10}(test|assert)/i.test(f.issue) ||
    f.category === 'test' || f.category === 'coverage'
  );
  const codeFindings = (cr?.findings ?? []).filter(f => !testFindings.includes(f));
  const advFindings = ar?.findings ?? [];

  const fixGuidance =
    `--- Findings from Stage 10 iteration ${reviewIter} ---\n` +
    `Code review (verdict: ${cr?.verdict ?? 'n/a'}):\n` +
    (codeFindings.length
      ? codeFindings.map(f => `  [${f.severity}] ${f.file}${f.line ? ':' + f.line : ''} — ${f.issue}` +
          (f.recommendation ? `\n    Fix: ${f.recommendation}` : '')).join('\n')
      : '  (no code findings)') +
    `\n\nAdversarial review (verdict: ${ar?.verdict ?? 'n/a'}):\n` +
    (advFindings.length
      ? advFindings.map(f => `  [${f.lens}/${f.severity}] ${f.issue}` +
          (f.recommendation ? `\n    Fix: ${f.recommendation}` : '')).join('\n')
      : '  (no adversarial findings)');

  if (testFindings.length > 0) {
    log(`Stage 10 iteration ${reviewIter}: ${testFindings.length} test/coverage findings — re-running tdd-guide`);
    await agentWithRetry(
      `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
      `Inputs to read yourself:\n` +
      `  - requirements: ${req.doc_path}\n` +
      `  - bdd: ${bdd.doc_path}\n` +
      `  - specification: ${spec.specification_path}\n` +
      `  - plan: ${spec.plan_path}\n\n` +
      `Address ONLY the test/coverage findings below. Add missing tests, tighten assertions, ` +
      `do NOT touch production code. After your changes the test suite should be RED for any ` +
      `gap the reviewers flagged.\n\n${fixGuidance}\n` +
      `Findings flagged as test/coverage:\n` +
      testFindings.map(f => `  [${f.severity}] ${f.file}${f.line ? ':' + f.line : ''} — ${f.issue}`).join('\n'),
      {
        label: `tdd-guide:fix:${reviewIter}`,
        phase: 'Stage 10 — Code Review',
        agentType: 'super-dev:tdd-guide',
        schema: TDD_OUTPUT,
      },
    );
  }

  log(`Stage 10 iteration ${reviewIter}: re-running ${specialistAgent} with review findings`);
  await agentWithRetry(
    `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
    `Inputs to read yourself: ${spec.specification_path}, ${spec.plan_path}, ${spec.tasks_path}.\n` +
    `Apply the targeted fixes below — quote reviewers verbatim, do not paraphrase. After your ` +
    `changes ALL phase tests must remain green.\n\n${fixGuidance}`,
    {
      label: `${specialistAgent}:fix:${reviewIter}`,
      phase: 'Stage 10 — Code Review',
      agentType: specialistAgent,
      schema: IMPL_OUTPUT,
    },
  );

  log(`Stage 10 iteration ${reviewIter}: re-running qa-agent to verify fixes`);
  await agentWithRetry(
    `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
    `Inputs to read yourself: ${req.doc_path}, ${bdd.doc_path}, ${spec.specification_path}, ` +
    `${spec.plan_path}, ${spec.tasks_path}.\n\n` +
    // Same env-copy + dependency-install discipline as the Stage 9.5 qa prompt:
    // the Stage 10 fix specialist may have changed the dependency graph or
    // touched env-reading code, so both steps must re-run before tests.
    // All commands are idempotent — no-op when nothing changed.
    `Step 1 — Copy environment files from the main repo to the worktree. The worktree does ` +
    `NOT inherit .gitignore'd .env / .env.local / .env.test / etc. at ANY depth (monorepo ` +
    `apps/, services/, packages/, crates/, etc). Tests that need DB URLs / API keys / feature ` +
    `flags will fail with 'connection refused' or 'undefined env var' before the assertion ` +
    `phase. Run this recursive copy verbatim:\n` +
    `\`\`\`bash\n${ENV_COPY_RECIPE}\`\`\`\n` +
    `This walks the full main-repo tree, prunes vendored/build directories, and copies every ` +
    `.env / .env.* file (excluding *.example / *.template). Report copied files and any ` +
    `missing-env-var sanity-check failures verbatim in the QA report.\n\n` +
    `Step 2 — Install dependencies BEFORE any test. Detect package manager from manifest ` +
    `(pnpm-lock.yaml -> pnpm install --frozen-lockfile; yarn.lock -> yarn install --frozen-lockfile; ` +
    `package-lock.json -> npm ci; go.mod -> go mod download; Pipfile -> pipenv install --deploy; ` +
    `poetry.lock -> poetry install --no-interaction; requirements.txt -> pip install -r; ` +
    `Gemfile -> bundle install; composer.json -> composer install --no-interaction). Polyglot ` +
    `projects run each install in dependency-graph order. Report install / env-copy failures ` +
    `verbatim.\n\n` +
    `Step 3 — Run the build command and verify ALL tests pass with coverage thresholds met after ` +
    `the Stage 10 iteration fixes. Map every test back to AC-ID/SCENARIO-ID.`,
    {
      label: `qa-agent:fix:${reviewIter}`,
      phase: 'Stage 10 — Code Review',
      agentType: 'super-dev:qa-agent',
      schema: QA_OUTPUT,
    },
  );

  log(`Stage 10 iteration ${reviewIter}: fixes applied, looping back for re-review`);
}
log(`Stage 10 complete after ${reviewIter} iteration(s).`);
await updateTracking({
  stage: 10, status: 'complete', currentPhase: 'Stage 10 — Code Review',
  docs: [codeReview?.doc_path, advReview?.doc_path].filter(Boolean).map(p => p.split('/').pop()),
});

// ---------------------------------------------------------------------------
// Stage 11 — Documentation
//   Sequential: docs-executor -> doc-validator(gate-docs-drift) -> handoff-writer.
// ---------------------------------------------------------------------------
phase('Stage 11 — Documentation');
await updateTracking({ stage: 11, status: 'in_progress', currentPhase: 'Stage 11 — Documentation' });

// Stage 11 uses _gatedLoop: docs-executor + gate-docs-drift in parallel per iteration.
// Same pattern as Stages 2/6.5/7 — writer produces doc, gate validates, FAIL feeds errors back.
log('Stage 11: docs-executor + gate-docs-drift');
const docsGateLoop = await _gatedLoop({
  stage: 'Stage 11',
  gateName: 'gate-docs-drift',
  writerLabel: 'docs-executor',
  maxIters: 3,
  spawnWriter: (iter, guidance) => agentWithRetry(
    `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
    `Inputs to read yourself:\n` +
    `  - requirements: ${req.doc_path}\n` +
    `  - bdd: ${bdd.doc_path}\n` +
    `  - specification: ${spec.specification_path}\n` +
    `  - plan: ${spec.plan_path}\n` +
    `  - tasks: ${spec.tasks_path}\n` +
    (codeReview ? `  - code-review: ${codeReview.doc_path}\n` : '') +
    (advReview ? `  - adversarial-review: ${advReview.doc_path}\n` : '') +
    `Per-phase impl summaries: ${phaseResults.map(p => p.summary_doc).join(', ')}\n\n` +
    `Review EVERY document in the spec directory and update each to reflect the ACTUAL ` +
    `implementation that landed. Capture spec deviations discovered during ` +
    `implementation/review. Also update project-level docs (README, architecture, design) ` +
    `if they reference behavior the implementation changed.` + guidance,
    {
      label: iter === 1 ? 'docs-executor' : `docs-executor:fix:${iter}`,
      phase: 'Stage 11 — Documentation',
      agentType: 'super-dev:docs-executor',
      schema: DOCS_OUTPUT,
    },
  ),
  spawnGate: () => agentWithRetry(
    `Run ${shellQuote(PLUGIN_ROOT + '/scripts/gates/gate-docs-drift.sh')} ${shellQuote(SPEC_DIRECTORY)}. ` +
    `This gate verifies docs do not lag behind the implementation diff. Return the gate verdict.`,
    {
      label: 'doc-validator:gate-docs-drift',
      phase: 'Stage 11 — Documentation',
      agentType: 'super-dev:doc-validator',
      schema: GATE_VERDICT,
    },
  ),
});
log(`Stage 11 docs: gate-docs-drift PASS (${docsGateLoop.iterations} iteration${docsGateLoop.iterations === 1 ? '' : 's'}).`);

let handoff = null;
log('Stage 11: handoff-writer');
const handoffName = docName('handoff.md');
handoff = await agentWithRetry(
  `Worktree: ${WORKTREE_PATH}. Spec directory: ${SPEC_DIRECTORY}. Plugin root: ${PLUGIN_ROOT}.\n` +
  `Spec identifier: ${specMeta.spec_identifier}. Feature name: ${req.feature_name}.\n` +
  `Write a pointer-based handoff to ${shellQuote(SPEC_DIRECTORY + '/' + handoffName)} for the ` +
  `next AI agent session. Budget: under 300 lines. The next session will read Sections 2 ` +
  `(Progress), 4 (Unfinished Items), and 7 (Next Steps) first — those three sections must ` +
  `be 100% self-contained and actionable.`,
  {
    label: 'handoff-writer',
    phase: 'Stage 11 — Documentation',
    agentType: 'super-dev:handoff-writer',
    schema: HANDOFF_OUTPUT,
  },
);
log(`handoff-writer: ${handoff.lines} lines, ${(handoff.unfinished_items ?? []).length} unfinished item(s).`);
await updateTracking({
  stage: 11, status: 'complete', currentPhase: 'Stage 11 — Documentation',
  files: { created: [], modified: docsGateLoop.writer?.docs_updated || [], deleted: [] },
});

// ---------------------------------------------------------------------------
// Stage 12 — Cleanup
//   build-cleaner detects project type, scans for sensitive data (BLOCKING
//   on any finding), then removes build artifacts and dependency caches.
// ---------------------------------------------------------------------------
phase('Stage 12 — Cleanup');
await updateTracking({ stage: 12, status: 'in_progress', currentPhase: 'Stage 12 — Cleanup' });

log('Stage 12: build-cleaner (sensitive-data scan + artifact cleanup)');
const cleanup = await agentWithRetry(
  `Worktree: ${WORKTREE_PATH}. Plugin root: ${PLUGIN_ROOT}.\n` +
  `Scan the worktree for project languages/frameworks (Cargo.toml, package.json, ` +
  `go.mod, Pipfile, etc.). FIRST: pattern-match across the working tree for accidentally ` +
  `committed secrets (.env values, AWS keys, GOOGLE_API_KEY, private keys, JWTs, ` +
  `connection strings). If ANY are found, set blocked=true, list every finding, and do NOT ` +
  `execute cleanup. Otherwise run the appropriate clean commands and remove artifact dirs.`,
  {
    label: 'build-cleaner',
    phase: 'Stage 12 — Cleanup',
    agentType: 'super-dev:build-cleaner',
    schema: CLEANUP_OUTPUT,
  },
);
if (cleanup.blocked) {
  // Graceful degradation: log the findings as a prominent WARNING but don't
  // kill the workflow. The final return includes the findings so the user can
  // review before merging.
  log(`⚠️  Stage 12 WARNING: sensitive-data findings (${cleanup.sensitive_data_findings.length} item(s)):`);
  for (const f of cleanup.sensitive_data_findings) {
    log(`  ⚠️  ${f.kind} in ${f.file}${f.line ? ':' + f.line : ''}`);
  }
  log(`  Review and remove these from history before merging — they will leak to the default branch otherwise.`);
  log(`  Workflow continues but merge is NOT safe until these are resolved.`);
}
log(`Stage 12 complete: cleaned ${cleanup.directories_removed.length} dir(s); reclaimed ${cleanup.disk_reclaimed_bytes} bytes.`);
await updateTracking({
  stage: 12, status: 'complete', currentPhase: 'Stage 12 — Cleanup',
  files: { created: [], modified: [], deleted: cleanup.directories_removed || [] },
});

// ---------------------------------------------------------------------------
// Stage 13 — Trailing commit + merge instructions
//   13.1 commit any remaining changes in the worktree (docs/handoff often
//        land after the last per-phase commit; this captures them under a
//        single chore() commit).
//   13.2 print the manual merge command for the user to run.
// ---------------------------------------------------------------------------
phase('Stage 13 — Merge');
await updateTracking({ stage: 13, status: 'in_progress', currentPhase: 'Stage 13 — Merge' });

log('Stage 13.1: trailing commit (docs/handoff/cleanup)');
const trailingCommit = await agentWithRetry(
  `Run exactly:\n${commitTrailingSnippet(WORKTREE_PATH, `chore(${specMeta.spec_name}): finalise docs, handoff, cleanup`)}\n` +
  `Return JSON: {"new_sha": string, "skipped": boolean}.`,
  {
    label: 'stage-13:trailing-commit',
    phase: 'Stage 13 — Merge',
    agentType: 'general-purpose',
    schema: {
      type: 'object',
      required: ['new_sha'],
      properties: { new_sha: { type: 'string' }, skipped: { type: 'boolean' } },
    },
  },
);
log(`Stage 13.1: HEAD now ${trailingCommit.new_sha}${trailingCommit.skipped ? ' (no trailing changes)' : ''}`);

const mergeMessage = `Merge spec ${specMeta.spec_identifier}: ${req.feature_name}`;
log(`Stage 13.2: To merge manually, run:`);
log(`  cd ${REPO_PATH} && git checkout ${DEFAULT_BRANCH} && git pull --ff-only && \\`);
log(`    git merge --no-ff ${specMeta.spec_identifier} -m ${JSON.stringify(mergeMessage)}`);
await updateTracking({ stage: 13, status: 'complete', currentPhase: 'Stage 13 — Merge' });

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
  review: {
    code_review_doc: codeReview?.doc_path ?? null,
    code_review_verdict: codeReview?.verdict ?? null,
    adversarial_doc: advReview?.doc_path ?? null,
    adversarial_verdict: advReview?.verdict ?? null,
    iterations: reviewIter,
  },
  docs: {
    docs_updated: docsGateLoop.writer?.docs_updated ?? [],
    deviations_documented: docsGateLoop.writer?.deviations_documented ?? [],
  },
  handoff: handoff
    ? { doc: handoff.doc_path, lines: handoff.lines, unfinished_items: handoff.unfinished_items ?? [] }
    : null,
  cleanup: {
    languages: cleanup.languages_detected,
    directories_removed: cleanup.directories_removed ?? [],
    disk_reclaimed_bytes: cleanup.disk_reclaimed_bytes ?? 0,
    sensitive_data_blocked: Boolean(cleanup.blocked),
    sensitive_data_findings: cleanup.blocked ? cleanup.sensitive_data_findings : [],
  },
  trailing_commit: {
    new_sha: trailingCommit.new_sha,
    skipped: Boolean(trailingCommit.skipped),
  },
  merged: false,
  next_stage: null,
};

// ---------------------------------------------------------------------------
// Helpers — inlined here because the Workflow runtime forbids `import`
// before `export const meta`. Function declarations hoist within the
// runtime's implicit async wrapper, so call sites earlier in the file
// resolve correctly even though the definitions appear below.
//
// Each *Snippet function returns a Bash-ready string; the workflow body
// passes it to a tiny `general-purpose` subagent via agent() so the
// command output is auditable in the run journal.
// ---------------------------------------------------------------------------

// ----- Gated writer fix-loops -------------------------------------------------
//
// Three helpers — one per gate-family — give Stages 2A/2B, 6.5, and 7 the
// same format-fix recovery the Stage 8 spec-review loop already has. Pattern:
// writer + doc-validator(gate) in parallel(); on gate FAIL, compose the gate's
// errors as targeted guidance, re-spawn the writer, re-run the gate, cap at
// max iterations. Each helper is named after the gate family it serves so
// its call site reads as a direct verb.
//
// All three share the same underlying shape; they differ only in:
//   - which writer agent the loop re-spawns
//   - whether the writer's structured return can short-circuit the loop
//     (Stage 6.5's PROTOTYPE_FAILED is empirical, can't be format-fixed)
//   - what the gate inspects (single file vs. spec directory)
//
// A single `_gatedLoop` private routine implements the shared mechanics so
// each named helper stays a thin, readable wrapper.

async function _gatedLoop({ stage, gateName, writerLabel, maxIters, isPivotFailure, spawnWriter, spawnGate }) {
  let iter = 0;
  let writer = null;
  let verdict = null;
  while (iter < maxIters) {
    iter += 1;
    log(`${stage}: ${writerLabel} + doc-validator(${gateName}) — iteration ${iter}/${maxIters}`);
    const guidance = (iter === 1 || !verdict?.errors?.length)
      ? ''
      : `\n--- ${gateName} feedback from iteration ${iter - 1} ---\n` +
        verdict.errors.map(e => `  - ${e}`).join('\n') +
        `\nAddress every item above. Do not paraphrase the gate output — fix the literal issues it cited.`;
    [writer, verdict] = await parallel([
      () => spawnWriter(iter, guidance),
      () => spawnGate(),
    ]);
    if (isPivotFailure && writer && isPivotFailure(writer)) {
      return { writer, verdict, iterations: iter, pivot: true };
    }
    if (verdict?.pass) {
      return { writer, verdict, iterations: iter, pivot: false };
    }
    log(`${stage}: ${gateName} FAIL on iteration ${iter}` + (iter < maxIters ? ' — re-spawning writer with findings' : ''));
  }
  throw new Error(
    `${stage}: ${gateName} still failing after ${maxIters} iteration(s). Escalating to user.\n` +
    `Last gate errors:\n${(verdict?.errors || []).map(e => `  - ${e}`).join('\n') || '  (none reported)'}`
  );
}

/**
 * Stage 2 writer+gate loop. Used for BOTH Stage 2A (requirements-clarifier
 * + gate-requirements) and Stage 2B (bdd-scenario-writer + gate-bdd) because
 * those stages share the same shape: one writer produces one document, one
 * gate checks that single file. The caller passes the writer/gate spawners
 * and the helper handles the iteration.
 */
async function gatedStage2WriterLoop(opts) {
  return _gatedLoop(opts);
}

/**
 * Stage 6.5 prototype+gate loop. Differs from Stage 2 only in that
 * `isPivotFailure` is wired to short-circuit on PROTOTYPE_FAILED (empirical
 * failure of the constants themselves, not a document-format issue). When
 * pivot=true is returned, the caller throws PIVOT_REQUIRED with stage-
 * specific context — re-spawning prototype-runner cannot change physics.
 */
async function gatedPrototypeLoop(opts) {
  return _gatedLoop({ ...opts, isPivotFailure: (w) => w?.verdict === 'PROTOTYPE_FAILED' });
}

/**
 * Stage 7 spec-writer + gate-spec-trace loop. The writer produces three docs
 * (specification / implementation-plan / task-list) in one invocation; the
 * gate inspects the whole spec directory rather than a single file. Same
 * loop shape as Stage 2 — the multi-doc + directory-scope concern is
 * encoded in the spawnWriter/spawnGate closures the caller provides.
 */
async function gatedSpecTraceLoop(opts) {
  return _gatedLoop(opts);
}

// ----- Stage 7 disk recovery -------------------------------------------------
//
// Spec-writer occasionally completes its work (writes the three docs to
// disk) but its structured return value is lost before reaching the
// Workflow runtime — observed when the API connection drops in the gap
// between final tool-call and the writer's response message. The Stage 7
// closure inspects the return and, on null/incomplete, calls this helper
// to synthesize SpecOutput from the on-disk artifacts so the workflow
// doesn't burn 70+ minutes re-running the writer for files that already
// exist.
//
// Implementation note: the Workflow runtime doesn't expose Node's fs to
// script code (the script runs in an isolated environment), so the
// existence + phase-count probe is delegated to a tiny general-purpose
// subagent. The agent's only job is to check three files and count
// "## Phase N:" headings in the plan — fast and cheap (~seconds).

/**
 * Probe disk for the three spec-writer outputs. Returns a SpecOutput-
 * shaped object on success, null if any of the three files is missing.
 * phase_count is parsed from "## Phase N:" headings in the plan; if no
 * matches are found we fall back to 1 (the workflow body will surface a
 * gate-spec-trace failure if the plan really has zero phases).
 */
async function _recoverSpecFromDisk(specDirectory, specName, planName, tasksName) {
  const result = await agentWithRetry(
    `Read these three files from disk and report metadata. Do NOT modify them.\n` +
    `  spec:  ${shellQuote(specDirectory + '/' + specName)}\n` +
    `  plan:  ${shellQuote(specDirectory + '/' + planName)}\n` +
    `  tasks: ${shellQuote(specDirectory + '/' + tasksName)}\n\n` +
    `For each file, check if it exists with bytes > 0. If all three exist, ` +
    `count the number of lines in the plan that match the regex ` +
    `'^## Phase \\d+' (multiline, case-sensitive). Return JSON: ` +
    `{"all_present": bool, "phase_count": int}. If any file is missing or ` +
    `empty, set all_present=false and phase_count=0.`,
    {
      label: 'spec-disk-recovery',
      phase: 'Stage 7 — Specification',
      agentType: 'general-purpose',
      schema: {
        type: 'object',
        required: ['all_present', 'phase_count'],
        additionalProperties: false,
        properties: {
          all_present: { type: 'boolean' },
          phase_count: { type: 'integer', minimum: 0 },
        },
      },
    },
  );
  if (!result || !result.all_present) return null;
  return {
    specification_path: `${specDirectory}/${specName}`,
    plan_path: `${specDirectory}/${planName}`,
    tasks_path: `${specDirectory}/${tasksName}`,
    phase_count: result.phase_count > 0 ? result.phase_count : 1,
  };
}

// ----- Git shell-snippet helpers ---------------------------------------------

/** Detect the repo's default branch from origin/HEAD (never hard-codes `main`). */
function detectDefaultBranchSnippet(repoPath) {
  return `set -e
cd ${shellQuote(repoPath)}
ref="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || true)"
if [ -z "$ref" ]; then
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
function pullLatestSnippet(repoPath, defaultBranch) {
  return `set -e
cd ${shellQuote(repoPath)}
# Fetch without --quiet so network errors surface verbatim in the captured
# stderr. Same reason --quiet is dropped from checkout/pull below.
git fetch origin
# Stage 1's dirty-tree check ignores untracked files: the user's repo
# routinely has scratch files, logs, IDE caches, and build outputs that
# are .gitignore-d but show as untracked. Those do not block an ff-only
# pull (git happily fast-forwards over them) and refusing on their
# account is a usability footgun. Stage 13's merge check (in
# mergeSpecBranchSnippet) keeps the stricter rule because the merge
# resolution itself can interact badly with stray untracked files.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "ERROR: working tree has uncommitted changes — refusing to pull" >&2
  echo "Resolve manually: stash, commit, or discard before retrying." >&2
  exit 2
fi
if ! git symbolic-ref -q HEAD >/dev/null; then
  echo "ERROR: HEAD is detached — checkout ${shellQuote(defaultBranch)} manually before retrying" >&2
  exit 2
fi
git checkout ${shellQuote(defaultBranch)}
# --ff-only fails loudly on local divergence; the caller captures both
# stdout and stderr from this shell so the rejection message reaches the
# error path regardless of which channel git uses.
git pull --ff-only origin ${shellQuote(defaultBranch)}
`;
}

/** Create the spec worktree and emit the absolute path on stdout. */
function worktreeAddSnippet(repoPath, specIdentifier) {
  return `set -e
cd ${shellQuote(repoPath)}
git worktree add ${shellQuote('.worktree/' + specIdentifier)} -b ${shellQuote(specIdentifier)}
cd ${shellQuote('.worktree/' + specIdentifier)}
pwd
`;
}

/** Capture HEAD inside a worktree. Used as per-phase base_sha. */
function captureHeadSnippet(worktreePath) {
  return `set -e
cd ${shellQuote(worktreePath)}
git rev-parse HEAD
`;
}

/**
 * Commit all changes in a worktree under a Conventional-Commits message,
 * then emit the new HEAD SHA on stdout. Skips cleanly with the prior HEAD
 * when there is nothing to commit (e.g. tdd-guide only updated specs that
 * were already staged, or specialist made no source changes). This keeps
 * base_sha advancing without empty commits.
 */
function commitPhaseSnippet(worktreePath, message) {
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

/** Alias of commitPhaseSnippet; used at Stage 13 to capture trailing docs/handoff. */
function commitTrailingSnippet(worktreePath, message) {
  return commitPhaseSnippet(worktreePath, message);
}

/**
 * Merge the spec branch into the default branch in the MAIN repo (NOT
 * inside the worktree). Sequence: fetch -> checkout <default> -> pull
 * --ff-only -> merge --no-ff <spec-branch>. Refuses on dirty tree,
 * detached HEAD, or non-fast-forward pull. Auto-rebase / force-merge /
 * unilateral stash are forbidden — same discipline as Stage 1.
 */
function mergeSpecBranchSnippet(repoPath, defaultBranch, specBranch, message) {
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

/** Single-quote a string for safe shell interpolation; escapes embedded single quotes. */
function shellQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}
