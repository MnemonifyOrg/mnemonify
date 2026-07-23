import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bulkAssignObjective,
  bulkAssignTag,
  bulkDeleteQuestions,
  bulkRemoveObjective,
  bulkRemoveTag,
  filterBankQuestions,
  questionSearchText,
} from './questionBank.js';

const questions = [
  {
    question_id: 'bq_one',
    objective_ids: ['obj_a'],
    tags: ['review'],
    content: { question: [{ t: 'text', v: 'Find the translocation' }], options: [{ text: 'ALK rearrangement' }] },
  },
  {
    question_id: 'bq_two',
    objective_ids: ['obj_b'],
    tags: ['advanced'],
    content: { question: 'Explain the mechanism', question_type: 'multi-select', options: [] },
  },
  { question_id: 'bq_three', content: { question: 'Name the stain', options: [] } },
];

test('search indexes rich question text, options, and tags', () => {
  assert.match(questionSearchText(questions[0]), /alk rearrangement/);
  assert.equal(filterBankQuestions(questions, { query: 'translocation' }).map((q) => q.question_id).join(), 'bq_one');
  assert.equal(filterBankQuestions(questions, { query: 'advanced' }).map((q) => q.question_id).join(), 'bq_two');
});

test('filters by question type and objective independently', () => {
  assert.deepEqual(filterBankQuestions(questions, { type: 'multi-select' }).map((q) => q.question_id), ['bq_two']);
  assert.deepEqual(filterBankQuestions(questions, { objectiveId: 'obj_a' }).map((q) => q.question_id), ['bq_one']);
});

test('bulk delete only removes selected questions', () => {
  assert.deepEqual(bulkDeleteQuestions(questions, ['bq_two']).map((q) => q.question_id), ['bq_one', 'bq_three']);
});

test('bulk objective and tag operations are additive, removable, and immutable', () => {
  const assignedObjective = bulkAssignObjective(questions, ['bq_one', 'bq_three'], 'obj_b');
  assert.deepEqual(assignedObjective[0].objective_ids, ['obj_a', 'obj_b']);
  assert.deepEqual(assignedObjective[2].objective_ids, ['obj_b']);
  assert.deepEqual(questions[0].objective_ids, ['obj_a']);

  const removedObjective = bulkRemoveObjective(assignedObjective, ['bq_one'], 'obj_a');
  assert.deepEqual(removedObjective[0].objective_ids, ['obj_b']);
  const tagged = bulkAssignTag(removedObjective, ['bq_one', 'bq_two'], 'exam');
  assert.deepEqual(tagged[0].tags, ['review', 'exam']);
  assert.deepEqual(tagged[1].tags, ['advanced', 'exam']);
  const untagged = bulkRemoveTag(tagged, ['bq_one'], 'review');
  assert.deepEqual(untagged[0].tags, ['exam']);
});
