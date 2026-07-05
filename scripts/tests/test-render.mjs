#!/usr/bin/env node
/**
 * End-to-end test: template engine + schema validator + render.mjs CLI.
 *
 * Verifies:
 *   1. Template engine renders BDD + Requirements templates correctly
 *   2. Schema validator catches missing/invalid fields
 *   3. Rendered output passes gate definitions (regex checks)
 *   4. CLI render.mjs works with real files
 *
 * Run: node scripts/tests/test-render.mjs
 */

import { render } from '../lib/template-engine.mjs';
import { validateJson } from '../lib/schema-validator.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function assertThrows(fn, msg) {
  try { fn(); assert(false, msg + ' (should have thrown)'); }
  catch { assert(true, msg); }
}

// =============================================================================
// TEST: Template Engine — BDD Scenarios
// =============================================================================
console.log('\n━━━ Template Engine: BDD Scenarios ━━━');

const bddTemplate = readFileSync(join(ROOT, 'templates/bdd-scenarios.md.njk'), 'utf8');
const bddData = {
  feature_name: 'User Authentication',
  date: '2026-07-05',
  source_filename: '01-requirements.md',
  features: [
    {
      name: 'Login Flow',
      scenarios: [
        {
          id: '001',
          title: 'Successful login with valid credentials',
          ac_ref: 'AC-01',
          priority: 'high',
          given: 'a registered user with valid credentials exists in the system',
          when: 'the user submits their email and password on the login form',
          then: 'the system authenticates and redirects to the dashboard',
          and_clauses: ['a session token is stored in secure cookie'],
        },
        {
          id: '002',
          title: 'Failed login with invalid password',
          ac_ref: 'AC-01',
          priority: 'high',
          given: 'a registered user attempts login with wrong password',
          when: 'the user submits their email with an incorrect password',
          then: 'the system displays an authentication error message',
          and_clauses: [],
        },
      ],
    },
    {
      name: 'Session Management',
      scenarios: [
        {
          id: '003',
          title: 'Session expires after inactivity timeout',
          ac_ref: 'AC-02',
          priority: 'medium',
          given: 'a user is logged in but has been inactive for 30 minutes',
          when: 'the user attempts any authenticated action after timeout',
          then: 'the system invalidates the session and redirects to login',
        },
      ],
    },
  ],
  scenarios: [{ id: '001' }, { id: '002' }, { id: '003' }],
  traceability: [
    { ac_id: 'AC-01', description: 'Users can log in with email/password', scenarios: ['SCENARIO-001', 'SCENARIO-002'] },
    { ac_id: 'AC-02', description: 'Sessions expire after inactivity', scenarios: ['SCENARIO-003'] },
  ],
};

const bddOutput = render(bddTemplate, bddData);

assert(bddOutput.includes('# Behavior Scenarios: User Authentication'), 'Has heading');
assert(bddOutput.includes('SCENARIO-001:'), 'Has SCENARIO-001 ID');
assert(bddOutput.includes('SCENARIO-002:'), 'Has SCENARIO-002 ID');
assert(bddOutput.includes('SCENARIO-003:'), 'Has SCENARIO-003 ID');
assert(bddOutput.includes('**Given**'), 'Has Given keyword');
assert(bddOutput.includes('**When**'), 'Has When keyword');
assert(bddOutput.includes('**Then**'), 'Has Then keyword');
assert(bddOutput.includes('**And**'), 'Has And keyword');
assert(bddOutput.includes('AC-01'), 'Has AC-01 reference');
assert(bddOutput.includes('AC-02'), 'Has AC-02 reference');
assert(bddOutput.includes('**Total Scenarios**: 3'), 'Has total scenarios count');
assert(bddOutput.includes('**Total Acceptance Criteria**: 2'), 'Traceability count correct');
assert(bddOutput.length > 300, `Content exceeds minSize (${bddOutput.length} > 300)`);

// Verify gate patterns from definitions.mjs
assert(/SCENARIO-\d+/.test(bddOutput), 'Gate: SCENARIO-ID pattern');
assert((/^\s*(?:[-*]\s+)?\*{0,2}(?:given|when|then|and)\b/im).test(bddOutput), 'Gate: GWT pattern');
assert(/AC-\d+/g.test(bddOutput), 'Gate: AC reference pattern');

// =============================================================================
// TEST: Template Engine — Requirements
// =============================================================================
console.log('\n━━━ Template Engine: Requirements ━━━');

const reqTemplate = readFileSync(join(ROOT, 'templates/requirements.md.njk'), 'utf8');
const reqData = {
  title: 'Template Rendering Pipeline',
  date: '2026-07-05',
  type: 'feature',
  priority: 'high',
  executive_summary: 'Replace LLM-as-renderer pattern with deterministic template rendering to eliminate gate format failures and reduce iteration loops from 1-3 to zero.',
  surface_request: 'The user wants to improve doc generation so templates produce correctly formatted output every time.',
  five_whys: [
    'Why do gates fail? Because markdown format drifts from expected patterns.',
    'Why does format drift? Because LLMs interpret rendering rules probabilistically.',
    'Why is interpretation needed? Because templates are reference docs, not executable.',
    'Why not make templates executable? That is exactly what we are doing now.',
    'Why now? Because iteration loops waste 50%+ of Stage 2 time on format fixes.',
  ],
  jtbd: {
    situation: 'running the super-dev workflow pipeline',
    motivation: 'have documents pass gate validation on first attempt',
    outcome: 'reduce pipeline execution time and eliminate format-related retries',
    functional: 'Deterministic markdown generation from structured data',
    emotional: 'Confidence that format issues are impossible',
    social: 'Reliable pipeline that team members trust',
  },
  stakeholders: [
    { role: 'Developer', impact: 'Faster pipeline execution, fewer retries' },
    { role: 'Plugin users', impact: 'More reliable workflow completion' },
  ],
  workflow_before: 'Writer agent reads template reference, interprets rendering rules, writes markdown. Gate validates regex. Fails 50% first-pass. Doc-validator feeds back errors. Agent retries 1-3 times.',
  workflow_after: 'Writer agent produces structured JSON. Render script applies template deterministically. Gate validates regex. Always passes on format (only content issues cause retries).',
  acceptance_criteria: [
    { id: 'AC-01', description: 'Rendered BDD document passes gate-bdd on first attempt with valid data' },
    { id: 'AC-02', description: 'Rendered requirements document passes gate-requirements on first attempt with valid data' },
    { id: 'AC-03', description: 'Schema validator catches missing required fields before render' },
  ],
  non_functional_requirements: [
    { category: 'Performance', priority: 'high', description: 'Template rendering completes in <50ms for any document' },
    { category: 'Security', priority: 'low', description: 'No eval() or dynamic code execution in template engine' },
    { category: 'Accessibility', priority: 'low', description: 'Generated markdown uses semantic heading hierarchy' },
  ],
  recommendations: [
    { name: 'Pure JS engine', description: 'Zero external dependencies, works everywhere Node.js runs' },
    { name: 'Incremental rollout', description: 'Convert BDD and requirements first, then reviews, then hybrid docs' },
  ],
  open_questions: ['Should the .j2 reference files be deleted after migration?'],
  assumptions: ['Claude Code runtime always has Node.js ≥18 available'],
  options: [
    {
      name: 'Pure JS (Nunjucks-like)',
      description: 'Custom lightweight Jinja2 subset in plain Node.js',
      pros: ['Zero deps', 'No install step', 'Full control'],
      cons: ['Must maintain the engine code'],
      effort: 'medium',
    },
  ],
};

const reqOutput = render(reqTemplate, reqData);

assert(reqOutput.includes('# Requirements: Template Rendering Pipeline'), 'Has heading');
assert(reqOutput.includes('## Acceptance Criteria'), 'Has AC section');
assert(reqOutput.includes('AC-01'), 'Has AC-01');
assert(reqOutput.includes('AC-02'), 'Has AC-02');
assert(reqOutput.includes('AC-03'), 'Has AC-03');
assert(reqOutput.includes('## Non-Functional Requirements'), 'Has NFR section');
assert(reqOutput.includes('Performance'), 'Has Performance keyword');
assert(reqOutput.includes('Security'), 'Has Security keyword');
assert(reqOutput.includes('## Executive Summary'), 'Has Executive Summary');
assert(reqOutput.length > 500, `Content exceeds minSize (${reqOutput.length} > 500)`);

// Verify gate patterns from definitions.mjs
assert(/acceptance\s+criteria/i.test(reqOutput), 'Gate: acceptance criteria');
assert((reqOutput.match(/AC-\d+/g) || []).length >= 2, 'Gate: ≥2 AC items');
assert(/non-functional|performance|security|accessibility/i.test(reqOutput), 'Gate: NFR keywords');
assert(/executive\s+summary|summary/i.test(reqOutput), 'Gate: summary keyword');

// =============================================================================
// TEST: Schema Validator
// =============================================================================
console.log('\n━━━ Schema Validator ━━━');

const bddSchema = JSON.parse(readFileSync(join(ROOT, 'templates/schemas/bdd-scenarios.schema.json'), 'utf8'));

// Valid data should pass
const validErrors = validateJson(bddData, bddSchema);
assert(validErrors.length === 0, `Valid BDD data passes schema (${validErrors.length} errors)`);
if (validErrors.length > 0) validErrors.forEach(e => console.error(`    ${e}`));

// Missing required field
const missingFeatureName = { ...bddData, feature_name: undefined };
delete missingFeatureName.feature_name;
const missingErrors = validateJson(missingFeatureName, bddSchema);
assert(missingErrors.length > 0, 'Missing feature_name caught');

// Invalid pattern
const badDate = { ...bddData, date: 'July 5' };
const dateErrors = validateJson(badDate, bddSchema);
assert(dateErrors.length > 0, 'Invalid date format caught');

// Array too short
const emptyFeatures = { ...bddData, features: [] };
const emptyErrors = validateJson(emptyFeatures, bddSchema);
assert(emptyErrors.length > 0, 'Empty features array caught');

// Requirements schema
const reqSchema = JSON.parse(readFileSync(join(ROOT, 'templates/schemas/requirements.schema.json'), 'utf8'));
const reqValidErrors = validateJson(reqData, reqSchema);
assert(reqValidErrors.length === 0, `Valid requirements data passes schema (${reqValidErrors.length} errors)`);
if (reqValidErrors.length > 0) reqValidErrors.forEach(e => console.error(`    ${e}`));

// =============================================================================
// TEST: Template Engine Edge Cases
// =============================================================================
console.log('\n━━━ Template Engine: Edge Cases ━━━');

// Empty and_clauses should not render **And** lines
const noAndData = { ...bddData };
noAndData.features = [{
  name: 'Test',
  scenarios: [{
    id: '001', title: 'Test scenario without And clauses',
    ac_ref: 'AC-01', priority: 'high',
    given: 'a condition exists in the system state',
    when: 'a trigger action is performed by user',
    then: 'the expected outcome is observed correctly',
    and_clauses: [],
  }],
}];
const noAndOutput = render(bddTemplate, noAndData);
assert(!noAndOutput.includes('**And**'), 'Empty and_clauses produces no And lines');

// loop.index test
const simpleLoop = '{% for x in items %}{{ loop.index }}.{{ x }} {% endfor %}';
const loopOutput = render(simpleLoop, { items: ['a', 'b', 'c'] });
assert(loopOutput.trim() === '1.a 2.b 3.c', `loop.index works: "${loopOutput.trim()}"`);

// Nested for loops
const nested = '{% for g in groups %}[{% for i in g.items %}{{ i }}{% endfor %}]{% endfor %}';
const nestedOutput = render(nested, { groups: [{ items: ['a', 'b'] }, { items: ['c'] }] });
assert(nestedOutput === '[ab][c]', `Nested loops: "${nestedOutput}"`);

// If/elif/else
const ifElse = '{% if x == 1 %}one{% elif x == 2 %}two{% else %}other{% endif %}';
assert(render(ifElse, { x: 1 }) === 'one', 'if branch');
assert(render(ifElse, { x: 2 }) === 'two', 'elif branch');
assert(render(ifElse, { x: 99 }) === 'other', 'else branch');

// Filter: join
const joinTest = '{{ items | join("; ") }}';
assert(render(joinTest, { items: ['a', 'b', 'c'] }) === 'a; b; c', 'join filter');

// Filter: length
const lenTest = '{{ items | length }}';
assert(render(lenTest, { items: [1, 2, 3] }) === '3', 'length filter');

// Filter: default
const defTest = '{{ missing | default("fallback") }}';
assert(render(defTest, {}) === 'fallback', 'default filter');
assert(render(defTest, { missing: 'present' }) === 'present', 'default not applied when present');

// =============================================================================
// TEST: CLI render.mjs
// =============================================================================
console.log('\n━━━ CLI: render.mjs ━━━');

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const tmpDir = join(ROOT, '.test-render-tmp');
mkdirSync(tmpDir, { recursive: true });

// Write test data
const testDataPath = join(tmpDir, 'bdd-data.json');
writeFileSync(testDataPath, JSON.stringify(bddData), 'utf8');

// Render via CLI
const outputPath = join(tmpDir, 'bdd-output.md');
try {
  const result = execSync(
    `node ${join(ROOT, 'scripts/render.mjs')} ` +
    `--template ${join(ROOT, 'templates/bdd-scenarios.md.njk')} ` +
    `--schema ${join(ROOT, 'templates/schemas/bdd-scenarios.schema.json')} ` +
    `--data ${testDataPath} ` +
    `--output ${outputPath}`,
    { encoding: 'utf8', cwd: ROOT }
  );
  assert(result.includes('OK:'), 'CLI exits successfully with OK message');

  const cliOutput = readFileSync(outputPath, 'utf8');
  assert(cliOutput.includes('SCENARIO-001'), 'CLI output has SCENARIO-001');
  assert(cliOutput.includes('## Feature: Login Flow'), 'CLI output has feature heading');
} catch (e) {
  assert(false, `CLI render failed: ${e.message}`);
}

// Test CLI validation failure
const badDataPath = join(tmpDir, 'bad-data.json');
writeFileSync(badDataPath, JSON.stringify({ feature_name: '' }), 'utf8');
try {
  execSync(
    `node ${join(ROOT, 'scripts/render.mjs')} ` +
    `--template ${join(ROOT, 'templates/bdd-scenarios.md.njk')} ` +
    `--schema ${join(ROOT, 'templates/schemas/bdd-scenarios.schema.json')} ` +
    `--data ${badDataPath} ` +
    `--output ${join(tmpDir, 'should-not-exist.md')}`,
    { encoding: 'utf8', cwd: ROOT }
  );
  assert(false, 'CLI should fail on invalid data');
} catch (e) {
  assert(e.status === 1, 'CLI exits with code 1 on validation error');
}

// Cleanup
rmSync(tmpDir, { recursive: true, force: true });

// =============================================================================
// SUMMARY
// =============================================================================
console.log(`\n${'━'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('All tests passed! ✓');
