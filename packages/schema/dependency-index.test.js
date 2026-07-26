import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDependencyIndex, getBrokenReferences, getDependents } from './dependency-index.js';

function makeCourse() {
  return {
    meta: {
      objectives: [{ objective_id: 'obj_known', label: 'Known objective' }],
      page_groups: [{ group_id: 'grp_case', title: 'Case', objective_ids: ['obj_known', 'obj_missing'] }],
      utility_bar: { custom: [{ id: 'util_1', label: 'Missing page', action: 'jump_page', target: 'pg_missing' }] },
    },
    variables: [{ name: 'knownVar', type: 'boolean', default: false }],
    assets: [{ asset_id: 'ast_shared', kind: 'image', src: '/shared.png', alt: 'Shared' }],
    question_banks: [{
      bank_id: 'bnk_known',
      questions: [{
        question_id: 'bq_1',
        objective_ids: ['obj_known'],
        linked_entity_id: 'ent_shared',
        content: { question: [], options: [{ id: 'opt_1', text: [], image_id: 'ast_shared' }] },
      }],
    }],
    linked_entities: [{ entity_id: 'ent_shared', block_type: 'text', content: {} }],
    pages: [{
      page_id: 'pg_one',
      title: 'One',
      blocks: [
        {
          block_id: 'blk_question',
          type: 'knowledge-check',
          objective_ids: ['obj_known'],
          linked_entity_id: 'ent_shared',
          content: { question: [], options: [], question_image_id: 'ast_shared' },
          triggers: [
            { trigger_id: 'trg_missing', event: 'onComplete', actions: [
              { action: 'SHOW_BLOCK', target: 'blk_missing' },
              { action: 'JUMP_TO_PAGE', target: 'pg_missing' },
              { action: 'SET_VAR', var: 'missingVar', value: true },
            ] },
          ],
        },
        { block_id: 'blk_bank', type: 'question_bank_draw', content: { bank_id: 'bnk_missing', draw_count: 1 }, triggers: [] },
      ],
    }],
  };
}

test('dependency index covers objectives, assets, banks, variables, triggers, and linked usages', () => {
  const course = makeCourse();
  const index = buildDependencyIndex(course);

  assert.equal(getDependents('obj_known', course).length, 3, 'module, inline question, and bank question');
  assert.equal(getDependents('ast_shared', course).length, 2, 'inline question plus bank question option');
  assert.equal(getDependents('ent_shared', course).length, 2, 'page usage plus bank usage');
  assert.ok(index.knownVar === undefined, 'unused variables do not create fake edges');
  assert.equal(index.missingVar[0].referenceType, 'trigger_writes_variable');
  assert.equal(index.bnk_missing[0].referenceType, 'block_uses_question_bank');
});

test('broken-reference reporting identifies every missing target without changing course JSON', () => {
  const course = makeCourse();
  const before = structuredClone(course);
  const broken = getBrokenReferences(course);

  assert.ok(broken.some((edge) => edge.targetType === 'block' && edge.targetId === 'blk_missing'));
  assert.ok(broken.some((edge) => edge.targetType === 'page' && edge.targetId === 'pg_missing'));
  assert.ok(broken.some((edge) => edge.targetType === 'variable' && edge.targetId === 'missingVar'));
  assert.ok(broken.some((edge) => edge.targetType === 'question_bank' && edge.targetId === 'bnk_missing'));
  assert.ok(broken.some((edge) => edge.targetType === 'objective' && edge.targetId === 'obj_missing'));
  assert.deepEqual(course, before, 'the dependency index is derived and side-effect free');
});
