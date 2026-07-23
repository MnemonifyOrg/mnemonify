import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourse } from './index.js';
import { getCorrectOptionIds, isKnowledgeCheckAnswerCorrect, getKnowledgeCheckOptionFeedback } from './knowledge-check.js';

function courseWithBlock(content) {
  return {
    schema_version: 5,
    meta: { course_id: 'crs_multiselect', title: 'Multi-select', theme: { accent: '#0f766e' } },
    variables: [],
    assets: [],
    question_banks: [],
    linked_entities: [],
    pages: [{ page_id: 'pg_one', title: 'One', blocks: [{ block_id: 'blk_kc', type: 'knowledge-check', content }] }],
  };
}

const options = [
  { id: 'opt_a', text: 'A', correct: true },
  { id: 'opt_b', text: 'B', correct: true },
  { id: 'opt_c', text: 'C', correct: false },
];

test('accepts multi-select answer keys and feedback modes', () => {
  const result = validateCourse(courseWithBlock({
    question: 'Select all that apply',
    options,
    multi_select: true,
    correct_option_ids: ['opt_a', 'opt_b'],
    feedback_mode: 'per_option',
  }));
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('old single-select content remains valid and resolves its existing option key', () => {
  const content = { question: 'Choose one', options };
  assert.equal(validateCourse(courseWithBlock(content)).valid, true);
  assert.deepEqual(getCorrectOptionIds(content), ['opt_a']);
  assert.equal(isKnowledgeCheckAnswerCorrect(content, 'opt_a'), true);
});

test('multi-select answer keys use exact set equality with no partial credit', () => {
  const content = { multi_select: true, correct_option_ids: ['opt_a', 'opt_b'], options };
  assert.equal(isKnowledgeCheckAnswerCorrect(content, ['opt_b', 'opt_a']), true);
  assert.equal(isKnowledgeCheckAnswerCorrect(content, ['opt_a']), false);
  assert.equal(isKnowledgeCheckAnswerCorrect(content, ['opt_a', 'opt_b', 'opt_c']), false);
  assert.equal(isKnowledgeCheckAnswerCorrect(content, ['opt_a', 'opt_c']), false);
});

test('per-option feedback reports selected and answer-key state independently', () => {
  const content = { multi_select: true, correct_option_ids: ['opt_a', 'opt_b'], options };
  assert.deepEqual(getKnowledgeCheckOptionFeedback(content, ['opt_a', 'opt_c']), [
    { id: 'opt_a', selected: true, correct: true },
    { id: 'opt_b', selected: false, correct: true },
    { id: 'opt_c', selected: true, correct: false },
  ]);
});
