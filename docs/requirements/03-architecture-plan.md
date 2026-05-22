# Architecture Plan: MiniJinja Template Rendering System

## Solution Overview

Replace XML-tagged templates (interpreted by LLM) with MiniJinja templates (rendered deterministically). Writer agents produce JSON; `minijinja-cli` binary renders gate-compliant markdown. No Python dependency.

```
PROPOSED FLOW:
┌─────────────────┐     ┌───────────────────┐     ┌──────────────┐     ┌──────────────┐
│  Writer Agent   │────▶│ minijinja-cli     │────▶│ Final .md    │────▶│ Gate Script  │
│ (produces JSON  │     │ (binary, no deps) │     │ (deterministic│    │ (grep regex) │
│  structured data│     │ guaranteed format  │     │  format)     │     │ always PASS) │
└─────────────────┘     └───────────────────┘     └──────────────┘     └──────────────┘
```

## Tech Stack

| Tool | Purpose | Install |
|------|---------|---------|
| `minijinja-cli` | Template rendering (JSON → markdown) | `curl -sSfL .../minijinja-cli-installer.sh \| sh` or `brew install minijinja-cli` |
| `jq` | JSON validation + schema checks | System package (apt/brew) |

**No Python. No uv. No pyproject.toml. Pure binary tooling.**

## Directory Structure

```
super-dev-plugin/
├── hooks/                          ← STAYS (plugin default hooks config)
│   ├── hooks.json
│   ├── stage-gate.sh
│   ├── stage-manifest.json
│   ├── block-dangerous.sh
│   ├── auto-format.sh
│   ├── auto-lint.sh
│   ├── auto-checkpoint.sh
│   ├── log-commands.sh
│   ├── protect-files.sh
│   ├── require-tests-pr.sh
│   ├── run-tests.sh
│   └── lib.sh
│
├── scripts/                        ← ALL non-hook scripts
│   ├── gates/                      ← unchanged
│   │   ├── gate-lib.sh
│   │   ├── gate-requirements.sh
│   │   ├── gate-bdd.sh
│   │   ├── gate-spec-trace.sh
│   │   ├── gate-spec-review.sh
│   │   ├── gate-review.sh
│   │   ├── gate-build.sh
│   │   ├── gate-implementation-complete.sh
│   │   └── gate-docs-drift.sh
│   │
│   ├── render.sh                   ← NEW: thin wrapper (validate + render)
│   ├── setup-codex-agents.sh
│   └── usage-tracker.sh
│
├── templates/                      ← NEW: MiniJinja templates
│   ├── requirements.md.j2
│   ├── bdd-scenarios.md.j2
│   ├── specification.md.j2
│   ├── implementation-plan.md.j2
│   ├── task-list.md.j2
│   ├── spec-review.md.j2
│   ├── code-review.md.j2
│   ├── adversarial-review.md.j2
│   ├── implementation-summary.md.j2
│   └── schemas/                    ← JSON Schemas for input validation
│       ├── requirements.schema.json
│       ├── bdd-scenarios.schema.json
│       ├── specification.schema.json
│       ├── implementation-plan.schema.json
│       ├── task-list.schema.json
│       ├── spec-review.schema.json
│       ├── code-review.schema.json
│       ├── adversarial-review.schema.json
│       └── implementation-summary.schema.json
│
├── reference/                      ← KEPT (non-templated references only)
│   ├── architecture-patterns.md
│   ├── backend-patterns.md
│   ├── bdd-patterns.md
│   ├── coding-standards.md
│   ├── debugging-patterns.md
│   ├── frontend-patterns.md
│   ├── research-methodology.md
│   ├── state-management.md
│   ├── testing-patterns.md
│   ├── ui-ux-patterns.md
│   └── project-guidelines-example.md
│
├── agents/                         ← UPDATED (produce JSON, call minijinja-cli)
│   ├── requirements-clarifier.md
│   ├── bdd-scenario-writer.md
│   ├── spec-reviewer.md
│   ├── code-reviewer.md
│   ├── adversarial-reviewer.md
│   ├── spec-writer.md
│   ├── impl-summary-writer.md
│   ├── doc-validator.md            ← simplified (fewer format retries)
│   └── ...
│
└── docs/requirements/              ← THIS planning documentation
```

## render.sh Interface

```bash
#!/bin/bash
# Validate JSON and render template to markdown
# Usage: render.sh --template <file.j2> --data <data.json> --output <output.md>
set -euo pipefail

TEMPLATE="" DATA="" OUTPUT=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --template) TEMPLATE="$2"; shift 2 ;;
    --data)     DATA="$2"; shift 2 ;;
    --output)   OUTPUT="$2"; shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

# Validate JSON is well-formed
jq empty "$DATA" 2>/dev/null || { echo "ERROR: Invalid JSON: $DATA"; exit 1; }

# Render template with data
minijinja-cli "$TEMPLATE" "$DATA" > "$OUTPUT"
echo "OK: $OUTPUT"
```

### Agent usage:
```bash
# Agent writes JSON content, then renders:
bash scripts/render.sh \
  --template templates/bdd-scenarios.md.j2 \
  --data spec-dir/.render/bdd-scenarios.json \
  --output spec-dir/02-bdd-scenarios.md
```

## Agent Workflow Change

### Before (current):
```
1. Agent reads XML template (reference/bdd-scenarios-template.md)
2. Agent interprets rendering rules
3. Agent writes markdown directly
4. Doc-validator runs gate script → FAIL (format)
5. Agent fixes format → repeat 1-3 times
```

### After (proposed):
```
1. Agent reads JSON schema (templates/schemas/bdd-scenarios.schema.json)
2. Agent produces structured JSON content → writes to spec-dir/.render/bdd-scenarios.json
3. Agent runs: bash scripts/render.sh --template ... --data ... --output ...
4. Doc-validator runs gate script → PASS (format guaranteed by template)
5. Only retries on CONTENT issues (missing ACs, insufficient scenarios)
```

## Template Examples

### BDD Scenarios (templates/bdd-scenarios.md.j2)

```jinja2
# Behavior Scenarios: {{ feature_name }}

- **Date**: {{ date }}
- **Author**: super-dev:bdd-scenario-writer
- **Source**: ./{{ source_filename }}
- **Total Scenarios**: {{ scenarios | length }}

---
{% for feature in features %}

## Feature: {{ feature.name }}
{% for scenario in feature.scenarios %}

### SCENARIO-{{ "%03d" | format(scenario.index) }}: {{ scenario.title }}

- **Acceptance Criteria**: {{ scenario.ac_ref }}
- **Priority**: {{ scenario.priority }}

**Given** {{ scenario.given }}
**When** {{ scenario.when }}
**Then** {{ scenario.then }}
{% for clause in scenario.and_clauses %}
**And** {{ clause }}
{% endfor %}
{% endfor %}
{% endfor %}

---

## Scenario-Acceptance Criteria Traceability Matrix

| Acceptance Criterion | Scenario IDs | Coverage |
|---------------------|-------------|----------|
{% for row in traceability %}
| {{ row.ac_id }}: {{ row.description }} | {{ row.scenarios | join(", ") }} | Covered |
{% endfor %}

## Coverage Summary

- **Total Acceptance Criteria**: {{ traceability | length }}
- **Covered by Scenarios**: {{ traceability | length }}
- **Uncovered**: 0
- **Total Scenarios**: {{ scenarios | length }}
```

### Requirements (templates/requirements.md.j2)

```jinja2
# Requirements: {{ title }}

- **Date**: {{ date }}
- **Author**: super-dev:requirements-clarifier
- **Type**: {{ type }}
- **Priority**: {{ priority }}
- **Status**: {{ status }}

---

## Executive Summary

{{ executive_summary }}

## The Real Need (Root Cause Analysis)

### Surface Request

{{ surface_request }}

### 5 Whys Analysis

{% for why in five_whys %}
{{ loop.index }}. **Why**: {{ why }}
{% endfor %}

### Job to Be Done

When {{ jtbd.situation }}
I want to {{ jtbd.motivation }}
So I can {{ jtbd.outcome }}

- **Functional**: {{ jtbd.functional }}
- **Emotional**: {{ jtbd.emotional }}
- **Social**: {{ jtbd.social }}

## Acceptance Criteria
{% for ac in acceptance_criteria %}
- **{{ ac.id }}**: {{ ac.description }}
{% endfor %}

## Non-Functional Requirements
{% for nfr in non_functional_requirements %}
- **{{ nfr.category }}**: {{ nfr.description }}
{% endfor %}

## Recommendations

{% for rec in recommendations %}
{{ loop.index }}. **{{ rec.name }}**: {{ rec.description }}
{% endfor %}
```

## JSON Schema Example (templates/schemas/bdd-scenarios.schema.json)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "BDD Scenarios Input",
  "type": "object",
  "required": ["feature_name", "date", "source_filename", "features", "traceability"],
  "properties": {
    "feature_name": { "type": "string", "minLength": 1 },
    "date": { "type": "string" },
    "source_filename": { "type": "string", "pattern": "^\\d{2}-requirements\\.md$" },
    "features": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name", "scenarios"],
        "properties": {
          "name": { "type": "string" },
          "scenarios": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": ["index", "title", "ac_ref", "priority", "given", "when", "then"],
              "properties": {
                "index": { "type": "integer", "minimum": 1 },
                "title": { "type": "string", "minLength": 5 },
                "ac_ref": { "type": "string", "pattern": "^AC-\\d{2}" },
                "priority": { "type": "string", "enum": ["P0", "P1", "P2"] },
                "given": { "type": "string", "minLength": 10 },
                "when": { "type": "string", "minLength": 10 },
                "then": { "type": "string", "minLength": 10 },
                "and_clauses": {
                  "type": "array",
                  "items": { "type": "string" },
                  "default": []
                }
              }
            }
          }
        }
      }
    },
    "traceability": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["ac_id", "description", "scenarios"],
        "properties": {
          "ac_id": { "type": "string", "pattern": "^AC-\\d{2}$" },
          "description": { "type": "string" },
          "scenarios": {
            "type": "array",
            "minItems": 1,
            "items": { "type": "string", "pattern": "^SCENARIO-\\d{3}$" }
          }
        }
      }
    }
  }
}
```

## What Gets Converted

| Document | Has Gate? | Convert to MiniJinja? | Rationale |
|----------|-----------|----------------------|-----------|
| requirements.md | gate-requirements.sh | YES | Fixed structure, repeating AC items |
| bdd-scenarios.md | gate-bdd.sh | YES | Repeating Given/When/Then blocks |
| spec-review.md | gate-spec-review.sh | YES | Fixed 8 dimensions + verdict |
| code-review.md | gate-review.sh | YES | Fixed structure + Critical trap |
| adversarial-review.md | gate-review.sh | YES | REJECT/HALT word trap |
| implementation-summary.md | gate-docs-drift.sh | YES | Simple fixed structure |
| specification.md | gate-spec-trace.sh | HYBRID | Fixed header/testing section + free-form body |
| implementation-plan.md | gate-spec-trace.sh | HYBRID | Phase structure + free-form content |
| task-list.md | gate-spec-trace.sh (existence) | NO | Pure free-form |
| research-report.md | None | NO | Pure free-form |
| debug-analysis.md | None | NO | Pure free-form |

## Benefits

| Concern | Before | After |
|---------|--------|-------|
| Format iterations | 1-3 loops per document | 0 |
| Gate format failures | ~50% first-pass | ~0% |
| Agent prompt complexity | Describes rendering rules | Only describes content schema |
| Template-gate sync | Manual (error-prone) | Inherent (template IS the format) |
| `**Critical**` trap | LLM must avoid bolding | Template controls all bolding |
| `REJECT` word trap | LLM must avoid the word | Template places verdicts deterministically |
| Dependencies | None | `minijinja-cli` binary + `jq` |
| Runtime overhead | N/A | ~5ms per render (Rust binary) |

## Implementation Phases

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| 1 | Infrastructure | `scripts/render.sh`, install docs, verify minijinja-cli works |
| 2 | Templates: Requirements + BDD | `templates/requirements.md.j2`, `templates/bdd-scenarios.md.j2` + schemas |
| 3 | Templates: Reviews | `templates/spec-review.md.j2`, `templates/code-review.md.j2`, `templates/adversarial-review.md.j2` + schemas |
| 4 | Templates: Hybrid docs | `templates/specification.md.j2`, `templates/implementation-plan.md.j2`, `templates/implementation-summary.md.j2` |
| 5 | Agent prompts | Update all writer agents to produce JSON + call render.sh |
| 6 | Cleanup | Delete replaced XML templates from `reference/`, update CLAUDE.md |

## Prerequisites

```bash
# Install minijinja-cli (one-time, prebuilt binary)
curl -sSfL https://github.com/mitsuhiko/minijinja/releases/latest/download/minijinja-cli-installer.sh | sh

# Verify
minijinja-cli --version  # 2.20.0+

# jq should already be available (common on dev machines)
jq --version
```

## Migration Strategy

1. New Jinja2 templates coexist with old XML templates during migration
2. Each agent is updated one at a time (requirements-clarifier first)
3. Gate scripts remain unchanged (they validate the same regex patterns)
4. Doc-validator logic simplified but keeps same gate script invocations
5. Old XML templates removed only after all agents are migrated and tested
