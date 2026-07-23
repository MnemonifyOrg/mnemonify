import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import KnowledgeCheckBlock from './KnowledgeCheckBlock.jsx';

globalThis.React = React;

const rich = (value) => [{ t: 'text', v: value }];

function block(content = {}) {
  return {
    block_id: 'blk_kc',
    type: 'knowledge-check',
    content: {
      question: rich('Select all that apply'),
      options: [
        { id: 'opt_a', text: rich('A') },
        { id: 'opt_b', text: rich('B') },
        { id: 'opt_c', text: rich('C') },
      ],
      ...content,
    },
  };
}

describe('multi-select knowledge-check player', () => {
  it('renders checkboxes and restores multiple selected options', () => {
    const html = renderToStaticMarkup(
      <KnowledgeCheckBlock
        block={block({ multi_select: true, correct_option_ids: ['opt_a', 'opt_b'] })}
        interactionStates={{ blk_kc: { submitted: true, selectedIds: ['opt_a', 'opt_b'], correct: true } }}
        onTrigger={() => {}}
      />
    );
    expect((html.match(/type="checkbox"/g) || []).length).toBe(3);
    expect(html).toContain('checked="" value="opt_a"');
    expect(html).toContain('checked="" value="opt_b"');
    expect(html).toContain('data-correct="true"');
  });

  it('renders summary feedback for an incorrect exact-set answer', () => {
    const html = renderToStaticMarkup(
      <KnowledgeCheckBlock
        block={block({ multi_select: true, correct_option_ids: ['opt_a', 'opt_b'], incorrect_feedback: rich('Choose both correct findings.') })}
        interactionStates={{ blk_kc: { submitted: true, selectedIds: ['opt_a'], correct: false } }}
        onTrigger={() => {}}
      />
    );
    expect(html).toContain('Choose both correct findings.');
    expect(html).not.toContain('Correct option');
  });

  it('renders per-option correctness feedback', () => {
    const html = renderToStaticMarkup(
      <KnowledgeCheckBlock
        block={block({ multi_select: true, correct_option_ids: ['opt_a', 'opt_b'], feedback_mode: 'per_option' })}
        interactionStates={{ blk_kc: { submitted: true, selectedIds: ['opt_a', 'opt_c'], correct: false } }}
        onTrigger={() => {}}
      />
    );
    expect(html).toContain('Correct option');
    expect(html).toContain('Incorrect option');
    expect(html).toContain('data-option-selected="true"');
    expect(html).toContain('data-option-selected="false"');
  });
});
