/**
 * Gate Definitions — all spec-file quality gates expressed as declarative data.
 *
 * Each gate is validated against the corresponding .j2 template to ensure the
 * patterns match what the agents actually produce. Comments document the
 * template evidence.
 *
 * Pattern design principles:
 *  1. Case-insensitive by default (agents may vary capitalization)
 *  2. Anchored where possible (^/$ or word boundaries \b)
 *  3. Tolerant of markdown formatting (bold **, bullet -, numbered list)
 *  4. Multi-line flag (m) for line-start anchors
 *  5. No backtracking traps (no nested quantifiers)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { findSpecFile } from '../lib/fs.mjs';

// ============================================================================
// GATE: Requirements Completeness
// Template: templates/requirements.md.j2
// ============================================================================
export const requirements = {
  name: 'Requirements Completeness',
  file: '*-requirements.md',
  checks: [
    {
      // Template has: "## Acceptance Criteria"
      desc: 'Has acceptance criteria section',
      pattern: /acceptance\s+criteria/i,
      min: 1,
    },
    {
      // Template uses: "- **AC-01**:", "- **AC-02**:", "- **AC-03**:"
      // Also matches "AC-01" in traceability sections of other docs
      desc: 'Has ≥2 acceptance criteria items',
      pattern: /AC-\d+/g,
      min: 2,
    },
    {
      // Template has: "## Non-Functional Requirements" with sub-items:
      // "- **Performance**", "- **Security**", "- **Accessibility**"
      desc: 'Has non-functional requirements',
      pattern: /non-functional|performance|security|accessibility/i,
      min: 1,
    },
    {
      // Template has: "## Executive Summary"
      desc: 'Has executive summary',
      pattern: /executive\s+summary|summary/i,
      min: 1,
    },
    {
      // Must be more than a template stub
      desc: 'Not just a template',
      minSize: 500,
    },
  ],
};

// ============================================================================
// GATE: BDD Scenario Quality
// Template: templates/bdd-scenarios.md.j2
// ============================================================================
export const bdd = {
  name: 'BDD Scenario Quality',
  file: '*-bdd-scenarios.md',
  checks: [
    {
      // Template uses: "### SCENARIO-001:", "### SCENARIO-002:", etc.
      desc: 'Has SCENARIO-IDs',
      pattern: /SCENARIO-\d+/g,
      min: 1,
    },
    {
      // Template uses: "**Given** [precondition]", "**When** [trigger]",
      // "**Then** [outcome]", "**And** [additional]"
      // Also supports: "- Given", "* Given", "  - **Given**"
      desc: 'Has Given/When/Then structure',
      pattern: /^\s*(?:[-*]\s+)?\*{0,2}(?:given|when|then|and)\b/im,
      min: 3,
    },
    {
      // Template uses: "- **Acceptance Criteria**: AC-01"
      // and "- **AC-01**: [description] → SCENARIO-001"
      desc: 'Has AC references for traceability',
      pattern: /AC-\d+/g,
      min: 1,
    },
    {
      // Must be more than a stub
      desc: 'Not just a template',
      minSize: 300,
    },
  ],
  crossChecks: [
    {
      // Template "Coverage Summary" section states "Covered by Scenarios: [number — must equal total]"
      // Gate: scenario count >= AC count from requirements
      refPattern: '*-requirements.md',
      desc: 'Scenario count ≥ acceptance criteria count',
      fn: (bddContent, reqContent) => {
        const scenarios = (bddContent.match(/SCENARIO-\d+/g) || []);
        const scenarioIds = [...new Set(scenarios)].length;
        const acCount = (reqContent.match(/AC-\d+/g) || []);
        const acIds = [...new Set(acCount)].length;
        const pass = scenarioIds >= acIds;
        return {
          desc: `Scenarios (${scenarioIds}) ≥ acceptance criteria (${acIds})`,
          pass,
          detail: pass ? undefined : `Need at least ${acIds} unique scenarios, found ${scenarioIds}`,
        };
      },
    },
  ],
};

// ============================================================================
// GATE: Specification Quality
// Template: templates/specification.md.j2
// Gate script: gate-specification.sh
// ============================================================================
export const specification = {
  name: 'Specification Quality',
  file: '*-specification.md',
  checks: [
    {
      // Template section "### 6.4. BDD Scenario References" uses:
      // "- **SCENARIO-001** — [unit|integration|e2e] — [Covered|Partial]"
      desc: 'Has BDD scenario references',
      pattern: /SCENARIO-\d+/g,
      min: 1,
    },
    {
      // Template has entire "## 6. Testing Strategy" section with subsections:
      // "Unit Tests", "Integration Tests", "E2E Tests"
      desc: 'Has testing strategy',
      pattern: /testing\s+strategy|test\s+plan|test\s+approach|test\s+coverage|unit\s+test|integration\s+test|e2e\s+test/i,
      min: 1,
    },
    {
      // Template has "## 2. Architecture" section
      desc: 'Has architecture content',
      pattern: /architecture|system\s+design|component/i,
      min: 1,
    },
    {
      // Must be substantial
      desc: 'Not just a stub',
      minSize: 500,
    },
  ],
};

// ============================================================================
// GATE: Implementation Plan Quality
// Template: templates/implementation-plan.md.j2
// ============================================================================
export const implementationPlan = {
  name: 'Implementation Plan Quality',
  file: '*-implementation-plan.md',
  checks: [
    {
      // Template uses: "## Phase 1: [Phase Name]", "## Phase 2: ..."
      // Also matches: "Phase 1:" in phase summary list
      // Must handle both "## Phase N:" headings and inline "Phase N:" references
      desc: 'Has Phase headings',
      pattern: /(?:^##\s+)?Phase\s+\d+\s*:/im,
      min: 1,
    },
    {
      // Template uses: "- **Domain**: [frontend|backend|infrastructure|testing|docs]"
      desc: 'Has domain information',
      pattern: /domain|rust|go|frontend|backend|mixed|infrastructure/i,
      min: 1,
    },
    {
      // Template uses: "- **Effort**: [small|medium|large]"
      // and "- **Estimated Effort**: [total effort estimate]"
      desc: 'Has effort estimates',
      pattern: /effort|timeline|days|hours|weeks|sprint/i,
      min: 1,
    },
    {
      // Must be substantial
      desc: 'Plan has substance',
      minSize: 300,
    },
  ],
};

// ============================================================================
// GATE: Task List Quality
// Template: templates/task-list.md.j2
// ============================================================================
export const taskList = {
  name: 'Task List Quality',
  file: '*-task-list.md',
  checks: [
    {
      // Template uses: "- [ ] **T-01**: [task description]"
      // Also matches numbered lists: "1. [task]"
      desc: 'Has task items',
      pattern: /^\s*(?:-\s*\[[\sx]\]|\d+\.)\s/m,
      min: 1,
    },
    {
      // Template uses: "## Phase 1: [Phase Name]" and "**Milestone**:"
      desc: 'References phases or milestones',
      pattern: /phase|milestone|stage/i,
      min: 1,
    },
    {
      // Must be substantial
      desc: 'Task list has substance',
      minSize: 200,
    },
  ],
};

// ============================================================================
// GATE: Specification Review Quality
// Template: templates/spec-review.md.j2
// ============================================================================
export const specReview = {
  name: 'Specification Review Quality',
  file: '*-spec-review*.md',
  checks: [
    {
      // Template uses: "## Verdict: [APPROVED|REVISIONS NEEDED|REJECTED]"
      // and "- **Status**: [APPROVED|REVISIONS NEEDED|REJECTED]"
      desc: 'Has verdict text',
      pattern: /\b(?:APPROVED|REVISIONS\s+NEEDED|REJECTED)\b/i,
      min: 1,
    },
    {
      // Template has 8 dimension sections: D1-D8
      // "### D1: Completeness", "### D2: Consistency", etc.
      // Gate checks each keyword appears at least once
      desc: 'Has all 8 review dimensions',
      fn: (content) => {
        const dimensions = [
          'Completeness', 'Consistency', 'Feasibility', 'Testability',
          'Traceability', 'Grounding', 'Complexity', 'Ambiguity',
        ];
        const found = dimensions.filter(d => new RegExp(d, 'i').test(content));
        const pass = found.length >= 8;
        return {
          desc: `All 8 review dimensions present (found: ${found.length}/8)`,
          pass,
          detail: pass ? undefined : `Missing: ${dimensions.filter(d => !found.includes(d)).join(', ')}`,
        };
      },
    },
    {
      // Template "### D6: Grounding" section uses:
      // "- `[file/function]` — [confirmed|not found]"
      desc: 'Grounding section has verification results',
      pattern: /\b(?:verified|exists|not\s+found|hallucinated|confirmed|grounding)\b/i,
      min: 1,
    },
    {
      // Template "## Finding Summary" uses: "- Critical: [N]", "- High: [N]"
      desc: 'Has finding severity summary',
      pattern: /\b(?:Critical|High|Medium|Low|finding)\b/i,
      min: 1,
    },
  ],
};

// ============================================================================
// GATE: Code Review Structure
// Template: templates/code-review.md.j2
// ============================================================================
export const codeReview = {
  name: 'Code Review Structure',
  file: '*code-review*.md',
  checks: [
    {
      // Template uses: "## Verdict: [Approved|Changes Requested|Blocked]"
      // Case-insensitive with word boundaries
      desc: 'Has parseable verdict',
      pattern: /\b(?:approved|changes\s+requested|blocked)\b/i,
      min: 1,
    },
  ],
};

// ============================================================================
// GATE: Adversarial Review Structure
// Template: templates/adversarial-review.md.j2
// ============================================================================
export const adversarialReview = {
  name: 'Adversarial Review Structure',
  file: '*adversarial*.md',
  checks: [
    {
      // Template uses: "## Verdict: [PASS|CONTEST|REJECT]"
      // These are always uppercase in the template
      desc: 'Has parseable verdict',
      pattern: /\b(?:PASS|CONTEST|REJECT)\b/,
      min: 1,
    },
  ],
};

// ============================================================================
// GATE: Implementation Summary Quality
// Template: templates/implementation-summary.md.j2
// ============================================================================
export const implementationSummary = {
  name: 'Implementation Summary Quality',
  file: '*-implementation-summary*.md',
  checks: [
    {
      // Template has: "## Files Changed" section with entries like:
      // "- `[path/to/file]` — [created|modified|deleted], +[N]/-[N]"
      desc: 'Has files changed information',
      pattern: /files?\s+changed|file.*action|created|modified|deleted/i,
      min: 1,
    },
    {
      // Template gate comment: "Do NOT use TODO/FIXME/TBD markers"
      // Allow up to 3 (inherited from gate-implementation-summary.sh)
      desc: 'No excessive placeholders',
      fn: (content) => {
        const matches = content.match(/\b(?:TODO|FIXME|TBD|PLACEHOLDER)\b|\[INSERT[\s\]]/gi);
        const count = matches ? matches.length : 0;
        return {
          desc: `No excessive placeholders (found: ${count}, max: 3)`,
          pass: count <= 3,
          detail: count > 3 ? `Found ${count} placeholder markers, max allowed is 3` : undefined,
        };
      },
    },
    {
      // Template has: "## Test Results" section with:
      // "- **Unit Tests**: [N pass]/[N total] passing"
      desc: 'Has test results',
      pattern: /\btest|passing|pass|fail\b/i,
      min: 1,
    },
    {
      // Must be substantial
      desc: 'Summary has substance',
      minSize: 300,
    },
  ],
};

// ============================================================================
// GATE: Spec-to-BDD Traceability
// Template: templates/specification.md.j2 (spec must ref scenarios)
// ============================================================================
export const specTrace = {
  name: 'Spec-to-BDD Traceability',
  file: '*-specification.md',
  checks: [
    {
      // Template section 6.4: "- **SCENARIO-001** — [type] — [status]"
      desc: 'Spec references BDD scenarios',
      pattern: /SCENARIO-\d+/g,
      min: 1,
    },
    {
      // Same as specification gate — testing strategy must exist
      desc: 'Spec includes testing strategy',
      pattern: /testing\s+strategy|test\s+plan|test\s+approach|test\s+coverage|unit\s+test|integration\s+test|e2e\s+test|testing|tests/i,
      min: 1,
    },
  ],
  // Additional file-existence checks (non-content)
  fileChecks: [
    { pattern: '*-task-list.md', desc: 'Task list file exists' },
    { pattern: '*-implementation-plan.md', desc: 'Implementation plan file exists' },
  ],
};

// ============================================================================
// GATE: Documentation Completeness (docs-drift)
// Checks multiple files + placeholder scan across all spec .md files
// ============================================================================
export const docsDrift = {
  name: 'Documentation Completeness',
  file: null, // No single file — operates on the spec directory
  checks: [], // Custom execution via dirChecks
  dirChecks: {
    requiredFiles: [
      { pattern: '*-specification.md', desc: 'Specification exists' },
      { pattern: '*-implementation-plan.md', desc: 'Implementation plan exists' },
      { pattern: '*-task-list.md', desc: 'Task list exists' },
      { pattern: '*-implementation-summary*.md', desc: 'Implementation summary exists' },
    ],
    placeholderScan: {
      desc: 'No excessive placeholders across spec docs',
      pattern: /\b(?:TODO|FIXME|TBD|PLACEHOLDER)\b|\[INSERT[\s\]]/gi,
      maxTotal: 3,
    },
    trackingJson: {
      pattern: '*-workflow-tracking.json',
      desc: 'Workflow tracking JSON exists and is valid',
    },
  },
};

// ============================================================================
// GATE: Implementation Completeness
// Checks implementation plan phases vs workflow-tracking.json
// ============================================================================
export const implementationComplete = {
  name: 'Implementation Completeness',
  file: '*-implementation-plan.md',
  checks: [
    {
      desc: 'Implementation plan exists',
      // This is a pseudo-check — if file was not found, the engine already fails
      fn: () => ({ desc: 'Implementation plan exists', pass: true }),
    },
    {
      // Count "## Phase N:" headings
      desc: 'Plan has phases',
      pattern: /(?:^##\s+)?Phase\s+\d+\s*(?::|.*Objective)/im,
      min: 1,
    },
  ],
  // Custom post-checks requiring workflow-tracking.json
  trackingChecks: true,
};

// ============================================================================
// GATE: Handoff AC Coverage Assessment (conditional)
// Template: reference/handoff-template.md + agents/handoff-writer.md step 2.5
// ============================================================================
export const handoff = {
  name: 'Handoff AC Coverage Assessment',
  file: '*-handoff.md',
  // This gate is conditional — only enforces AC Coverage if pivot/iteration detected
  conditional: true,
  checks: [
    {
      // Always check: handoff file exists (handled by engine)
      fn: () => ({ desc: 'Handoff file exists', pass: true }),
    },
  ],
  conditionalChecks: {
    // Condition: iteration.loops > 0 OR implementationPhases.length > 1 OR pivot artifacts
    trigger: 'pivotOrIteration',
    checks: [
      {
        // Agent step 2.5: "## AC Coverage Assessment"
        desc: 'AC Coverage Assessment section present',
        pattern: /^#+\s*AC\s+Coverage\s+Assessment/im,
        min: 1,
      },
      {
        // Agent: "**ACs met as planned**"
        desc: 'ACs met as planned subsection',
        pattern: /met\s+as\s+planned/i,
        min: 1,
      },
      {
        // Agent: "**ACs met by alternative mechanism**"
        desc: 'ACs met by alternative mechanism subsection',
        pattern: /met\s+by\s+alternative|alternative\s+mechanism/i,
        min: 1,
      },
      {
        // Agent: "**ACs superseded**"
        desc: 'ACs superseded subsection',
        pattern: /\bsuperseded\b/i,
        min: 1,
      },
      {
        // At least one AC-ID referenced (not empty placeholder)
        desc: 'At least one AC-ID referenced',
        pattern: /AC-\d+/g,
        min: 1,
      },
    ],
  },
};

// ============================================================================
// GATE: Prototype Report
// Template: reference/prototype-report-template.md
// ============================================================================
export const prototype = {
  name: 'Empirical Prototype Report',
  file: '*-prototype-report.md',
  // Allows skip via .prototype-skipped marker
  skipMarker: '.prototype-skipped',
  checks: [
    {
      // Template: "## Constants Under Test"
      desc: 'Report has Constants section',
      pattern: /constants?\s+under\s+test|##\s+constants/i,
      min: 1,
    },
    {
      // Template: "## Measurement Results"
      desc: 'Report has Measurement Results section',
      pattern: /\b(?:measurement|measured|results)\b|##\s+results/i,
      min: 1,
    },
    {
      // Template: "## Overall Verdict: {{ PASS | PASS-WITH-CAVEATS | FAIL }}"
      desc: 'Report has overall verdict',
      pattern: /\b(?:verdict)\b|##\s+(?:overall\s+)?verdict/i,
      min: 1,
    },
    {
      // Template: "## Recommendation" — one of proceed/caveats/pivot
      desc: 'Report has recommendation',
      pattern: /\brecommendation\b|##\s+recommendation/i,
      min: 1,
    },
    {
      // Template: "Location: `{{ spec_directory }}/prototype/`"
      desc: 'Report references prototype source location',
      pattern: /prototype\/|prototype\s+directory|prototype\s+source/i,
      min: 1,
    },
  ],
  // Additional: prototype/ directory must exist with files
  dirCheck: {
    subdir: 'prototype',
    desc: 'prototype/ directory has files',
    minFiles: 1,
  },
  // If verdict is FAIL, recommendation must mention pivot-protocol
  conditionalOnContent: {
    trigger: /verdict.*FAIL/i,
    checks: [
      {
        desc: 'FAIL verdict references pivot-protocol',
        pattern: /pivot[\s.-]*protocol|invoke\s+pivot/i,
        min: 1,
      },
    ],
  },
};

// ============================================================================
// GATE: Visual Verification Artifacts
// Pairs with agents/visual-verifier.md
// ============================================================================
export const visual = {
  name: 'Visual Verification Artifacts',
  file: '*-visual-report.md',
  // Check for artifacts/ directory and .non-visual skip marker
  artifactsDir: 'artifacts',
  skipMarker: 'artifacts/.non-visual',
  checks: [
    {
      // Report must mention tier choice (Tier 1/2/3)
      desc: 'Report documents tier choice',
      pattern: /tier\s*[123]|tier-?[123]/i,
      min: 1,
    },
    {
      // Report must include reviewer instructions
      desc: 'Report includes reviewer instructions',
      pattern: /\b(?:reviewer|read.*artifact|inspect)\b/i,
      min: 1,
    },
  ],
  artifactCheck: {
    extensions: ['.png', '.jpg', '.webp', '.snapshot'],
    desc: 'At least one render artifact present',
    minFiles: 1,
  },
};

// ============================================================================
// GATE: Review Document Structure (unified for code + adversarial)
// Used by gate-review.sh with --type flag
// ============================================================================
export const review = {
  code: codeReview,
  adversarial: adversarialReview,
};

// ============================================================================
// GATE: API Test Report
// Template: templates/api-test-report.md.njk
// ============================================================================
export const apiTests = {
  name: 'API Test Report',
  file: '*api-test-report*.md',
  checks: [
    {
      // Template uses: "- **Verdict**: {{ verdict }}"
      // and heading "## Summary" with pass/fail counts
      desc: 'Has verdict text',
      pattern: /\b(?:PASS|FAIL)\b/,
      min: 1,
    },
    {
      // Template uses: "| Pass Rate | {{ summary.pass_rate }}% |"
      desc: 'Has pass rate metric',
      pattern: /pass\s*rate/i,
      min: 1,
    },
    {
      // Template uses: API-NNN IDs in "### API-001: POST /v1/users"
      desc: 'Has API test IDs',
      pattern: /API-\d{3}/g,
      min: 1,
    },
    {
      // Template uses: "| CRUD | N | N | N |" etc.
      desc: 'Has category breakdown',
      pattern: /\b(?:CRUD|Validation|Auth|Error|Edge)\b/i,
      min: 1,
    },
    {
      // Template has "## Gate Criteria" with checkboxes
      desc: 'Has gate criteria section',
      pattern: /gate\s*criteria/i,
      min: 1,
    },
    {
      // Must be substantial
      desc: 'Report has substance',
      minSize: 300,
    },
  ],
};

// ============================================================================
// GATE: E2E Test Report
// Template: templates/e2e-report.md.njk
// ============================================================================
export const e2eReport = {
  name: 'E2E Test Report',
  file: '*e2e-report*.md',
  checks: [
    {
      // Template uses: "- **Verdict**: {{ verdict }}"
      desc: 'Has verdict text',
      pattern: /\b(?:PASS|FAIL|BLOCKED)\b/,
      min: 1,
    },
    {
      // Template uses SCENARIO-NNN IDs in results table
      desc: 'Has BDD scenario references',
      pattern: /SCENARIO-\d{3}/g,
      min: 1,
    },
    {
      // Template uses browser names in summary and results
      desc: 'Has browser results',
      pattern: /\b(?:chromium|firefox|webkit)\b/i,
      min: 1,
    },
    {
      // Template has "## Gate Criteria" with checkboxes
      desc: 'Has gate criteria section',
      pattern: /gate\s*criteria/i,
      min: 1,
    },
    {
      // Must be substantial
      desc: 'Report has substance',
      minSize: 300,
    },
  ],
};

// ============================================================================
// Export all gates as a map for the runner
// ============================================================================
export const gates = {
  requirements,
  bdd,
  specification,
  'implementation-plan': implementationPlan,
  'task-list': taskList,
  'spec-review': specReview,
  'code-review': codeReview,
  'adversarial-review': adversarialReview,
  'implementation-summary': implementationSummary,
  'spec-trace': specTrace,
  'docs-drift': docsDrift,
  'implementation-complete': implementationComplete,
  handoff,
  prototype,
  visual,
  'api-tests': apiTests,
  'e2e-report': e2eReport,
};
