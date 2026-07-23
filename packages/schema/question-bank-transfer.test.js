import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNativeQuestionBankExport,
  exportQuestionBankAsGift,
  importNativeQuestionBank,
  inspectNativeQuestionBankImport,
} from './question-bank-transfer.js';
import { materializeLinkedEntities } from './linked-entities.js';
import { validateCourse } from './index.js';

function baseCourse() {
  return {
    schema_version: 5,
    meta: {
      course_id: 'crs_transfer',
      title: 'Transfer Course',
      theme: { accent: '#0f766e' },
      objectives: [{ objective_id: 'obj_known', label: 'Known objective' }],
    },
    variables: [{ variable_id: 'var_score', name: 'ScoreRaw', type: 'number', default: 0 }],
    assets: [{ asset_id: 'ast_one', kind: 'image', src: 'uploads/one.png', alt: 'One' }],
    question_banks: [{ bank_id: 'bnk_case', name: 'Case bank', questions: [] }, { bank_id: 'bnk_other', name: 'Other bank', questions: [] }],
    linked_entities: [],
    pages: [{ page_id: 'pg_one', title: 'Page', blocks: [] }],
  };
}

function question(overrides = {}) {
  return {
    question_id: 'bq_one',
    scored: true,
    objective_ids: ['obj_known'],
    tags: ['case'],
    content: {
      scored: true,
      question: [{ t: 'text', v: 'Choose {ScoreRaw}' }],
      options: [
        { id: 'opt_a', text: 'Correct', correct: true, image_id: 'ast_one' },
        { id: 'opt_b', text: 'Wrong', correct: false },
      ],
      multi_select: false,
      feedback_mode: 'summary',
      correct_feedback: [{ t: 'variable', var_name: 'ScoreRaw' }],
    },
    ...overrides,
  };
}

test('native export/import round-trips full question fidelity', () => {
  const course = baseCourse();
  course.question_banks[0].questions = [question()];
  const exported = buildNativeQuestionBankExport(course, 'bnk_case', '2026-07-22T00:00:00.000Z');
  assert.equal(exported.format, 'mnemonify.question_bank');
  assert.equal(exported.bank.questions[0].content.multi_select, false);
  assert.deepEqual(exported.bank.questions[0].content.correct_feedback[0], { t: 'variable', var_name: 'ScoreRaw' });

  const target = baseCourse();
  target.question_banks = [];
  const imported = importNativeQuestionBank(target, exported, {
    mode: 'create_new',
    idFactory: {
      bank: () => 'bnk_imported',
      question: () => 'bq_imported',
      entity: () => 'ent_imported',
    },
  });
  assert.equal(imported.course.question_banks[0].name, 'Case bank');
  assert.equal(validateCourse(imported.course).valid, true);
  assert.deepEqual(imported.importedQuestions[0], question());
});

test('native exports preserve linked-question metadata and import it as a valid canonical entity', () => {
  const course = baseCourse();
  course.linked_entities = [{
    entity_id: 'ent_source',
    block_type: 'knowledge-check',
    content: question().content,
    metadata: { scored: true, objective_ids: ['obj_known'], tags: ['case'], block_fields: {} },
  }];
  course.question_banks[0].questions = [{ question_id: 'bq_one', linked_entity_id: 'ent_source', scored: true, objective_ids: ['obj_known'], tags: ['case'] }];
  const exported = buildNativeQuestionBankExport(course, 'bnk_case', '2026-07-22T00:00:00.000Z');
  assert.equal(exported.linked_entities[0].entity_id, 'ent_source');
  const imported = importNativeQuestionBank(baseCourse(), exported, { mode: 'merge', targetBankId: 'bnk_other', idFactory: { bank: () => 'bnk_new', question: () => 'bq_new', entity: () => 'ent_new' } });
  assert.equal(imported.course.question_banks.find((bank) => bank.bank_id === 'bnk_other').questions[0].linked_entity_id, 'ent_source');
  assert.equal(imported.course.linked_entities[0].entity_id, 'ent_source');
  assert.equal(materializeLinkedEntities(imported.course).question_banks[1].questions[0].content.question[0].v, 'Choose {ScoreRaw}');
});

test('GIFT export has valid question/answer structure and reports known fidelity gaps', () => {
  const course = baseCourse();
  course.question_banks[0].questions = [question({ content: { ...question().content, multi_select: true, correct_option_ids: ['opt_a'] } })];
  const gift = exportQuestionBankAsGift(course, 'bnk_case');
  assert.match(gift.content, /::Choose \\{ScoreRaw\\}::/);
  assert.match(gift.content, /\n\{\n=Correct\n~Wrong\n\}/);
  assert.ok(gift.warnings.some((warning) => warning.includes('objectives')));
});

test('merge appends questions, create-new makes a new bank, and collisions are remapped', () => {
  const source = baseCourse();
  source.question_banks[0].questions = [question()];
  const exported = buildNativeQuestionBankExport(source, 'bnk_case');
  const target = baseCourse();
  target.question_banks[0].questions = [question()];
  const merged = importNativeQuestionBank(target, exported, { mode: 'merge', targetBankId: 'bnk_case', idFactory: { bank: () => 'bnk_new', question: () => 'bq_remapped', entity: () => 'ent_new' } });
  assert.equal(merged.course.question_banks[0].questions.length, 2);
  assert.deepEqual(merged.idRemaps, [{ from: 'bq_one', to: 'bq_remapped' }]);

  const created = importNativeQuestionBank(target, exported, { mode: 'create_new', idFactory: { bank: () => 'bnk_created', question: () => 'bq_created', entity: () => 'ent_new' } });
  assert.ok(created.course.question_banks.some((bank) => bank.bank_id === 'bnk_created'));
  assert.equal(created.course.question_banks.find((bank) => bank.bank_id === 'bnk_created').questions[0].question_id, 'bq_created');
});

test('missing objectives and variables are listed with question locations and do not block preview', () => {
  const course = baseCourse();
  const payload = buildNativeQuestionBankExport({ ...course, question_banks: [{ bank_id: 'bnk_source', name: 'Source', questions: [question({ objective_ids: ['obj_missing'], content: { ...question().content, question: [{ t: 'variable', var_name: 'MissingVariable' }] } })] }], }, 'bnk_source');
  const preview = inspectNativeQuestionBankImport(course, payload, 'bnk_case');
  assert.deepEqual(preview.missingObjectives, [{ id: 'obj_missing', question_id: 'bq_one', location: 'Question 1.objective_ids' }]);
  assert.deepEqual(preview.missingVariables, [{ name: 'MissingVariable', question_id: 'bq_one', location: 'Question 1.content.question[0]' }]);
  const imported = importNativeQuestionBank(course, payload, { mode: 'merge', targetBankId: 'bnk_case', idFactory: { bank: () => 'bnk_new', question: () => 'bq_new', entity: () => 'ent_new' } });
  assert.deepEqual(imported.missingObjectives, preview.missingObjectives);
  assert.deepEqual(imported.missingVariables, preview.missingVariables);
  assert.equal(imported.course.question_banks[0].questions[0].objective_ids[0], 'obj_missing');
});

test('banks outside the transfer operation are unchanged', () => {
  const course = baseCourse();
  course.question_banks[0].questions = [question()];
  const untouched = structuredClone(course.question_banks[1]);
  const exported = buildNativeQuestionBankExport(course, 'bnk_case');
  const imported = importNativeQuestionBank(course, exported, { mode: 'merge', targetBankId: 'bnk_case', idFactory: { bank: () => 'bnk_new', question: () => 'bq_new', entity: () => 'ent_new' } });
  assert.deepEqual(imported.course.question_banks.find((bank) => bank.bank_id === 'bnk_other'), untouched);
});
