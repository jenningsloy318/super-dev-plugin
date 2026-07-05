/**
 * Lightweight Jinja2-subset template renderer — zero external dependencies.
 *
 * Supported features (matches what templates/*.j2 use):
 *   - {{ expr }}              — variable interpolation
 *   - {{ expr | filter }}     — pipe filters (length, join, format, default)
 *   - {% for x in items %}    — for loops with loop.index, loop.index0, loop.first, loop.last
 *   - {% endfor %}
 *   - {% if cond %}           — conditionals (supports and/or/not, ==, !=, >, <, >=, <=)
 *   - {% elif cond %}
 *   - {% else %}
 *   - {% endif %}
 *   - {# comment #}          — comments (stripped)
 *
 * Design: parse → AST → render. No eval(). Expressions are evaluated with a
 * safe property-access walker. Intentionally minimal — add features only when
 * a template actually needs them.
 */

// =============================================================================
// FILTERS
// =============================================================================

const FILTERS = {
  length: (val) => (val == null ? 0 : val.length),
  join: (val, sep = ', ') => (Array.isArray(val) ? val.join(sep) : String(val)),
  format: (fmt, ...args) => {
    // Supports "%03d", "%s", "%d" style — one arg only (matches template usage)
    let i = 0;
    return String(fmt).replace(/%(\d*)([sd])/g, (_, width, type) => {
      const arg = args[i++];
      if (type === 'd') {
        const num = Number(arg);
        return width ? String(num).padStart(Number(width), '0') : String(num);
      }
      return String(arg ?? '');
    });
  },
  default: (val, fallback = '') => (val == null || val === '' ? fallback : val),
  upper: (val) => String(val ?? '').toUpperCase(),
  lower: (val) => String(val ?? '').toLowerCase(),
  trim: (val) => String(val ?? '').trim(),
  round: (val, precision = 0) => {
    const n = Number(val);
    return precision === 0 ? Math.round(n) : Number(n.toFixed(precision));
  },
};

// =============================================================================
// EXPRESSION EVALUATOR
// =============================================================================

/**
 * Resolve a dotted path from context: "feature.scenarios" → ctx.feature.scenarios
 */
function resolvePath(ctx, path) {
  const parts = path.trim().split('.');
  let val = ctx;
  for (const part of parts) {
    if (val == null) return undefined;
    val = val[part];
  }
  return val;
}

/**
 * Evaluate a simple expression (no assignment, no complex operators in interpolation).
 * Handles: variable paths, string literals, number literals, filter pipes.
 */
function evaluateExpr(expr, ctx) {
  const trimmed = expr.trim();

  // Split by pipes (but not inside quotes or parens)
  const segments = splitPipes(trimmed);
  let value = evaluateAtom(segments[0].trim(), ctx);

  // Apply filters
  for (let i = 1; i < segments.length; i++) {
    const filterExpr = segments[i].trim();
    const { name, args } = parseFilter(filterExpr, ctx);
    const fn = FILTERS[name];
    if (!fn) throw new Error(`Unknown filter: "${name}"`);
    value = fn(value, ...args);
  }
  return value;
}

/**
 * Split expression by | (pipe) respecting parens and quotes.
 */
function splitPipes(expr) {
  const result = [];
  let current = '';
  let depth = 0;
  let inStr = null;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (inStr) {
      current += ch;
      if (ch === inStr && expr[i - 1] !== '\\') inStr = null;
    } else if (ch === '"' || ch === "'") {
      inStr = ch;
      current += ch;
    } else if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === '|' && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse a filter call: "join(', ')" → { name: 'join', args: [', '] }
 */
function parseFilter(filterExpr, ctx) {
  const parenIdx = filterExpr.indexOf('(');
  if (parenIdx === -1) {
    return { name: filterExpr.trim(), args: [] };
  }
  const name = filterExpr.slice(0, parenIdx).trim();
  const argsStr = filterExpr.slice(parenIdx + 1, filterExpr.lastIndexOf(')'));
  const args = parseArgs(argsStr, ctx);
  return { name, args };
}

/**
 * Parse comma-separated arguments (string literals, numbers, or variable refs).
 */
function parseArgs(argsStr, ctx) {
  if (!argsStr.trim()) return [];
  const args = [];
  let current = '';
  let inStr = null;
  let isStringLiteral = false;

  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i];
    if (inStr) {
      if (ch === inStr && argsStr[i - 1] !== '\\') {
        inStr = null;
        // Don't append the closing quote — current has the string content
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inStr = ch;
      isStringLiteral = true;
      // Don't append the opening quote
    } else if (ch === ',') {
      args.push(isStringLiteral ? current : resolveArg(current.trim(), ctx));
      current = '';
      isStringLiteral = false;
    } else {
      current += ch;
    }
  }
  if (current || isStringLiteral) {
    args.push(isStringLiteral ? current : resolveArg(current.trim(), ctx));
  }
  return args;
}

function resolveArg(arg, ctx) {
  // String already stripped of quotes by parseArgs
  if (arg === '') return '';
  if (arg === 'true') return true;
  if (arg === 'false') return false;
  if (arg === 'null' || arg === 'none') return null;
  if (/^-?\d+(\.\d+)?$/.test(arg)) return Number(arg);
  // It's a variable reference
  return resolvePath(ctx, arg);
}

/**
 * Evaluate an atomic value (before filter pipes).
 */
function evaluateAtom(atom, ctx) {
  const trimmed = atom.trim();
  // String literal
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  // Number literal
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null' || trimmed === 'none') return null;
  // Variable path
  return resolvePath(ctx, trimmed);
}

// =============================================================================
// CONDITION EVALUATOR (for {% if %})
// =============================================================================

/**
 * Evaluate a condition expression. Supports:
 *   - truthiness: {% if items %}
 *   - comparison: {% if x == 'foo' %}, {% if x > 0 %}
 *   - logical: {% if a and b %}, {% if a or b %}, {% if not a %}
 */
function evaluateCondition(expr, ctx) {
  const trimmed = expr.trim();

  // Handle 'not' prefix
  if (trimmed.startsWith('not ')) {
    return !evaluateCondition(trimmed.slice(4), ctx);
  }

  // Handle 'and' / 'or' (lowest precedence, left-to-right)
  const orParts = splitLogical(trimmed, ' or ');
  if (orParts.length > 1) {
    return orParts.some(part => evaluateCondition(part, ctx));
  }
  const andParts = splitLogical(trimmed, ' and ');
  if (andParts.length > 1) {
    return andParts.every(part => evaluateCondition(part, ctx));
  }

  // Handle comparison operators
  const cmpMatch = trimmed.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (cmpMatch) {
    const left = evaluateExpr(cmpMatch[1], ctx);
    const right = evaluateExpr(cmpMatch[3], ctx);
    switch (cmpMatch[2]) {
      case '==': return left == right;
      case '!=': return left != right;
      case '>': return left > right;
      case '<': return left < right;
      case '>=': return left >= right;
      case '<=': return left <= right;
    }
  }

  // Truthiness check
  const val = evaluateExpr(trimmed, ctx);
  if (Array.isArray(val)) return val.length > 0;
  return !!val;
}

function splitLogical(expr, op) {
  const parts = [];
  let current = '';
  let i = 0;
  while (i < expr.length) {
    if (expr.slice(i, i + op.length) === op) {
      parts.push(current);
      current = '';
      i += op.length;
    } else {
      current += expr[i];
      i++;
    }
  }
  parts.push(current);
  return parts.filter(p => p.trim());
}

// =============================================================================
// PARSER — template string → AST nodes
// =============================================================================

/**
 * @typedef {{ type: 'text', value: string }} TextNode
 * @typedef {{ type: 'expr', expr: string }} ExprNode
 * @typedef {{ type: 'for', varName: string, iterExpr: string, body: ASTNode[] }} ForNode
 * @typedef {{ type: 'if', branches: Array<{cond: string|null, body: ASTNode[]}> }} IfNode
 * @typedef {TextNode | ExprNode | ForNode | IfNode} ASTNode
 */

/**
 * Parse template into AST.
 */
function parse(template) {
  // Tokenize: split into text / tags / expressions
  const tokens = tokenize(template);
  const ast = buildAST(tokens, 0);
  return ast.nodes;
}

function tokenize(template) {
  const tokens = [];
  // Match: {# comment #}, {% tag %}, {{ expr }}
  const regex = /(\{#[\s\S]*?#\}|\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\})/;
  const parts = template.split(regex);

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('{#') && part.endsWith('#}')) {
      // Comment — skip entirely
      continue;
    } else if (part.startsWith('{%') && part.endsWith('%}')) {
      const inner = part.slice(2, -2).trim();
      tokens.push({ type: 'tag', value: inner });
    } else if (part.startsWith('{{') && part.endsWith('}}')) {
      const inner = part.slice(2, -2).trim();
      tokens.push({ type: 'expr', value: inner });
    } else {
      tokens.push({ type: 'text', value: part });
    }
  }
  return tokens;
}

function buildAST(tokens, startIdx) {
  const nodes = [];
  let i = startIdx;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === 'text') {
      nodes.push({ type: 'text', value: token.value });
      i++;
    } else if (token.type === 'expr') {
      nodes.push({ type: 'expr', expr: token.value });
      i++;
    } else if (token.type === 'tag') {
      const tag = token.value;

      if (tag.startsWith('for ')) {
        // {% for varName in iterExpr %}
        const match = tag.match(/^for\s+(\w+)\s+in\s+(.+)$/);
        if (!match) throw new Error(`Invalid for tag: {% ${tag} %}`);
        const varName = match[1];
        const iterExpr = match[2].trim();
        i++;
        const body = buildAST(tokens, i);
        i = body.endIdx;
        // Expect {% endfor %}
        if (i >= tokens.length || tokens[i].value !== 'endfor') {
          throw new Error(`Missing endfor for: {% ${tag} %}`);
        }
        i++; // skip endfor
        nodes.push({ type: 'for', varName, iterExpr, body: body.nodes });
      } else if (tag.startsWith('if ')) {
        const branches = [];
        const cond = tag.slice(3).trim();
        i++;
        const body = buildAST(tokens, i);
        i = body.endIdx;
        branches.push({ cond, body: body.nodes });

        // Handle elif/else chains
        while (i < tokens.length && tokens[i].type === 'tag') {
          const nextTag = tokens[i].value;
          if (nextTag.startsWith('elif ')) {
            const elifCond = nextTag.slice(5).trim();
            i++;
            const elifBody = buildAST(tokens, i);
            i = elifBody.endIdx;
            branches.push({ cond: elifCond, body: elifBody.nodes });
          } else if (nextTag === 'else') {
            i++;
            const elseBody = buildAST(tokens, i);
            i = elseBody.endIdx;
            branches.push({ cond: null, body: elseBody.nodes });
          } else {
            break;
          }
        }
        // Expect {% endif %}
        if (i >= tokens.length || tokens[i].value !== 'endif') {
          throw new Error(`Missing endif for: {% if ${cond} %}`);
        }
        i++; // skip endif
        nodes.push({ type: 'if', branches });
      } else if (tag === 'endfor' || tag === 'endif' || tag.startsWith('elif ') || tag === 'else') {
        // End of a block — return to caller
        return { nodes, endIdx: i };
      } else {
        throw new Error(`Unknown tag: {% ${tag} %}`);
      }
    }
  }
  return { nodes, endIdx: i };
}

// =============================================================================
// RENDERER — AST + context → output string
// =============================================================================

function renderNodes(nodes, ctx) {
  let output = '';
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        output += node.value;
        break;
      case 'expr': {
        const val = evaluateExpr(node.expr, ctx);
        output += (val == null ? '' : String(val));
        break;
      }
      case 'for':
        output += renderFor(node, ctx);
        break;
      case 'if':
        output += renderIf(node, ctx);
        break;
    }
  }
  return output;
}

function renderFor(node, ctx) {
  const items = evaluateExpr(node.iterExpr, ctx);
  if (!Array.isArray(items) || items.length === 0) return '';

  let output = '';
  for (let i = 0; i < items.length; i++) {
    const loopCtx = {
      ...ctx,
      [node.varName]: items[i],
      loop: {
        index: i + 1,
        index0: i,
        first: i === 0,
        last: i === items.length - 1,
        length: items.length,
      },
    };
    output += renderNodes(node.body, loopCtx);
  }
  return output;
}

function renderIf(node, ctx) {
  for (const branch of node.branches) {
    if (branch.cond === null || evaluateCondition(branch.cond, ctx)) {
      return renderNodes(branch.body, ctx);
    }
  }
  return '';
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Render a Jinja2-subset template with the given data context.
 *
 * @param {string} template - Template string (Jinja2 subset)
 * @param {object} data - Data context for rendering
 * @returns {string} Rendered output
 * @throws {Error} On parse or render errors
 */
export function render(template, data) {
  const ast = parse(template);
  return renderNodes(ast, data);
}

import { readFileSync } from 'node:fs';

/**
 * Render a template file with JSON data. Reads the template from disk
 * synchronously and returns the rendered string.
 *
 * @param {string} templatePath - Path to .j2 template file
 * @param {object} data - Data context
 * @returns {string} Rendered output
 */
export function renderFile(templatePath, data) {
  const template = readFileSync(templatePath, 'utf8');
  return render(template, data);
}
