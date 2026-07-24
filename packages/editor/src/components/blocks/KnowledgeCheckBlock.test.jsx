import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('./EditableRichField.jsx', () => ({
  default: function MockEditableRichField({ value, className, placeholder }) {
    const text = Array.isArray(value) ? value.map((segment) => segment?.v || '').join('') : value;
    return React.createElement('div', { className, 'data-placeholder': placeholder }, text);
  },
}));

import KnowledgeCheckBlockEditor from './KnowledgeCheckBlock.jsx';
import { toggleExpandedId } from '../../lib/knowledgeCheckEditor.js';

globalThis.React = React;

function renderEditor(content) {
  return renderToStaticMarkup(
    <KnowledgeCheckBlockEditor
      block={{ block_id: 'blk_kc', type: 'knowledge-check', content }}
      assets={[{ asset_id: 'asset_option', src: 'option.png', alt: 'Option' }]}
      objectives={[]}
      variables={[]}
      onChange={() => {}}
    />
  );
}

describe('knowledge check option extras', () => {
  it('renders empty option image and feedback extras collapsed', () => {
    const html = renderEditor({
      question: 'Question',
      options: [{ id: 'opt_a', text: 'A', correct: true }, { id: 'opt_b', text: 'B', correct: false }],
    });

    expect(html).toContain('aria-label="Add option image"');
    expect(html).toContain('aria-label="Add option feedback"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Shown instead of the general feedback');
    expect(html).not.toContain('Add feedback for this option');
  });

  it('starts saved option extras and general feedback expanded and active', () => {
    const html = renderEditor({
      question: 'Question',
      options: [
        { id: 'opt_a', text: 'A', correct: true, image_id: 'asset_option', feedback: { rich_text: [{ t: 'text', v: 'Try again.' }], image_id: null } },
        { id: 'opt_b', text: 'B', correct: false },
      ],
      correct_feedback: 'Correct answer.',
      incorrect_feedback: '',
      incorrect_feedback_image_id: 'asset_option',
    });

    expect(html).toContain('aria-label="Change option image"');
    expect(html).toContain('aria-label="Edit option feedback"');
    expect(html).toContain('aria-label="Correct feedback: edit feedback"');
    expect(html).toContain('aria-label="Incorrect feedback: change image"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('Try again.');
    expect(html).toContain('Correct answer.');
  });

  it('toggles expansion state without mutating the saved content', () => {
    const collapsed = new Set();
    const expanded = toggleExpandedId(collapsed, 'opt_a');
    const collapsedAgain = toggleExpandedId(expanded, 'opt_a');

    expect([...collapsed]).toEqual([]);
    expect([...expanded]).toEqual(['opt_a']);
    expect([...collapsedAgain]).toEqual([]);
  });
});
