import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourse } from './index.js';
import { objectiveLabel, resolveQuestionBankDrawPool, resolveQuestionBankPool } from './objectives.js';

function course(overrides = {}) {
  return {
    schema_version: 4,
    meta: {
      course_id: 'crs_objectives',
      title: 'Objectives',
      theme: { accent: '#0f766e' },
      ...overrides.meta,
    },
    variables: [],
    assets: [],
    question_banks: [],
    pages: [{ page_id: 'pg_one', title: 'One', blocks: [] }],
    ...overrides,
  };
}

test('accepts new label/description objectives, group assignment, inline mapping, and bank mapping', () => {
  const result = validateCourse(course({
    meta: {
      course_id: 'crs_objectives',
      title: 'Objectives',
      theme: { accent: '#0f766e' },
      objectives: [{ objective_id: 'obj_one', label: 'Identify the finding', description: 'Recognize it.' }],
      page_groups: [{ group_id: 'grp_one', title: 'Module One', page_ids: ['pg_one'], objective_ids: ['obj_one'] }],
    },
    question_banks: [{
      bank_id: 'bnk_one',
      questions: [{
        question_id: 'bq_one',
        content: { question: 'What is it?', options: [{ id: 'opt_a', text: 'A', correct: true }, { id: 'opt_b', text: 'B', correct: false }] },
        scored: true,
        objective_ids: ['obj_one'],
      }],
    }],
    pages: [{
      page_id: 'pg_one',
      title: 'One',
      blocks: [{
        block_id: 'blk_one',
        type: 'knowledge-check',
        content: { question: 'What is it?', options: [{ id: 'opt_a', text: 'A', correct: true }, { id: 'opt_b', text: 'B', correct: false }] },
        objective_ids: ['obj_one'],
      }],
    }],
  }));
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('accepts an objective-aware question-bank draw fallback', () => {
  const result = validateCourse(course({
    meta: {
      course_id: 'crs_objectives',
      title: 'Objectives',
      theme: { accent: '#0f766e' },
      page_groups: [{ group_id: 'grp_one', title: 'Module One', page_ids: ['pg_one'], objective_ids: ['obj_one'] }],
    },
    question_banks: [{
      bank_id: 'bnk_one',
      questions: [{
        question_id: 'bq_one',
        content: { question: 'What is it?', options: [{ id: 'opt_a', text: 'A', correct: true }, { id: 'opt_b', text: 'B', correct: false }] },
        scored: true,
        objective_ids: ['obj_one'],
      }],
    }],
    pages: [{
      page_id: 'pg_one',
      title: 'One',
      blocks: [{
        block_id: 'blk_draw',
        type: 'question_bank_draw',
        content: { bank_id: 'bnk_one', draw_count: 1, objective_fallback: 'include_unmapped' },
      }],
    }],
  }));
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('accepts legacy text objectives and courses with no objectives unchanged', () => {
  assert.equal(validateCourse(course()).valid, true);
  assert.equal(validateCourse(course({
    meta: {
      course_id: 'crs_objectives',
      title: 'Legacy',
      theme: { accent: '#0f766e' },
      objectives: [{ objective_id: 'obj_legacy', text: 'Legacy objective', standard_code: '' }],
    },
  })).valid, true);
  assert.equal(objectiveLabel({ objective_id: 'obj_legacy', text: 'Legacy objective' }), 'Legacy objective');
});

test('filters bank questions by intersection and supports per-draw fallback choices', () => {
  const bank = {
    questions: [
      { question_id: 'bq_match', objective_ids: ['obj_one'] },
      { question_id: 'bq_other', objective_ids: ['obj_two'] },
      { question_id: 'bq_unmapped' },
    ],
  };
  const group = { objective_ids: ['obj_one'] };
  const filtered = resolveQuestionBankPool(bank, group);
  assert.deepEqual(filtered.matchingQuestions.map((question) => question.question_id), ['bq_match']);
  assert.deepEqual(filtered.unmappedQuestions.map((question) => question.question_id), ['bq_unmapped']);

  const fewer = resolveQuestionBankDrawPool(bank, group, 2, 'draw_fewer');
  assert.equal(fewer.needsFallbackChoice, true);
  assert.deepEqual(fewer.eligibleQuestions.map((question) => question.question_id), ['bq_match']);

  const filled = resolveQuestionBankDrawPool(bank, group, 2, 'include_unmapped');
  assert.deepEqual(filled.eligibleQuestions.map((question) => question.question_id), ['bq_match', 'bq_unmapped']);
});

test('does not filter when a module has no objective assignment', () => {
  const bank = { questions: [{ question_id: 'bq_one' }, { question_id: 'bq_two', objective_ids: ['obj_two'] }] };
  const result = resolveQuestionBankPool(bank, { objective_ids: [] });
  assert.equal(result.filtered, false);
  assert.equal(result.eligibleQuestions.length, 2);
});
