import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ObjectivesPanel from './ObjectivesPanel.jsx';
import ObjectiveMultiSelect from './ObjectiveMultiSelect.jsx';
import { readSelectedObjectiveIds } from '../lib/objectiveUi.js';
import { KnowledgeCheckBlockSettings } from './blocks/KnowledgeCheckBlock.jsx';
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
