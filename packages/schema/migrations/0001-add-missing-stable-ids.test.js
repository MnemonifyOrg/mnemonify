import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateCourse, CURRENT_SCHEMA_VERSION } from './index.js';
import { validateCourse } from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '__fixtures__');

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf-8'));
}

function collectItemIds(document) {
  const ids = [];
  function walkBlocks(blocks) {
    for (const b of blocks || []) {
      if ((b.type === 'accordion' || b.type === 'tabs') && b.content?.items) {
        for (const item of b.content.items) {
          ids.push(item.item_id);
          walkBlocks(item.body_blocks);
        }
      }
      if (b.left) walkBlocks([b.left]);
      if (b.right) walkBlocks([b.right]);
    }
  }
  for (const p of document.pages || []) walkBlocks(p.blocks);
  return ids;
}

function collectBlockIds(document) {
  const ids = [];
  function walkBlocks(blocks) {
    for (const b of blocks || []) {
      ids.push(b.block_id);
      if (b.content?.items) for (const item of b.content.items) walkBlocks(item.body_blocks);
      if (b.left) walkBlocks([b.left]);
      if (b.right) walkBlocks([b.right]);
    }
  }
  for (const p of document.pages || []) walkBlocks(p.blocks);
  return ids;
}

// -- Historical fixtures: each must reach CURRENT_SCHEMA_VERSION, validate,
// preserve every pre-existing id, and end up with every previously-missing
// id now present and unique. These are the safety net for every future
// schema change (Phase 4.5a task framing) -- treated as first-class tests,
// not smoke tests.
const V1_FIXTURES = [
  'full-course-v1.json',
  'accordion-tabs-v1.json',
  'variables-v1.json',
  'legacy-no-schema-version.json',
  'resources-string-size-bytes-v1.json',
];

for (const fixtureName of V1_FIXTURES) {
  test(`migrates ${fixtureName} to the current schema version and passes validation`, () => {
    const original = loadFixture(fixtureName);
    const originalBlockIds = collectBlockIds(original);
    const originalPageIds = (original.pages || []).map((p) => p.page_id);

    const { document, migrated } = migrateCourse(structuredClone(original), { courseId: fixtureName });

    assert.equal(document.schema_version, CURRENT_SCHEMA_VERSION);
    assert.equal(migrated, true);

    const { valid, errors } = validateCourse(document);
    assert.equal(valid, true, `expected valid, got errors: ${errors.join('; ')}`);

    // Every pre-existing block_id/page_id survives unchanged and in the
    // same order -- migration 0001 must never touch identity that already
    // works.
    assert.deepEqual(collectBlockIds(document), originalBlockIds);
    assert.deepEqual((document.pages || []).map((p) => p.page_id), originalPageIds);

    // Every accordion/tab item now has an item_id, and they're all unique.
    const itemIds = collectItemIds(document);
    for (const id of itemIds) {
      assert.ok(id, 'every accordion/tab item must have an item_id after migration');
      assert.match(id, /^itm_[a-zA-Z0-9]+$/);
    }
    assert.equal(new Set(itemIds).size, itemIds.length, 'item ids must be unique');

    // Every variable now has a variable_id, unique, and its name/type/
    // default are untouched.
    const variableIds = (document.variables || []).map((v) => v.variable_id);
    for (const id of variableIds) {
      assert.ok(id, 'every variable must have a variable_id after migration');
      assert.match(id, /^var_[a-zA-Z0-9]+$/);
    }
    assert.equal(new Set(variableIds).size, variableIds.length, 'variable ids must be unique');
    assert.deepEqual(
      (document.variables || []).map((v) => ({ name: v.name, type: v.type, default: v.default })),
      (original.variables || []).map((v) => ({ name: v.name, type: v.type, default: v.default }))
    );

    // resources' size_bytes must be a real number after migration, whatever
    // it was before (the real historical bug, DECISIONS.md).
    for (const r of document.meta?.resources || []) {
      assert.equal(typeof r.size_bytes, 'number');
    }
  });
}

test('preserves an already-present item_id/variable_id exactly rather than regenerating it', () => {
  // A document that is missing schema_version 1's ids in SOME places but
  // already has them in others (e.g. hand-patched, or migrated once
  // already and then edited) must not double-migrate or discard a
  // pre-existing id -- the idempotence requirement from the task's own
  // Step 5 spec, tested directly rather than only via the version-gate.
  const partial = loadFixture('accordion-tabs-v1.json');
  partial.pages[0].blocks[0].content.items[0].item_id = 'itm_keepme';
  const { document } = migrateCourse(partial, { courseId: 'partial-fixture' });
  assert.equal(document.pages[0].blocks[0].content.items[0].item_id, 'itm_keepme');
  // the second item on the same block, which had no item_id, still gets one
  assert.ok(document.pages[0].blocks[0].content.items[1].item_id);
});

test('a current-schema document passes through the chain unchanged (no-op)', () => {
  const original = loadFixture('already-current-v2.json');
  const { document, migrated, diagnostics } = migrateCourse(structuredClone(original), { courseId: 'already-current' });

  assert.equal(migrated, false);
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(document, original, 'a current-version document must come back byte-for-byte identical');
});

test('running the migration twice in a row is idempotent (second pass is a true no-op)', () => {
  const original = loadFixture('full-course-v1.json');
  const first = migrateCourse(structuredClone(original), { courseId: 'idempotence-1' });
  assert.equal(first.migrated, true);

  const second = migrateCourse(structuredClone(first.document), { courseId: 'idempotence-2' });
  assert.equal(second.migrated, false, 'a document already at the current version must not be re-migrated');
  assert.deepEqual(second.document, first.document, 'a second pass must not alter the already-migrated document');
});

test('refuses a course document claiming a schema_version newer than this codebase understands', () => {
  const future = loadFixture('already-current-v2.json');
  future.schema_version = CURRENT_SCHEMA_VERSION + 1;
  assert.throws(() => migrateCourse(future, { courseId: 'from-the-future' }), /newer than this codebase's current version/);
});
