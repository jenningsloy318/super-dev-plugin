# Problem Analysis: Gate Validation Iteration Loops

## Problem Statement

Writer agents (requirements-clarifier, bdd-scenario-writer, code-reviewer, adversarial-reviewer, spec-reviewer) produce markdown documents that must pass bash gate scripts using grep/regex validation. Despite having templates with "Gate Compliance Notes" showing exact regex patterns, agents fail 1-3 times before passing.

## Root Cause

**LLM-to-regex interpretation gap**: Templates use XML-tagged structure with rendering rules described in English. The LLM must interpret XML → produce markdown → match specific regex. This interpretation layer introduces non-deterministic drift.

```
Current flow (error-prone):
LLM reads XML template → LLM interprets rendering rules → LLM produces markdown → Gate validates regex
                              ↑ THIS is where drift happens
```

## Evidence from Real Case (Stage 2)

### Requirements (1 iteration fix):
- Writer used table format (`| AC-01 | ... |`)
- Gate regex expects bullet format: `^\s*-\s*\*{0,2}AC-[0-9]`
- Template said "render as bullets" but LLM chose tables

### BDD (2 iteration fixes):
1. Writer produced `SCENARIO-ID: SC-XXX` — gate expects `SCENARIO-[0-9]+`
2. Doc-validator itself gave imprecise fix (suggested wrong format)
3. Final fix: `SCENARIO-001` (bare, no prefix)

## Affected Stages

| Stage | Gate | Risk Level | Issue Type |
|-------|------|------------|------------|
| 2 | gate-requirements.sh | HIGH (confirmed) | AC bullet format regex |
| 2 | gate-bdd.sh | HIGH (confirmed) | SCENARIO-ID format + GWT positioning |
| 10 | gate-review.sh (code) | HIGH (likely) | `**Critical**` bold anywhere = counted as finding |
| 10 | gate-review.sh (adversarial) | HIGH (likely) | `REJECT`/`HALT` text anywhere before verdict line |
| 7 | gate-spec-trace.sh | MEDIUM | SCENARIO-NNN refs required in spec |
| 8 | gate-spec-review.sh | LOW-MEDIUM | Verdict wording + 8 dimension names |
| 10→11 | gate-implementation-complete.sh | MEDIUM | Phase heading format vs tracking JSON |
| 9 | gate-build.sh | NONE | Runs actual build/test, no format |
| 11 | gate-docs-drift.sh | LOW | File existence + TODO count |

## Why Templates Alone Don't Solve It

The templates ARE correctly aligned with the gates. They contain:
- "Gate Compliance Notes" with regex patterns
- XML rendering rules
- Explicit format examples

But the problem is structural: **the LLM must translate XML intent into exact markdown**. This translation is probabilistic, not deterministic.

## Conclusion

The fix requires removing the LLM from the format-rendering path. The LLM should only produce structured content (JSON); a deterministic engine should handle format rendering.
