/**
 * Lightweight JSON Schema validator — zero external dependencies.
 *
 * Supports the subset needed for template content schemas:
 *   - type: string, number, integer, boolean, array, object, null
 *   - required: array of required property names
 *   - properties: nested schema per property
 *   - additionalProperties: boolean (only false triggers errors)
 *   - items: schema for array items
 *   - enum: list of allowed values
 *   - pattern: regex pattern for strings
 *   - minLength / maxLength: string length constraints
 *   - minItems / maxItems: array length constraints
 *   - minimum / maximum: numeric bounds
 *   - default: (informational — not enforced, data should be pre-filled)
 *
 * NOT supported (not needed): $ref, allOf, oneOf, anyOf, if/then/else,
 * patternProperties, dependencies, format.
 */

/**
 * Validate a JSON value against a schema. Returns array of error strings
 * (empty = valid).
 *
 * @param {*} data - Value to validate
 * @param {object} schema - JSON Schema object
 * @param {string} [path] - Current path for error messages
 * @returns {string[]} Array of validation error messages
 */
export function validateJson(data, schema, path = '$') {
  const errors = [];

  if (!schema || typeof schema !== 'object') return errors;

  // Type check
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some(t => checkType(data, t))) {
      errors.push(`${path}: expected type ${types.join('|')}, got ${actualType(data)}`);
      return errors; // No point checking further if type is wrong
    }
  }

  // Enum
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path}: value ${JSON.stringify(data)} not in enum [${schema.enum.map(v => JSON.stringify(v)).join(', ')}]`);
  }

  // String constraints
  if (typeof data === 'string') {
    if (schema.minLength != null && data.length < schema.minLength) {
      errors.push(`${path}: string length ${data.length} < minLength ${schema.minLength}`);
    }
    if (schema.maxLength != null && data.length > schema.maxLength) {
      errors.push(`${path}: string length ${data.length} > maxLength ${schema.maxLength}`);
    }
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(data)) {
        errors.push(`${path}: string "${data.slice(0, 50)}" does not match pattern /${schema.pattern}/`);
      }
    }
  }

  // Numeric constraints
  if (typeof data === 'number') {
    if (schema.minimum != null && data < schema.minimum) {
      errors.push(`${path}: ${data} < minimum ${schema.minimum}`);
    }
    if (schema.maximum != null && data > schema.maximum) {
      errors.push(`${path}: ${data} > maximum ${schema.maximum}`);
    }
  }

  // Array constraints
  if (Array.isArray(data)) {
    if (schema.minItems != null && data.length < schema.minItems) {
      errors.push(`${path}: array length ${data.length} < minItems ${schema.minItems}`);
    }
    if (schema.maxItems != null && data.length > schema.maxItems) {
      errors.push(`${path}: array length ${data.length} > maxItems ${schema.maxItems}`);
    }
    if (schema.items) {
      for (let i = 0; i < data.length; i++) {
        errors.push(...validateJson(data[i], schema.items, `${path}[${i}]`));
      }
    }
  }

  // Object constraints
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    // Required properties
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in data)) {
          errors.push(`${path}: missing required property "${key}"`);
        }
      }
    }

    // Property schemas
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          errors.push(...validateJson(data[key], propSchema, `${path}.${key}`));
        }
      }
    }

    // Additional properties
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(data)) {
        if (!allowed.has(key)) {
          errors.push(`${path}: unexpected property "${key}"`);
        }
      }
    }

    // additionalProperties as schema (for objects with typed dynamic keys)
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const defined = schema.properties ? new Set(Object.keys(schema.properties)) : new Set();
      for (const [key, val] of Object.entries(data)) {
        if (!defined.has(key)) {
          errors.push(...validateJson(val, schema.additionalProperties, `${path}.${key}`));
        }
      }
    }
  }

  return errors;
}

// --- Helpers ---

function checkType(value, type) {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && !isNaN(value);
    case 'integer': return typeof value === 'number' && Number.isInteger(value);
    case 'boolean': return typeof value === 'boolean';
    case 'array': return Array.isArray(value);
    case 'object': return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'null': return value === null;
    default: return true;
  }
}

function actualType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
