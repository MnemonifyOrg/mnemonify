import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ObjectivesPanel from './ObjectivesPanel.jsx';
import ObjectiveMultiSelect from './ObjectiveMultiSelect.jsx';
import { readSelectedObjectiveIds } from '../lib/objectiveUi.js';
import { KnowledgeCheckBlockSettings } from './blocks/KnowledgeCheckBlock.jsx';
import { updateKnowledgeCheckCorrectOptions, updateKnowledgeCheckSelectionMode } from '../lib/knowledgeCheck.js';
import { QuestionBankDrawBlockSettings } from './blocks/QuestionBankDrawBlock.jsx';

globalThis.React = React;

const objectives = [
  { objective_id: 'obj_one', label: 'Identify the finding', description: 'Recognize it.' },
  { objective_id: 'obj_two', label: 'Explain the mechanism' },
];

describe('objective authoring controls', () => {
  it('renders the course objectives panel with editable label and description fields', () => {
    const html = renderToStaticMarkup(<ObjectivesPanel objectives={objectives} onChange={() => {}} />);
    expect(html).toContain('Objectives');
    expect(html).toContain('Objective label');
    expect(html).toContain('Identify the finding');
    expect(html).toContain('Recognize it.');
    expect(html).toContain('Add objective');
  });

  it('renders module assignment as a multi-select with the current objective selected', () => {
    const html = renderToStaticMarkup(
      <ObjectiveMultiSelect
        objectives={objectives}
        value={['obj_two']}
        onChange={() => {}}
        label="Assign objectives"
        ariaLabel="Assign objectives to Module One"
      />
    );
    expect(html).toContain('aria-label="Assign objectives to Module One"');
    expect(html).toContain('value="obj_one"');
    expect(html).toContain('value="obj_two" selected');
  });

  it('renders question mapping in the knowledge-check settings', () => {
    const html = renderToStaticMarkup(
      <KnowledgeCheckBlockSettings
        block={{ content: { show_feedback: true }, objective_ids: ['obj_one'] }}
        objectives={objectives}
        onChange={() => {}}
      />
    );
    expect(html).toContain('aria-label="Question objectives"');
    expect(html).toContain('value="obj_one" selected');
    expect(html).toContain('value="obj_two"');
  });

  it('renders the multi-select toggle and feedback style only when enabled', () => {
    const single = renderToStaticMarkup(
      <KnowledgeCheckBlockSettings block={{ content: { show_feedback: true } }} objectives={[]} onChange={() => {}} />
    );
    expect(single).toContain('Select all that apply');
    expect(single).not.toContain('Feedback style');

    const multi = renderToStaticMarkup(
      <KnowledgeCheckBlockSettings
        block={{ content: { multi_select: true, feedback_mode: 'per_option', show_feedback: true } }}
        objectives={[]}
        onChange={() => {}}
      />
    );
    expect(multi).toContain('Feedback style');
    expect(multi).toContain('value="summary"');
    expect(multi).toContain('value="per_option" selected');
  });

  it('stores multiple checked answers and converts legacy single-select content safely', () => {
    const block = {
      block_id: 'blk_kc',
      content: {
        multi_select: true,
        correct_option_ids: ['opt_a'],
        question: 'Select all',
        options: [{ id: 'opt_a', text: 'A', correct: true }, { id: 'opt_b', text: 'B', correct: false }],
      },
    };
    const selected = updateKnowledgeCheckCorrectOptions(block, ['opt_a', 'opt_b']);
    expect(selected.content.correct_option_ids).toEqual(['opt_a', 'opt_b']);
    expect(selected.content.options.map((option) => option.correct)).toEqual([true, true]);

    const single = updateKnowledgeCheckSelectionMode(selected, false);
    expect(single.content.multi_select).toBe(false);
    expect(single.content.correct_option_id).toBe('opt_a');
    expect(single.content.correct_option_ids).toBeUndefined();
    expect(single.content.feedback_mode).toBeUndefined();
  });

  it('extracts all selected objective ids from a native multi-select event', () => {
    const event = { target: { selectedOptions: [{ value: 'obj_one' }, { value: 'obj_two' }] } };
    expect(readSelectedObjectiveIds(event)).toEqual(['obj_one', 'obj_two']);
  });

  it('prompts at the draw insertion point when objective matches are insufficient', () => {
    const html = renderToStaticMarkup(
      <QuestionBankDrawBlockSettings
        block={{ block_id: 'blk_draw', content: { bank_id: 'bnk_one', draw_count: 2 } }}
        questionBanks={[{
          bank_id: 'bnk_one',
          questions: [
            { question_id: 'bq_match', objective_ids: ['obj_one'] },
            { question_id: 'bq_unmapped' },
          ],
        }]}
        page={{ page_id: 'pg_one' }}
        pageGroups={[{ group_id: 'grp_one', page_ids: ['pg_one'], objective_ids: ['obj_one'] }]}
        onChange={() => {}}
      />
    );
    expect(html).toContain('Objective filter has 1 matching question');
    expect(html).toContain('Draw fewer matching questions');
    expect(html).toContain('Include unmapped questions to fill the draw');
  });
});
