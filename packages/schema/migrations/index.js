import { MigrationError } from './errors.js';
import { validateCourse, CURRENT_SCHEMA_VERSION } from '../index.js';
import migrations from './registry.js';

// Sequential course-document migration chain (ARCHITECTURE-AUDIT.md 4.3):
//
//   load -> inspect schema_version -> migrate N->N+1 (repeat) -> validate -> normalize -> open
//
// This is NOT the same thing as packages/server/src/migrate.js (Postgres
// table/column migrations, run once via `npm run migrate`). This module
// migrates the shape of a single course_json DOCUMENT, in memory, every
// time one is loaded that isn't already at CURRENT_SCHEMA_VERSION -- there
// is no "have I run this yet" tracking table, because the document's own
// schema_version field is that tracking state.
//
// Callers own the "original retained until the migrated version saves
// successfully" contract (ARCHITECTURE-AUDIT.md 4.3) -- this function is
// pure and side-effect-free (it never writes to the database or the
// filesystem), so a caller gets to decide, after this returns
// successfully, whether/when to persist `document` in place of the
// original. See packages/server/src/routes/courses.js for the real
// implementation of that contract.
export function migrateCourse(courseJson, { courseId } = {}) {
  if (!courseJson || typeof courseJson !== 'object') {
    throw new MigrationError('Course document is missing or not an object.', { courseId });
  }

  // A handful of courses in the dev database predate schema_version being
  // set on every document at all (found running this migration against
  // real data for the first time -- see DECISIONS.md). schema_version 1
  // is the only version that ever existed before this migration system
  // did, so treating "absent" as "1" is not a guess among several
  // possibilities -- it's the one shape old enough to have skipped the
  // field entirely. This is NOT the same as downgrade tolerance: a
  // present-but-too-high schema_version is still refused below.
  if (courseJson.schema_version === undefined || courseJson.schema_version === null) {
    console.warn(`[migration]${courseId ? ` course ${courseId}:` : ''} schema_version was absent entirely; assuming 1 (the only version that predates this field existing).`);
    courseJson = { ...courseJson, schema_version: 1 };
  }
  if (typeof courseJson.schema_version !== 'number') {
    throw new MigrationError(`Course document has a non-numeric schema_version: ${JSON.stringify(courseJson.schema_version)}.`, {
      courseId,
    });
  }

  const startVersion = courseJson.schema_version;

  if (startVersion > CURRENT_SCHEMA_VERSION) {
    throw new MigrationError(
      `Course document is at schema_version ${startVersion}, newer than this codebase's current version ` +
        `(${CURRENT_SCHEMA_VERSION}). Downgrades are not supported -- refusing to guess.`,
      { courseId, fromVersion: startVersion, toVersion: CURRENT_SCHEMA_VERSION }
    );
  }

  let doc = courseJson;
  const diagnostics = [];

  while (doc.schema_version < CURRENT_SCHEMA_VERSION) {
    const step = migrations.find((m) => m.fromVersion === doc.schema_version);
    if (!step) {
      throw new MigrationError(
        `No migration is registered to advance schema_version ${doc.schema_version} toward ${CURRENT_SCHEMA_VERSION}. ` +
          `The migration chain has a gap.`,
        { courseId, fromVersion: doc.schema_version, toVersion: CURRENT_SCHEMA_VERSION }
      );
    }

    let result;
    try {
      // Migrations are pure functions (ARCHITECTURE-AUDIT.md 4.3). Cloning
      // before handing off is this runner's own guarantee that a migration
      // accidentally mutating its input can never corrupt the caller's
      // original object -- callers rely on that object staying untouched
      // until they've decided to persist the migrated result.
      result = step.migrate(structuredClone(doc));
    } catch (err) {
      throw new MigrationError(
        `Migration "${step.id}" (v${step.fromVersion} -> v${step.toVersion}) threw while running: ${err.message}`,
        { courseId, fromVersion: step.fromVersion, toVersion: step.toVersion, cause: err }
      );
    }

    if (!result || typeof result !== 'object' || !result.document) {
      throw new MigrationError(`Migration "${step.id}" did not return a { document, diagnostics } result.`, {
        courseId,
        fromVersion: step.fromVersion,
        toVersion: step.toVersion,
      });
    }
    if (result.document.schema_version !== step.toVersion) {
      throw new MigrationError(
        `Migration "${step.id}" was supposed to produce schema_version ${step.toVersion} but produced ` +
          `${result.document.schema_version}.`,
        { courseId, fromVersion: step.fromVersion, toVersion: step.toVersion }
      );
    }

    diagnostics.push({ id: step.id, fromVersion: step.fromVersion, toVersion: step.toVersion, ...result.diagnostics });
    doc = result.document;
  }

  // Reserved normalize step (ARCHITECTURE-AUDIT.md 4.3's documented
  // flow). No normalization is needed by any migration registered today,
  // so this is intentionally a passthrough -- the hook exists so a future
  // migration has a defined place to add one without reshaping this runner.
  doc = normalize(doc);

  const { valid, errors } = validateCourse(doc);
  if (!valid) {
    throw new MigrationError(
      `Course document failed schema validation after migrating from v${startVersion} to v${doc.schema_version}: ` +
        errors.join('; '),
      { courseId, fromVersion: startVersion, toVersion: doc.schema_version }
    );
  }

  const migrated = startVersion !== doc.schema_version;
  if (migrated) {
    for (const d of diagnostics) {
      console.log(`[migration]${courseId ? ` course ${courseId}:` : ''} ${d.id} (v${d.fromVersion} -> v${d.toVersion})`, d);
    }
  }

  return { document: doc, diagnostics, migrated };
}

function normalize(doc) {
  return doc;
}

export { MigrationError } from './errors.js';
export { CURRENT_SCHEMA_VERSION };
