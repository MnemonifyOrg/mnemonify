import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QuestionBankEditorModal from './QuestionBankEditorModal.jsx';
import QuestionBankManagerPanel from './QuestionBankManagerPanel.jsx';

globalThis.React = React;

const bank = {
  bank_id: 'bnk_one',
  name: 'Case review bank',
  questions: [],
};

describe('question bank editor redesign', () => {
  it('renders a large modal with master and detail regions and a close control', () => {
    const html = renderToStaticMarkup(
      <QuestionBankEditorModal
        bank={bank}
        objectives={[]}
        variables={[]}
        assets={[]}
        onChangeBank={() => {}}
        onClose={() => {}}
      />
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('question-bank-editor-modal__master');
    expect(html).toContain('question-bank-editor-modal__detail');
    expect(html).toContain('aria-label="Close question bank editor"');
    expect(html).toContain('Search questions');
  });

  it('keeps bank management in the course panel and exposes the modal open action', () => {
    const html = renderToStaticMarkup(
      <QuestionBankManagerPanel
        questionBanks={[bank]}
        objectives={[]}
        variables={[]}
        assets={[]}
        onChangeQuestionBanks={() => {}}
      />
    );
    expect(html).toContain('0 questions');
    expect(html).toContain('Open bank editor');
    expect(html).not.toContain('question-bank-editor-modal__body');
  });
});
