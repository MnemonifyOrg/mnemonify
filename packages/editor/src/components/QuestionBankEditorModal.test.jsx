import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QuestionBankEditorModal from './QuestionBankEditorModal.jsx';
import QuestionBankManagerPanel from './QuestionBankManagerPanel.jsx';
import BankExportModal from './BankExportModal.jsx';
import BankImportReviewModal from './BankImportReviewModal.jsx';
import { buildNativeQuestionBankExport } from '@mnemonify/schema/question-bank-transfer.js';

globalThis.React = React;

const bank = {
  bank_id: 'bnk_one',
  name: 'Case review bank',
  questions: [],
};

const courseJson = {
  meta: { objectives: [] },
  variables: [],
  question_banks: [bank],
  linked_entities: [],
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
        featureFlags={{ versionHistory: true, glossary: true, bankImportExport: true, linkedQuestions: true }}
        onChangeQuestionBanks={() => {}}
      />
    );
    expect(html).toContain('0 questions');
    expect(html).toContain('Open bank editor');
    expect(html).toContain('Export bank');
    expect(html).toContain('Import bank');
    expect(html).not.toContain('question-bank-editor-modal__body');
  });

  it('offers native and GIFT export choices', () => {
    const html = renderToStaticMarkup(<BankExportModal bank={bank} onExport={() => {}} onClose={() => {}} />);
    expect(html).toContain('Native Mnemonify JSON');
    expect(html).toContain('GIFT interoperability format');
  });

  it('shows merge/create choices and unresolved-reference warnings during import review', () => {
    const transferBank = { ...bank, questions: [{ question_id: 'bq_one', scored: true, content: { question: 'Question', options: [{ id: 'opt_one', text: 'Answer', correct: true }] } }] };
    const transferCourse = { ...courseJson, question_banks: [transferBank] };
    const payload = buildNativeQuestionBankExport(transferCourse, transferBank.bank_id);
    payload.bank.questions[0].objective_ids = ['obj_missing'];
    payload.bank.questions[0].content.question = { rich_text: [{ t: 'variable', var_name: 'MissingVariable' }] };
    const html = renderToStaticMarkup(
      <BankImportReviewModal payload={payload} courseJson={courseJson} questionBanks={[bank]} onConfirm={() => {}} onClose={() => {}} />
    );
    expect(html).toContain('Create a new bank');
    expect(html).toContain('Merge into an existing bank');
    expect(html).toContain('Missing objectives');
    expect(html).toContain('obj_missing');
    expect(html).toContain('Missing variables');
    expect(html).toContain('MissingVariable');
  });
});
