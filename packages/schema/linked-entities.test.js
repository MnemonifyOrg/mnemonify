import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourse } from './index.js';
import {
  deleteEntityEverywhere,
  detachUsageWithUpdate,
  findLinkedUsages,
  linkBlockToBank,
  materializeLinkedEntities,
  mergePagesPreservingLinked,
  mergeQuestionBanksPreservingLinked,
  unlinkUsage,
  updateLinkedEntityFromBlock,
} from './linked-entities.js';

function baseCourse() {
  return {
    schema_version: 5,
    meta: { course_id: 'crs_linked', title: 'Linked', theme: { accent: '#0f766e' } },
    variables: [],
    assets: [],
    question_banks: [{ bank_id: 'bnk_one', name: 'Bank', questions: [] }],
    linked_entities: [],
    pages: [{ page_id: 'pg_one', title: 'Page One', blocks: [{ block_id: 'blk_text', type: 'text', content: { text: 'Canonical' }, label: 'Prompt' }] }],
  };
}

test('linking creates one canonical entity and a page/bank relationship without duplicate content', () => {
  const result = linkBlockToBank(baseCourse(), 'pg_one', 'blk_text', 'bnk_one', { entityId: 'ent_one', questionId: 'bq_one' });
  const rawBlock = result.course.pages[0].blocks[0];
  assert.deepEqual(rawBlock, { block_id: 'blk_text', type: 'text', linked_entity_id: 'ent_one' });
  assert.equal(result.course.question_banks[0].questions[0].linked_entity_id, 'ent_one');
  assert.equal(result.course.question_banks[0].questions[0].content, undefined);
  assert.equal(result.course.linked_entities.length, 1);
  assert.equal(validateCourse(result.course).valid, true);
});

test('materialization restores canonical content for editor/player consumers', () => {
  const linked = linkBlockToBank(baseCourse(), 'pg_one', 'blk_text', 'bnk_one', { entityId: 'ent_one', questionId: 'bq_one' }).course;
  const materialized = materializeLinkedEntities(linked);
  assert.equal(materialized.pages[0].blocks[0].content.text, 'Canonical');
  assert.equal(materialized.question_banks[0].questions[0].content.text, 'Canonical');
});

test('confirmed entity edits are visible to every usage', () => {
  const linked = linkBlockToBank(baseCourse(), 'pg_one', 'blk_text', 'bnk_one', { entityId: 'ent_one', questionId: 'bq_one' }).course;
  const updated = updateLinkedEntityFromBlock(linked, 'ent_one', { block_id: 'blk_text', type: 'text', content: { text: 'Updated' }, linked_entity_id: 'ent_one' });
  const materialized = materializeLinkedEntities(updated);
  assert.equal(materialized.pages[0].blocks[0].content.text, 'Updated');
  assert.equal(materialized.question_banks[0].questions[0].content.text, 'Updated');
  assert.equal(findLinkedUsages(updated, 'ent_one').length, 2);
});

test('declining an edit detaches only the edited usage with its new content', () => {
  const linked = linkBlockToBank(baseCourse(), 'pg_one', 'blk_text', 'bnk_one', { entityId: 'ent_one', questionId: 'bq_one' }).course;
  const detached = detachUsageWithUpdate(linked, { kind: 'page', page_id: 'pg_one', block_id: 'blk_text', entityId: 'ent_one' }, {
    block_id: 'blk_text', type: 'text', content: { text: 'Page-only edit' }, linked_entity_id: 'ent_one', label: 'Prompt',
  });
  assert.equal(detached.pages[0].blocks[0].content.text, 'Page-only edit');
  assert.equal(detached.pages[0].blocks[0].linked_entity_id, undefined);
  assert.equal(materializeLinkedEntities(detached).question_banks[0].questions[0].content.text, 'Canonical');
  assert.equal(findLinkedUsages(detached, 'ent_one').length, 1);
});

test('unlink detaches one usage while preserving the remaining canonical relationship', () => {
  const linked = linkBlockToBank(baseCourse(), 'pg_one', 'blk_text', 'bnk_one', { entityId: 'ent_one', questionId: 'bq_one' }).course;
  const detached = unlinkUsage(linked, { kind: 'page', page_id: 'pg_one', block_id: 'blk_text', entityId: 'ent_one' });
  assert.equal(detached.pages[0].blocks[0].linked_entity_id, undefined);
  assert.equal(detached.pages[0].blocks[0].content.text, 'Canonical');
  assert.equal(detached.question_banks[0].questions[0].linked_entity_id, 'ent_one');
  assert.equal(detached.linked_entities.length, 1);
});

test('delete everywhere removes the entity and all page/bank usages', () => {
  const linked = linkBlockToBank(baseCourse(), 'pg_one', 'blk_text', 'bnk_one', { entityId: 'ent_one', questionId: 'bq_one' }).course;
  const deleted = deleteEntityEverywhere(linked, 'ent_one');
  assert.equal(deleted.pages[0].blocks.length, 0);
  assert.equal(deleted.question_banks[0].questions.length, 0);
  assert.deepEqual(deleted.linked_entities, []);
});

test('standalone blocks and bank questions retain their existing behavior', () => {
  const course = baseCourse();
  assert.equal(validateCourse(course).valid, true);
  assert.equal(materializeLinkedEntities(course).pages[0].blocks[0].content.text, 'Canonical');
});

test('button and drag linking share the same canonical link operation', () => {
  const course = baseCourse();
  const fromButton = linkBlockToBank(course, 'pg_one', 'blk_text', 'bnk_one', { entityId: 'ent_button', questionId: 'bq_button' }).course;
  const fromDrag = linkBlockToBank(course, 'pg_one', 'blk_text', 'bnk_one', { entityId: 'ent_drag', questionId: 'bq_drag' }).course;
  assert.equal(fromButton.pages[0].blocks[0].type, fromDrag.pages[0].blocks[0].type);
  assert.equal(fromButton.pages[0].blocks[0].content, undefined);
  assert.equal(fromDrag.pages[0].blocks[0].content, undefined);
  assert.equal(fromButton.question_banks[0].questions[0].linked_entity_id, 'ent_button');
  assert.equal(fromDrag.question_banks[0].questions[0].linked_entity_id, 'ent_drag');
});

test('editor updates preserve raw linked bank entries instead of serializing duplicate content', () => {
  const linked = linkBlockToBank(baseCourse(), 'pg_one', 'blk_text', 'bnk_one', { entityId: 'ent_one', questionId: 'bq_one' }).course;
  const materializedBanks = materializeLinkedEntities(linked).question_banks;
  const merged = mergeQuestionBanksPreservingLinked(linked, materializedBanks);
  assert.equal(merged[0].questions[0].content, undefined);
  assert.equal(merged[0].questions[0].linked_entity_id, 'ent_one');
});

test('editor page and block reorders preserve reference-only page usages', () => {
  const linked = linkBlockToBank(baseCourse(), 'pg_one', 'blk_text', 'bnk_one', { entityId: 'ent_one', questionId: 'bq_one' }).course;
  const materializedPages = materializeLinkedEntities(linked).pages;
  const merged = mergePagesPreservingLinked(linked, materializedPages);
  assert.equal(merged[0].blocks[0].content, undefined);
  assert.equal(merged[0].blocks[0].linked_entity_id, 'ent_one');
});
