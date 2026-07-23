import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourse } from './index.js';
import {
  deleteEntityEverywhere,
  findLinkedUsages,
  linkBlockToBank,
  materializeLinkedEntities,
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
  assert.deepEqual(rawBlock, { block_id: 'blk_text', type: 'text', label: 'Prompt', linked_entity_id: 'ent_one' });
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
