import Ajv from 'ajv';
import courseSchema from './course.schema.json' with { type: 'json' };

// Single shared Ajv instance/compiled validator -- compiling a schema is
// not free, and every caller (server route handlers, migration runner,
// tests) validates against the same course.schema.json.
const ajv = new Ajv({ allErrors: true, strict: false });
const validateFn = ajv.compile(courseSchema);

export const CURRENT_SCHEMA_VERSION = courseSchema.properties.schema_version.const;

// Returns { valid: boolean, errors: string[] } -- never throws itself, so
// callers decide what "invalid" means for them (reject a request, fail a
// migration loudly, etc.) rather than this module deciding via an
// exception. `errors` is human-readable (ajv instancePath + message),
// not the raw ajv error objects, so callers can log/surface it directly.
export function validateCourse(courseJson) {
  const valid = validateFn(courseJson);
  if (valid) return { valid: true, errors: [] };
  const errors = (validateFn.errors || []).map((e) => `${e.instancePath || '(root)'} ${e.message}`);
  return { valid: false, errors };
}

export { courseSchema };
