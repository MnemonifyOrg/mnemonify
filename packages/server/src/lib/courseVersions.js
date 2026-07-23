import crypto from 'node:crypto';

export const NAMED_SNAPSHOT_KIND = 'named_snapshot';

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export function validateVersionName(name) {
  const normalized = typeof name === 'string' ? name.trim() : '';
  if (!normalized) throw new Error('Version name is required.');
  if (normalized.length > 120) throw new Error('Version name must be 120 characters or fewer.');
  return normalized;
}

export function createNamedSnapshot({
  courseId,
  name,
  createdBy,
  courseJson,
  versionId = crypto.randomUUID(),
  createdAt = new Date().toISOString(),
  restoredFromVersionId = null,
}) {
  return {
    version_id: versionId,
    course_id: courseId,
    kind: NAMED_SNAPSHOT_KIND,
    name: validateVersionName(name),
    created_by: createdBy,
    created_at: createdAt,
    restored_from_version_id: restoredFromVersionId,
    course_json: clone(courseJson || {}),
    asset_manifest: clone(courseJson?.assets || []),
  };
}

export function sortVersionsNewestFirst(versions = []) {
  return [...versions].sort((a, b) => {
    const timeDelta = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (timeDelta !== 0) return timeDelta;
    return String(b.version_id || '').localeCompare(String(a.version_id || ''));
  });
}

export function restoreCourseFromSnapshot({ currentCourse, sourceVersion, createdBy, versionId, createdAt }) {
  const restoredJson = clone(sourceVersion.course_json || {});
  const restoredCourse = {
    ...currentCourse,
    title: restoredJson.meta?.title || currentCourse.title,
    course_json: restoredJson,
  };
  const restoreVersion = createNamedSnapshot({
    courseId: currentCourse.id,
    name: `Restore: ${sourceVersion.name}`,
    createdBy,
    courseJson: restoredJson,
    versionId,
    createdAt,
    restoredFromVersionId: sourceVersion.version_id,
  });
  return { course: restoredCourse, version: restoreVersion };
}

export function versionForResponse(row) {
  return {
    version_id: row.version_id,
    course_id: row.course_id,
    kind: row.kind,
    name: row.name,
    created_by: row.created_by,
    created_at: row.created_at,
    restored_from_version_id: row.restored_from_version_id,
    author: row.author || row.author_name || row.created_by,
    course_json: row.course_json,
  };
}
