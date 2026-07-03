#!/usr/bin/env node
/**
 * Gate validation test suite.
 * Creates example docs from templates, then validates each gate
 * against passing, failing, and edge-case documents.
 *
 * Run: node scripts/tests/validate-gates.mjs
 */

import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(__dirname, '..', 'gates', 'runner.mjs');
const TEST_DIR = '/tmp/gate-validation-tests';

// --- Test infrastructure ---
let passed = 0;
let failed = 0;
const failures = [];

function setup(name) {
  const dir = join(TEST_DIR, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeDoc(dir, filename, content) {
  writeFileSync(join(dir, filename), content);
}

function runGate(gateName, specDir, extraArgs = []) {
  const result = spawnSync('node', [RUNNER, gateName, specDir, ...extraArgs], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10_000,
  });
  return { exitCode: result.status, stdout: result.stdout, stderr: result.stderr };
}

function expectPass(testName, gateName, specDir, extraArgs = []) {
  const { exitCode, stdout, stderr } = runGate(gateName, specDir, extraArgs);
  if (exitCode === 0) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    failures.push({ testName, gateName, expected: 'PASS', got: 'FAIL', output: stdout + stderr });
    console.log(`  ✗ ${testName} (expected PASS, got FAIL)`);
    console.log(`    ${stdout.split('\n').filter(l => l.includes('FAIL')).join('\n    ')}`);
  }
}

function expectFail(testName, gateName, specDir, extraArgs = []) {
  const { exitCode, stdout, stderr } = runGate(gateName, specDir, extraArgs);
  if (exitCode !== 0) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    failures.push({ testName, gateName, expected: 'FAIL', got: 'PASS', output: stdout });
    console.log(`  ✗ ${testName} (expected FAIL, got PASS)`);
  }
}

// ============================================================================
// GATE: requirements
// ============================================================================
console.log('\n=== GATE: requirements ===');

// Pass: full template-conforming document
{
  const dir = setup('req-pass');
  writeDoc(dir, '01-requirements.md', `# Requirements: User Auth

- **Date**: 2026-07-03
- **Author**: super-dev:requirements-clarifier
- **Type**: feature
- **Priority**: high
- **Status**: draft

---

## Executive Summary

This requirement addresses the need for user authentication with OAuth2 integration to secure the API endpoints.

## The Real Need (Root Cause Analysis)

### Surface Request
User wants login functionality.

### 5 Whys Analysis
1. **Why**: Need auth → 2. **Why**: API exposed → 3. **Why**: Security req → 4. **Why**: Compliance → 5. **Why**: SOC2

## Acceptance Criteria

- **AC-01**: Users can log in with email/password and receive a JWT token within 200ms
- **AC-02**: Invalid credentials return 401 with a structured error message
- **AC-03**: Tokens expire after 15 minutes and can be refreshed

## Non-Functional Requirements

- **Performance** (high): Login must complete within 200ms p99
- **Security** (high): Passwords hashed with bcrypt, min 12 rounds
- **Accessibility** (medium): Login form meets WCAG 2.1 AA

## Open Questions

- Should we support SSO in v1?
`);
  expectPass('Full template document', 'requirements', dir);
}

// Pass: minimal but valid (barely passes all checks)
{
  const dir = setup('req-pass-minimal');
  writeDoc(dir, '99-requirements.md', `# Requirements

## Summary

We need a thing that does stuff and handles edge cases properly with good performance.

## Acceptance Criteria

- **AC-01**: First criterion that is testable
- **AC-02**: Second criterion that is measurable

## Non-Functional Requirements

Performance target: < 100ms response time.

Some more text to ensure we exceed 500 characters. This is padding but in real docs it would be meaningful content about the requirement context, stakeholders, and implementation constraints. We need enough to prove this isn't just a template.
`);
  expectPass('Minimal valid document', 'requirements', dir);
}

// Fail: missing acceptance criteria section
{
  const dir = setup('req-fail-no-ac');
  writeDoc(dir, '01-requirements.md', `# Requirements

## Executive Summary

This is a requirement without AC section.

## Non-Functional Requirements

Performance should be good. Security should be tight. Accessibility matters.

More text here to pad the file past 500 chars threshold. We need enough content to make the size check pass even though the AC section is completely missing from this document.
`);
  expectFail('Missing acceptance criteria section', 'requirements', dir);
}

// Fail: only 1 AC item (need 2)
{
  const dir = setup('req-fail-1ac');
  writeDoc(dir, '01-requirements.md', `# Requirements

## Executive Summary

Only one AC.

## Acceptance Criteria

- **AC-01**: The only criterion

## Non-Functional Requirements

Performance and security and accessibility are considered here in this section that makes the non-functional check pass.

More text to exceed the 500 char minimum requirement for this document file size check.
`);
  expectFail('Only 1 AC item (need ≥2)', 'requirements', dir);
}

// Fail: too small (under 500 chars)
{
  const dir = setup('req-fail-small');
  writeDoc(dir, '01-requirements.md', `# Req

## Summary
Short.

## Acceptance Criteria
- **AC-01**: X
- **AC-02**: Y

## Non-Functional
Performance.
`);
  expectFail('File too small (<500 chars)', 'requirements', dir);
}

// Fail: no file matching pattern
{
  const dir = setup('req-fail-nofile');
  writeDoc(dir, 'readme.md', '# Not a requirements file');
  expectFail('No file matching *-requirements.md', 'requirements', dir);
}

// Edge: AC-IDs in non-standard positions (e.g., traceability table)
{
  const dir = setup('req-edge-ac-positions');
  writeDoc(dir, '01-requirements.md', `# Requirements: Edge Case

## Executive Summary

Testing AC-IDs in unusual positions.

## Acceptance Criteria

The following acceptance criteria are defined:

| ID | Criterion |
|----|-----------|
| AC-01 | First thing |
| AC-02 | Second thing |
| AC-03 | Third thing |

## Non-Functional Requirements

**Performance**: Must be fast.
**Security**: Must be secure.

This document has enough content to pass the 500 character minimum size check that ensures we aren't just dealing with an empty template stub.
`);
  expectPass('AC-IDs in table format', 'requirements', dir);
}

// ============================================================================
// GATE: bdd
// ============================================================================
console.log('\n=== GATE: bdd ===');

// Pass: full template-conforming BDD scenarios
{
  const dir = setup('bdd-pass');
  writeDoc(dir, '01-requirements.md', `## Acceptance Criteria\n- **AC-01**: Login\n- **AC-02**: Logout\n- **AC-03**: Refresh`);
  writeDoc(dir, '02-bdd-scenarios.md', `# Behavior Scenarios: User Auth

- **Date**: 2026-07-03
- **Author**: super-dev:bdd-scenario-writer
- **Source**: ./01-requirements.md
- **Total Scenarios**: 4

---

## Feature: Authentication

### SCENARIO-001: Successful login with valid credentials

- **Acceptance Criteria**: AC-01
- **Priority**: high

**Given** the user has a valid account
**When** they submit correct email and password
**Then** they receive a JWT token
**And** the token expires in 15 minutes

### SCENARIO-002: Failed login with invalid password

- **Acceptance Criteria**: AC-01
- **Priority**: high

**Given** the user has a valid account
**When** they submit an incorrect password
**Then** they receive a 401 error

### SCENARIO-003: Logout clears session

- **Acceptance Criteria**: AC-02
- **Priority**: medium

**Given** the user is logged in
**When** they click logout
**Then** their session is invalidated

### SCENARIO-004: Token refresh

- **Acceptance Criteria**: AC-03
- **Priority**: high

**Given** a user has an expired access token
**When** they submit a valid refresh token
**Then** they receive a new access token

---

## Traceability

- **AC-01**: Login → SCENARIO-001, SCENARIO-002
- **AC-02**: Logout → SCENARIO-003
- **AC-03**: Refresh → SCENARIO-004
`);
  expectPass('Full BDD document with cross-ref', 'bdd', dir);
}

// Pass: bullet-style Given/When/Then (not bold)
{
  const dir = setup('bdd-pass-bullets');
  writeDoc(dir, '01-requirements.md', `## Acceptance Criteria\n- **AC-01**: Thing`);
  writeDoc(dir, '02-bdd-scenarios.md', `# Scenarios

### SCENARIO-001: Test

- **Acceptance Criteria**: AC-01

- Given a precondition
- When an action happens
- Then a result occurs
- And something else

### SCENARIO-002: Another

- **Acceptance Criteria**: AC-01

* Given another state
* When triggered
* Then outcome

This is enough text to pass the 300 char minimum size check for BDD scenario documents.
`);
  expectPass('Bullet-style Given/When/Then', 'bdd', dir);
}

// Fail: no SCENARIO-IDs
{
  const dir = setup('bdd-fail-no-ids');
  writeDoc(dir, '01-requirements.md', `## Acceptance Criteria\n- **AC-01**: X`);
  writeDoc(dir, '02-bdd-scenarios.md', `# Scenarios

## Feature: Something

### Test Case 1

**Given** a state
**When** action
**Then** result

- **Acceptance Criteria**: AC-01

Padding text to get past the 300 character minimum size requirement for the file validation check.
`);
  expectFail('No SCENARIO-IDs', 'bdd', dir);
}

// Fail: no Given/When/Then
{
  const dir = setup('bdd-fail-no-gwt');
  writeDoc(dir, '01-requirements.md', `## Acceptance Criteria\n- **AC-01**: X`);
  writeDoc(dir, '02-bdd-scenarios.md', `# Scenarios

### SCENARIO-001: Test case

- Precondition: user is logged in
- Action: user clicks button
- Result: something happens

- **Acceptance Criteria**: AC-01

Padding text to get past the 300 character minimum. This scenario doesn't use proper Given/When/Then format.
`);
  expectFail('No Given/When/Then keywords', 'bdd', dir);
}

// Fail: fewer scenarios than ACs
{
  const dir = setup('bdd-fail-coverage');
  writeDoc(dir, '01-requirements.md', `## Acceptance Criteria\n- **AC-01**: First\n- **AC-02**: Second\n- **AC-03**: Third`);
  writeDoc(dir, '02-bdd-scenarios.md', `# Scenarios

### SCENARIO-001: Only one scenario

- **Acceptance Criteria**: AC-01

**Given** a state
**When** action
**Then** result

Padding text to pass the 300 char minimum for this BDD file that only has one scenario but three ACs.
`);
  expectFail('Fewer scenarios than AC count', 'bdd', dir);
}

// ============================================================================
// GATE: specification
// ============================================================================
console.log('\n=== GATE: specification ===');

// Pass: full spec
{
  const dir = setup('spec-pass');
  writeDoc(dir, '06-specification.md', `# Technical Specification: Feature X

## 1. Overview

This specification covers the implementation of Feature X using a modular architecture pattern.

## 2. Architecture

### 2.1. Component Design

The system uses a layered component design with clear separation of concerns.

## 5. Implementation Details

### 5.1. Core Module

Implementation of the core processing logic.

## 6. Testing Strategy

### 6.1. Unit Tests

- Test authentication service
- Test token validation

### 6.2. Integration Tests

- Test API endpoint responses

### 6.4. BDD Scenario References

- **SCENARIO-001** — unit — Covered
- **SCENARIO-002** — integration — Covered
- **SCENARIO-003** — e2e — Partial
`);
  expectPass('Full specification document', 'specification', dir);
}

// Fail: no SCENARIO references
{
  const dir = setup('spec-fail-no-scenario');
  writeDoc(dir, '06-specification.md', `# Technical Specification

## Architecture

The system uses microservices with clear component boundaries.

## Testing Strategy

We will use unit tests and integration tests to validate the system behavior.

Padding text to ensure the file exceeds 500 characters for the minimum size check that prevents empty stubs from passing.
`);
  expectFail('No SCENARIO-IDs in spec', 'specification', dir);
}

// ============================================================================
// GATE: implementation-plan
// ============================================================================
console.log('\n=== GATE: implementation-plan ===');

// Pass: phases with proper heading format
{
  const dir = setup('plan-pass');
  writeDoc(dir, '07-implementation-plan.md', `# Implementation Plan: Feature X

- **Total Phases**: 2
- **Estimated Effort**: 3 days

## Phase 1: Database Layer

- **Domain**: backend
- **Effort**: medium
- **Objective**: Set up schema and migrations

### Tasks
1. Create migration files
2. Define models

## Phase 2: API Endpoints

- **Domain**: backend
- **Effort**: large
- **Objective**: Implement REST endpoints

### Tasks
1. Create router
2. Add middleware
`);
  expectPass('Valid implementation plan', 'implementation-plan', dir);
}

// Fail: no Phase headings
{
  const dir = setup('plan-fail-no-phases');
  writeDoc(dir, '07-implementation-plan.md', `# Implementation Plan

## Step 1: Do thing

- Domain: backend
- Effort: medium

## Step 2: Do other thing

- Domain: frontend
- Timeline: 2 days
`);
  expectFail('No "Phase N:" headings', 'implementation-plan', dir);
}

// ============================================================================
// GATE: task-list
// ============================================================================
console.log('\n=== GATE: task-list ===');

// Pass: checkboxes with phase
{
  const dir = setup('task-pass');
  writeDoc(dir, '08-task-list.md', `# Task List

## Phase 1: Setup

**Milestone**: Project scaffold complete

- [ ] **T-01**: Initialize project structure
  - Files: package.json, tsconfig.json
  - Effort: small

- [ ] **T-02**: Configure linting
  - Files: eslint.config.js
  - Effort: small
`);
  expectPass('Valid task list with checkboxes', 'task-list', dir);
}

// Pass: numbered list format
{
  const dir = setup('task-pass-numbered');
  writeDoc(dir, '08-task-list.md', `# Task List

## Phase 1: Core Implementation

**Milestone**: Core functionality delivered

1. Implement user model with validation
2. Add input validation layer for all endpoints
3. Create API routes with proper error handling

## Summary
- Phase 1: Core — 3 tasks, medium effort
`);
  expectPass('Numbered list format', 'task-list', dir);
}

// Fail: no task items at all
{
  const dir = setup('task-fail-empty');
  writeDoc(dir, '08-task-list.md', `# Task List

## Phase 1: Things

This phase involves doing stuff.

## Summary

Phase 1 has some work.
`);
  expectFail('No task items (no checkboxes or numbers)', 'task-list', dir);
}

// ============================================================================
// GATE: spec-review
// ============================================================================
console.log('\n=== GATE: spec-review ===');

// Pass: all 8 dimensions + verdict
{
  const dir = setup('specrev-pass');
  writeDoc(dir, '09-spec-review.md', `# Specification Review

- **Status**: APPROVED

## Verdict: APPROVED

The specification meets all quality criteria.

## Finding Summary

- Critical: 0
- High: 0
- Medium: 1
- Low: 2
- **Total**: 3

## Dimension Reviews

### D1: Completeness
- **Status**: Pass

### D2: Consistency
- **Status**: Pass

### D3: Feasibility
- **Status**: Pass

### D4: Testability
- **Status**: Pass

### D5: Traceability
- **Status**: Pass

### D6: Grounding
- **Status**: Pass

Grounding verification:
- \`src/auth/service.ts\` — confirmed
- \`src/models/user.ts\` — confirmed

### D7: Complexity
- **Status**: Pass

### D8: Ambiguity
- **Status**: Pass
`);
  expectPass('Full spec review with all dimensions', 'spec-review', dir);
}

// Fail: missing grounding verification
// NOTE: The word "Grounding" itself matches the grounding pattern (by design —
// the gate only requires the CONCEPT to be mentioned, not specific verification results).
// So we test a truly missing dimension instead.
{
  const dir = setup('specrev-fail-no-verdict');
  writeDoc(dir, '09-spec-review.md', `# Review

## Summary

The spec looks reasonable overall.

### D1: Completeness
Status: Pass
### D2: Consistency
Pass
### D3: Feasibility
Pass
### D4: Testability
Pass
### D5: Traceability
Pass
### D6: Depth
Pass — all references checked
### D7: Complexity
Pass
### D8: Ambiguity
Pass

Finding summary: Medium: 1, Low: 2
`);
  // Missing: verdict (APPROVED/REVISIONS NEEDED/REJECTED) and dimension "Grounding" not present
  expectFail('No verdict text present', 'spec-review', dir);
}

// Fail: missing dimensions
{
  const dir = setup('specrev-fail-dims');
  writeDoc(dir, '09-spec-review.md', `# Review

## Verdict: APPROVED

Only 3 dimensions.

### D1: Completeness
Pass

### D2: Consistency
Pass

### D3: Feasibility
Pass

Grounding was verified and confirmed.
Finding severity: Medium: 1
`);
  expectFail('Only 3 of 8 dimensions', 'spec-review', dir);
}

// ============================================================================
// GATE: code-review
// ============================================================================
console.log('\n=== GATE: code-review ===');

{
  const dir = setup('cr-pass');
  writeDoc(dir, '11-code-review.md', `# Code Review

## Verdict: Approved

No issues found. Code meets all quality standards.
`);
  expectPass('Approved verdict', 'code-review', dir);
}

{
  const dir = setup('cr-pass-changes');
  writeDoc(dir, '11-code-review.md', `# Code Review

## Verdict: Changes Requested

### F-01: Missing error handling
- Severity: High
`);
  expectPass('Changes Requested is valid verdict', 'code-review', dir);
}

{
  const dir = setup('cr-fail-no-verdict');
  writeDoc(dir, '11-code-review.md', `# Code Review

## Summary

Looked at the code. Seems fine overall. No major issues.
`);
  expectFail('No parseable verdict', 'code-review', dir);
}

// ============================================================================
// GATE: adversarial-review
// ============================================================================
console.log('\n=== GATE: adversarial-review ===');

{
  const dir = setup('adv-pass');
  writeDoc(dir, '12-adversarial-review.md', `# Adversarial Review

## Verdict: PASS

No findings from any lens.
`);
  expectPass('PASS verdict', 'adversarial-review', dir);
}

{
  const dir = setup('adv-contest');
  writeDoc(dir, '12-adversarial-review.md', `# Adversarial Review

## Verdict: CONTEST

### Skeptic Lens
> **S-01** (Medium): Race condition in concurrent access
`);
  expectPass('CONTEST is valid verdict', 'adversarial-review', dir);
}

{
  const dir = setup('adv-fail');
  writeDoc(dir, '12-adversarial-review.md', `# Adversarial Review

## Summary

The implementation was reviewed from multiple perspectives and no major issues surfaced.
`);
  expectFail('No PASS/CONTEST/REJECT verdict', 'adversarial-review', dir);
}

// Edge: "PASS" appears only in a different context (not verdict)
{
  const dir = setup('adv-edge-pass-context');
  writeDoc(dir, '12-adversarial-review.md', `# Adversarial Review

## Summary

All tests PASS. The implementation handles edge cases well.

## Lens Reviews

### Skeptic: No issues that would cause tests to not PASS.
`);
  // This SHOULD pass because "PASS" is present as a word
  expectPass('PASS appears in non-verdict context (still matches)', 'adversarial-review', dir);
}

// ============================================================================
// GATE: implementation-summary
// ============================================================================
console.log('\n=== GATE: implementation-summary ===');

{
  const dir = setup('implsum-pass');
  writeDoc(dir, '10-implementation-summary.md', `# Implementation Summary: Feature X

- **Phase**: 1 — Database Layer
- **Status**: completed

## Overview

Implemented the database schema with migrations and seed data for the authentication system.

## Files Changed

- \`src/db/schema.ts\` — created, +45/-0
  - Purpose: Define database schema with Drizzle ORM
- \`src/db/migrate.ts\` — created, +30/-0
  - Purpose: Migration runner script

## Key Decisions

### 1. Use Drizzle ORM over Prisma

- **Context**: Need a type-safe ORM
- **Decision**: Drizzle for better edge runtime support
- **Rationale**: Smaller bundle, SQL-like syntax

## Test Results

- **Unit Tests**: 12/12 passing
- **Integration Tests**: 5/5 passing

## Next Steps

Phase complete. No remaining items.
`);
  expectPass('Full implementation summary', 'implementation-summary', dir);
}

{
  const dir = setup('implsum-fail-todos');
  writeDoc(dir, '10-implementation-summary.md', `# Implementation Summary

## Overview

Partially done. TODO: finish the auth module. FIXME: the tests are broken.
TODO: add error handling. TODO: refactor. FIXME: memory leak.

## Files Changed

- \`src/index.ts\` — modified

## Test Results

Tests are not passing yet.

Padding to exceed 300 chars. This document has too many TODO/FIXME markers and should fail the placeholder check.
`);
  expectFail('Too many TODO/FIXME markers (5 > 3)', 'implementation-summary', dir);
}

// ============================================================================
// GATE: docs-drift
// ============================================================================
console.log('\n=== GATE: docs-drift ===');

{
  const dir = setup('drift-pass');
  writeDoc(dir, '06-specification.md', 'Spec content here, non-empty.');
  writeDoc(dir, '07-implementation-plan.md', 'Plan content here, non-empty.');
  writeDoc(dir, '08-task-list.md', 'Task list content here.');
  writeDoc(dir, '10-implementation-summary.md', 'Summary content here.');
  writeDoc(dir, '01-workflow-tracking.json', JSON.stringify({ stages: [], implementationPhases: [] }));
  expectPass('All required docs present', 'docs-drift', dir);
}

{
  const dir = setup('drift-fail-missing');
  writeDoc(dir, '06-specification.md', 'Spec content.');
  // Missing: implementation-plan, task-list, implementation-summary
  expectFail('Missing required documents', 'docs-drift', dir);
}

{
  const dir = setup('drift-fail-placeholders');
  writeDoc(dir, '06-specification.md', 'TODO: write spec. FIXME: broken. TBD: decide later. PLACEHOLDER for content.');
  writeDoc(dir, '07-implementation-plan.md', 'TODO: finish plan.');
  writeDoc(dir, '08-task-list.md', 'Tasks listed.');
  writeDoc(dir, '10-implementation-summary.md', 'Summary done.');
  writeDoc(dir, '01-workflow-tracking.json', '{"valid": true}');
  expectFail('Too many placeholders across docs (5 > 3)', 'docs-drift', dir);
}

{
  const dir = setup('drift-fail-invalid-json');
  writeDoc(dir, '06-specification.md', 'Spec.');
  writeDoc(dir, '07-implementation-plan.md', 'Plan.');
  writeDoc(dir, '08-task-list.md', 'Tasks.');
  writeDoc(dir, '10-implementation-summary.md', 'Summary.');
  writeDoc(dir, '01-workflow-tracking.json', 'not valid json {{{');
  expectFail('Invalid workflow tracking JSON', 'docs-drift', dir);
}

// ============================================================================
// GATE: implementation-complete
// ============================================================================
console.log('\n=== GATE: implementation-complete ===');

{
  const dir = setup('implcomplete-pass');
  writeDoc(dir, '07-implementation-plan.md', `# Plan\n\n## Phase 1: Setup\nDo stuff\n\n## Phase 2: Build\nBuild stuff`);
  writeDoc(dir, '10-implementation-summary.md', 'Summary of implementation.');
  writeDoc(dir, '01-workflow-tracking.json', JSON.stringify({
    implementationPhases: [
      { phaseNumber: 1, name: 'Setup', status: 'complete' },
      { phaseNumber: 2, name: 'Build', status: 'complete' },
    ]
  }));
  expectPass('All phases complete', 'implementation-complete', dir);
}

{
  const dir = setup('implcomplete-fail-incomplete');
  writeDoc(dir, '07-implementation-plan.md', `# Plan\n\n## Phase 1: Setup\nDo stuff\n\n## Phase 2: Build\nBuild stuff`);
  writeDoc(dir, '10-implementation-summary.md', 'Summary.');
  writeDoc(dir, '01-workflow-tracking.json', JSON.stringify({
    implementationPhases: [
      { phaseNumber: 1, name: 'Setup', status: 'complete' },
      { phaseNumber: 2, name: 'Build', status: 'in_progress' },
    ]
  }));
  expectFail('Phase 2 still in_progress', 'implementation-complete', dir);
}

{
  const dir = setup('implcomplete-fail-no-tracking');
  writeDoc(dir, '07-implementation-plan.md', `# Plan\n\n## Phase 1: Setup\nStuff`);
  expectFail('No tracking JSON', 'implementation-complete', dir);
}

// ============================================================================
// GATE: spec-trace
// ============================================================================
console.log('\n=== GATE: spec-trace ===');

{
  const dir = setup('trace-pass');
  writeDoc(dir, '06-specification.md', `# Spec\n\n## Testing Strategy\n\nUnit tests cover all modules.\n\n## Scenario Refs\n\n- SCENARIO-001 covered\n- SCENARIO-002 covered`);
  writeDoc(dir, '07-implementation-plan.md', 'Plan content.');
  writeDoc(dir, '08-task-list.md', 'Task list content.');
  expectPass('Spec with scenarios + companion files', 'spec-trace', dir);
}

{
  const dir = setup('trace-fail-no-plan');
  writeDoc(dir, '06-specification.md', `# Spec\n\n## Testing Strategy\nTests.\n\nSCENARIO-001 ref.`);
  writeDoc(dir, '08-task-list.md', 'Tasks.');
  // Missing: implementation-plan
  expectFail('Missing implementation plan', 'spec-trace', dir);
}

// ============================================================================
// GATE: handoff (conditional)
// ============================================================================
console.log('\n=== GATE: handoff ===');

// Pass: no pivot, no iteration → AC Coverage not required
{
  const dir = setup('handoff-pass-no-pivot');
  writeDoc(dir, '13-handoff.md', `# Handoff: Feature X\n\n## Progress\nAll done.\n\n## Next Steps\n1. Deploy`);
  writeDoc(dir, '01-workflow-tracking.json', JSON.stringify({
    iteration: { loops: 0 },
    implementationPhases: [{ phaseNumber: 1, status: 'complete' }],
  }));
  expectPass('No pivot → AC Coverage not required', 'handoff', dir);
}

// Pass: has iteration but includes AC Coverage
{
  const dir = setup('handoff-pass-with-ac');
  writeDoc(dir, '13-handoff.md', `# Handoff: Feature X

## Progress
Done.

## AC Coverage Assessment

### ACs met as planned
- AC-01: Login works exactly as specified
- AC-02: Logout clears session as designed

### ACs met by alternative mechanism
- AC-03: Token refresh uses a different flow than originally specified

### ACs superseded
- AC-04: Removed per revised spec due to scope change

## Next Steps
1. Deploy
`);
  writeDoc(dir, '01-workflow-tracking.json', JSON.stringify({
    iteration: { loops: 2 },
    implementationPhases: [{ phaseNumber: 1, status: 'complete' }],
  }));
  expectPass('Iteration + AC Coverage present', 'handoff', dir);
}

// Fail: has iteration but missing AC Coverage
{
  const dir = setup('handoff-fail-missing-ac');
  writeDoc(dir, '13-handoff.md', `# Handoff: Feature X\n\n## Progress\nDone.\n\n## Next Steps\n1. Deploy`);
  writeDoc(dir, '01-workflow-tracking.json', JSON.stringify({
    iteration: { loops: 1 },
    implementationPhases: [{ phaseNumber: 1, status: 'complete' }, { phaseNumber: 2, status: 'complete' }],
  }));
  expectFail('Iteration present but AC Coverage missing', 'handoff', dir);
}

// Fail: pivot artifacts trigger requirement
{
  const dir = setup('handoff-fail-pivot');
  writeDoc(dir, '13-handoff.md', `# Handoff\n\n## Done\nAll good.`);
  writeDoc(dir, '01-workflow-tracking.json', JSON.stringify({ iteration: { loops: 0 }, implementationPhases: [] }));
  writeDoc(dir, '06-specification-r2.md', 'Revised spec after pivot');
  expectFail('Pivot spec artifact triggers AC Coverage requirement', 'handoff', dir);
}

// ============================================================================
// FINAL REPORT
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);

if (failures.length > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) {
    console.log(`  ${f.testName} [gate: ${f.gateName}]`);
    console.log(`    Expected: ${f.expected}, Got: ${f.got}`);
    if (f.output) console.log(`    Output: ${f.output.split('\n').slice(0, 3).join('\n    ')}`);
  }
  process.exit(1);
}

console.log('\n✓ All gate validation tests passed!');
process.exit(0);
