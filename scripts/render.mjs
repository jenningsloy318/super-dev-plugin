#!/usr/bin/env node
/**
 * Template Render CLI — validates JSON data against a schema, then renders
 * through a Jinja2-subset template to produce gate-compliant markdown.
 *
 * Usage:
 *   node render.mjs --template <file.j2> --data <data.json> --output <output.md>
 *   node render.mjs --template <file.j2> --data <data.json>  # stdout
 *   node render.mjs --template <file.j2> --schema <schema.json> --data <data.json> --output <out.md>
 *
 * Exit codes:
 *   0 = Success (rendered output written)
 *   1 = Validation error (JSON doesn't match schema)
 *   2 = Render error (template syntax or missing variable)
 *   3 = File error (missing template/data/schema file)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { render } from './lib/template-engine.mjs';
import { validateJson } from './lib/schema-validator.mjs';

// --- Parse CLI arguments ---
const argv = process.argv.slice(2);
let templatePath = null;
let dataPath = null;
let schemaPath = null;
let outputPath = null;

for (let i = 0; i < argv.length; i++) {
  switch (argv[i]) {
    case '--template': case '-t': templatePath = argv[++i]; break;
    case '--data': case '-d': dataPath = argv[++i]; break;
    case '--schema': case '-s': schemaPath = argv[++i]; break;
    case '--output': case '-o': outputPath = argv[++i]; break;
    case '--help': case '-h':
      console.log(`Usage: node render.mjs --template <file.j2> --data <data.json> [--schema <schema.json>] [--output <output.md>]`);
      process.exit(0);
  }
}

if (!templatePath || !dataPath) {
  console.error('ERROR: --template and --data are required.');
  console.error('Usage: node render.mjs --template <file.j2> --data <data.json> [--schema <schema.json>] [--output <output.md>]');
  process.exit(3);
}

// --- Read files ---
let template, data, schema;

try {
  template = readFileSync(resolve(templatePath), 'utf8');
} catch (e) {
  console.error(`ERROR: Cannot read template: ${templatePath}`);
  console.error(e.message);
  process.exit(3);
}

try {
  const raw = readFileSync(resolve(dataPath), 'utf8');
  data = JSON.parse(raw);
} catch (e) {
  console.error(`ERROR: Cannot read/parse data JSON: ${dataPath}`);
  console.error(e.message);
  process.exit(3);
}

if (schemaPath) {
  try {
    const raw = readFileSync(resolve(schemaPath), 'utf8');
    schema = JSON.parse(raw);
  } catch (e) {
    console.error(`ERROR: Cannot read/parse schema: ${schemaPath}`);
    console.error(e.message);
    process.exit(3);
  }
}

// --- Validate against schema (if provided) ---
if (schema) {
  const errors = validateJson(data, schema);
  if (errors.length > 0) {
    console.error('VALIDATION ERRORS:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}

// --- Render template ---
let output;
try {
  output = render(template, data);
} catch (e) {
  console.error(`RENDER ERROR: ${e.message}`);
  process.exit(2);
}

// --- Write output ---
if (outputPath) {
  const dir = dirname(resolve(outputPath));
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(outputPath), output, 'utf8');
  console.log(`OK: ${outputPath}`);
} else {
  process.stdout.write(output);
}
