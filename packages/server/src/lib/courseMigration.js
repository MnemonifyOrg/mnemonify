import { migrateCourse } from '@mnemonify/schema/migrations/index.js';

/**
 * Prepare course JSON for any server-side persistence path.
 *
 * Keeping this at the write boundary prevents an older editor payload from
 * overwriting a document that was already migrated while it was loaded.
 */
export function migrateCourseForPersistence(courseJson, courseId) {
  return migrateCourse(courseJson, { courseId });
}
