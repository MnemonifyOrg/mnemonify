import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNamedSnapshot,
  restoreCourseFromSnapshot,
  sortVersionsNewestFirst,
  validateVersionName,
} from './courseVersions.js';

const courseJson = {
  schema_version: 1,
  meta: { title: 'Clinical Cases' },
  pages: [{ page_id: 'page_1', blocks: [{ block_id: 'block_1', type: 'text', content: { text: 'Hello' } }] }],
  assets: [{ asset_id: 'asset_1', kind: 'image' }],
};

test('named snapshot preserves the complete course document and asset manifest', () => {
  const snapshot = createNamedSnapshot({
    courseId: 'course_1',
    name: 'Alpha',
    createdBy: 'user_1',
    courseJson,
    versionId: 'version_1',
    createdAt: '2026-07-22T12:00:00.000Z',
  });

  assert.equal(snapshot.kind, 'named_snapshot');
  assert.equal(snapshot.name, 'Alpha');
  assert.equal(snapshot.course_id, 'course_1');
  assert.deepEqual(snapshot.course_json, courseJson);
  assert.deepEqual(snapshot.asset_manifest, courseJson.assets);
  snapshot.course_json.pages[0].blocks[0].content.text = 'mutated copy';
  assert.equal(courseJson.pages[0].blocks[0].content.text, 'Hello');
});

test('restore applies a snapshot and appends a new lineage record without mutating source history', () => {
  const source = createNamedSnapshot({
    courseId: 'course_1',
    name: 'Gold',
    createdBy: 'user_1',
    courseJson,
    versionId: 'version_gold',
  });
  const current = { id: 'course_1', title: 'Draft', course_json: { meta: { title: 'Draft' }, pages: [] } };

  const result = restoreCourseFromSnapshot({
    currentCourse: current,
    sourceVersion: source,
    createdBy: 'user_1',
    versionId: 'version_restore',
    createdAt: '2026-07-22T13:00:00.000Z',
  });

  assert.deepEqual(result.course.course_json, source.course_json);
  assert.equal(result.course.title, 'Clinical Cases');
  assert.equal(result.version.name, 'Restore: Gold');
  assert.equal(result.version.restored_from_version_id, 'version_gold');
  assert.equal(result.version.version_id, 'version_restore');
  assert.deepEqual(source.course_json, courseJson);
  assert.deepEqual(current.course_json, { meta: { title: 'Draft' }, pages: [] });
});

test('version lists sort newest first and preserve deterministic order for equal timestamps', () => {
  const versions = [
    { version_id: 'a', created_at: '2026-07-22T12:00:00.000Z' },
    { version_id: 'c', created_at: '2026-07-22T13:00:00.000Z' },
    { version_id: 'b', created_at: '2026-07-22T12:00:00.000Z' },
  ];
  assert.deepEqual(sortVersionsNewestFirst(versions).map((version) => version.version_id), ['c', 'b', 'a']);
});

test('version names are required and bounded', () => {
  assert.throws(() => validateVersionName('   '), /required/);
  assert.throws(() => validateVersionName('x'.repeat(121)), /120/);
  assert.equal(validateVersionName('  Beta  '), 'Beta');
});
