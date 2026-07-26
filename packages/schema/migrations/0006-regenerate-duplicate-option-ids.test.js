import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeCourse } from '../analyzer/index.js';
import { migrateCourse, CURRENT_SCHEMA_VERSION } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, '__fixtures__', 'duplicate-option-ids-v6.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function inlineKnowledgeChecks(document) {
  return document.pages.flatMap((page) => page.blocks)
    .filter((block) => block.type === 'knowledge-check')
    .map((block) => block.content);
}

test('v6→v7 regenerates duplicate answer-option IDs and updates local answer references', () => {
  const original = loadFixture();
  const input = structuredClone(original);
  const { document, diagnostics, migrated } = migrateCourse(input, { courseId: 'duplicate-option-ids-v6' });

  assert.equal(migrated, true);
  assert.equal(document.schema_version, CURRENT_SCHEMA_VERSION);
  assert.equal(input.schema_version, 6);
  assert.deepEqual(input, original, 'the pure migration must not mutate its input');

  const contents = inlineKnowledgeChecks(document);
  const bankContent = document.question_banks[0].questions[0].content;
  const allOptions = [...contents, bankContent].flatMap((content) => content.options);
  const allIds = allOptions.map((option) => option.id);
  assert.equal(new Set(allIds).size, allIds.length, 'every option ID must be unique after migration');
  assert.equal(allIds.filter((id) => id === 'opt_shared').length, 1, 'the first occurrence keeps the original ID');
  assert.ok(allIds.filter((id) => id !== 'opt_shared' && /^opt_/.test(id)).length >= 2);

  assert.equal(contents[0].correct_option_id, 'opt_shared');
  assert.notEqual(contents[1].correct_option_ids[0], 'opt_shared');
  assert.equal(contents[1].correct_option_ids[1], 'opt_two_other');
  assert.notEqual(bankContent.correct_option_id, 'opt_shared');
  const duplicateDiagnostics = diagnostics.find((entry) => entry.id === '0006-regenerate-duplicate-option-ids');
  assert.equal(duplicateDiagnostics.duplicateOptionGroupsFound, 1);
  assert.equal(duplicateDiagnostics.duplicateOptionIdsRegenerated, 2);
  assert.equal(duplicateDiagnostics.optionReferencesUpdated, 2);
  assert.deepEqual(analyzeCourse(document).filter((finding) => finding.ruleId === 'reference.duplicate_stable_id'), []);
});

test('v6→v7 is deterministic, idempotent for v7 documents, and a duplicate-free course is otherwise unchanged', () => {
  const original = loadFixture();
  const first = migrateCourse(structuredClone(original), { courseId: 'duplicate-option-first' });
  const second = migrateCourse(structuredClone(original), { courseId: 'duplicate-option-second' });
  assert.deepEqual(first.document, second.document);

  const again = migrateCourse(structuredClone(first.document), { courseId: 'duplicate-option-again' });
  assert.equal(again.migrated, false);
  assert.deepEqual(again.document, first.document);

  const duplicateFree = loadFixture();
  duplicateFree.schema_version = 7;
  duplicateFree.pages[0].blocks[1].content.options[0].id = 'opt_second_unique';
  duplicateFree.pages[0].blocks[1].content.correct_option_ids = ['opt_second_unique', 'opt_two_other'];
  duplicateFree.question_banks[0].questions[0].content.options[0].id = 'opt_bank_unique';
  duplicateFree.question_banks[0].questions[0].content.correct_option_id = 'opt_bank_unique';
  assert.deepEqual(migrateCourse(structuredClone(duplicateFree), { courseId: 'duplicate-free-current' }).document, duplicateFree);
});

test('a repeated ID within one question keeps local references on the canonical first option', () => {
  const document = loadFixture();
  document.pages[0].blocks[0].content.options[1].id = 'opt_shared';
  document.pages[0].blocks[0].content.correct_option_id = 'opt_shared';

  const migrated = migrateCourse(document, { courseId: 'same-question-duplicate' }).document;
  const options = migrated.pages[0].blocks[0].content.options;
  assert.equal(options[0].id, 'opt_shared');
  assert.notEqual(options[1].id, 'opt_shared');
  assert.equal(migrated.pages[0].blocks[0].content.correct_option_id, 'opt_shared');
});
