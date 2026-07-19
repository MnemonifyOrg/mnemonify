// Thrown by the migration chain runner (index.js) whenever a course
// document cannot be safely opened: a migration step itself threw, the
// document claims a schema_version newer than this codebase understands
// (a downgrade scenario -- never assumed safe, per ARCHITECTURE-AUDIT.md
// 4.3), or the fully-migrated result still fails schema validation. Every
// caller (server route handlers, the editor's load path) must let this
// propagate as a loud, explicit failure -- never catch it and silently
// serve the unmigrated or partially-migrated document instead.
export class MigrationError extends Error {
  constructor(message, { courseId, fromVersion, toVersion, cause } = {}) {
    super(message);
    this.name = 'MigrationError';
    this.courseId = courseId;
    this.fromVersion = fromVersion;
    this.toVersion = toVersion;
    if (cause) this.cause = cause;
  }
}
