import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LinkToBankModal from './LinkToBankModal.jsx';
import LinkedEntityPrompt from './LinkedEntityPrompt.jsx';
import QuestionBankManagerPanel from './QuestionBankManagerPanel.jsx';

globalThis.React = React;

const banks = [{ bank_id: 'bnk_one', name: 'Case bank', questions: [] }];
const usages = [
  { kind: 'page', page_id: 'pg_one', block_id: 'blk_one', label: 'Case 1' },
  { kind: 'bank', bank_id: 'bnk_one', question_id: 'bq_one', label: 'Case bank' },
];
const linkedQuestionsOn = { versionHistory: true, glossary: true, bankImportExport: true, linkedQuestions: true };

describe('linked question authoring controls', () => {
  it('offers an existing bank for the Add to bank action', () => {
    const html = renderToStaticMarkup(<LinkToBankModal questionBanks={banks} onConfirm={() => {}} onClose={() => {}} />);
    expect(html).toContain('Add question to a bank');
    expect(html).toContain('Case bank');
    expect(html).toContain('Link to bank');
  });

  it('uses the same explicit prompt for confirmed propagation or instance-only detachment', () => {
    const html = renderToStaticMarkup(<LinkedEntityPrompt mode="edit" usages={usages} onConfirm={() => {}} onDetach={() => {}} onCancel={() => {}} featureFlags={linkedQuestionsOn} />);
    expect(html).toContain('Update all usages');
    expect(html).toContain('Keep this instance only');
    expect(html).toContain('Page: Case 1');
    expect(html).toContain('Question bank: Case bank');
  });

  it('surfaces the bank drop zone used by native drag linking', () => {
    const html = renderToStaticMarkup(
      <QuestionBankManagerPanel
        questionBanks={banks}
        objectives={[]}
        variables={[]}
        assets={[]}
        onChangeQuestionBanks={() => {}}
        onLinkBlockToBank={() => {}}
        featureFlags={linkedQuestionsOn}
      />
    );
    expect(html).toContain('Drop a question block here to link it to');
  });

  it('offers unlink and delete-everywhere outcomes for linked deletion', () => {
    const html = renderToStaticMarkup(<LinkedEntityPrompt mode="delete" usages={usages} onConfirm={() => {}} onDetach={() => {}} onCancel={() => {}} featureFlags={linkedQuestionsOn} />);
    expect(html).toContain('Unlink this instance');
    expect(html).toContain('Delete everywhere');
  });
});
