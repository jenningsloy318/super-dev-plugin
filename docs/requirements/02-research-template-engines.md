# Research: Template Engine Candidates for LLM Output Rendering

## Use Case

- AI writer agents produce JSON structured data
- Template engine renders JSON into gate-compliant markdown
- Bash gate scripts validate rendered output with grep/regex
- Runtime: Python via `uv`

## Candidates Evaluated

### 1. MiniJinja (RECOMMENDED)

| Attribute | Value |
|-----------|-------|
| GitHub | github.com/mitsuhiko/minijinja |
| Stars | 2,624 |
| Last Activity | May 2026 (v2.20.0) |
| Author | Armin Ronacher (creator of Jinja2, Flask) |
| Install | `pip install minijinja` |
| Language | Rust core + Python bindings (PyO3) |

**Key advantages over Jinja2:**
- Rust-powered: faster rendering
- Stronger sandbox: no arbitrary Python execution in templates
- Cross-language: same templates work in Python and Rust
- Same syntax: `{{ }}`, `{% %}`, filters are identical
- Better error messages with source location

**Why it wins:**
- Zero learning curve (Jinja2-compatible syntax)
- Sandbox prevents agents from injecting template logic
- Active maintenance by the most respected templating author in the Python ecosystem
- Future-proof: if we ever build a Rust CLI, templates still work

### 2. Jinja2 (Incumbent)

| Attribute | Value |
|-----------|-------|
| GitHub | pallets/jinja |
| Stars | 11,634 |
| Last Activity | June 2025 |
| Install | `pip install jinja2` |

**Pros:** Battle-tested, massive ecosystem, extensive documentation
**Cons:** Pure Python (slower), overly permissive sandbox, no innovation

### 3. Mako

| Attribute | Value |
|-----------|-------|
| GitHub | sqlalchemy/mako |
| Stars | 435 |
| Last Activity | April 2026 |
| Install | `pip install mako` |

**Pros:** Compiles to Python modules (fast), full Python embedding
**Cons:** Security risk (full Python in templates), overkill for markdown

### 4. Python-Liquid

| Attribute | Value |
|-----------|-------|
| GitHub | jg-rp/liquid |
| Stars | 95 |
| Last Activity | May 2026 |
| Install | `pip install python-liquid` |

**Pros:** Inherently sandboxed (Shopify's Liquid), spec-compliant
**Cons:** Less expressive than Jinja2, smaller community, unfamiliar syntax

### 5. Chevron (Mustache)

| Attribute | Value |
|-----------|-------|
| Stars | 552 |
| Last Activity | August 2023 (STALE) |

**Verdict:** Too limited (logic-less), unmaintained. Cannot handle loops/conditionals for tables.

### 6. Pybars3 (Handlebars)

| Attribute | Value |
|-----------|-------|
| Stars | 190 |
| Last Activity | July 2024 (last release 2019) |

**Verdict:** Unmaintained. Not suitable for production.

## Adjacent Tools (Complement, Not Replace)

| Tool | Stars | Purpose | Relevance |
|------|-------|---------|-----------|
| Outlines | 13,871 | Constrain LLM output at generation time | Only for self-hosted models |
| Instructor | 13,000+ | Pydantic-validated structured LLM output | Validates JSON before rendering |
| Guidance | 21,469 | Grammar-based LLM control | Only for self-hosted models |
| Guardrails AI | 6,900 | LLM output validation framework | Alternative to bash gates |

## Key Finding

No single tool combines JSON Schema validation + template rendering + regex validation. The correct architecture is three layers:

```
JSON Schema (validates input) → Template Engine (renders) → Gate Script (validates output)
```

## Community Consensus (Reddit/HN 2024-2025)

- Jinja2 remains the default for most Python projects
- MiniJinja gaining traction for performance/security-sensitive use cases
- For AI workflows, trend is toward constraining generation (Outlines/Guidance) — but these require self-hosted models, not API-based Claude
- No "LLM-specific output template engine" exists — our pattern (JSON → template → validation) is pragmatic and unique

## Decision

**Use MiniJinja** as the template engine:
1. Same syntax as Jinja2 (no learning curve)
2. Rust-powered speed
3. Stronger sandbox (prevents template injection)
4. Same author as Jinja2 (trust in design decisions)
5. Active maintenance (May 2026)
6. `uv add minijinja` works out of the box
