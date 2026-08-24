import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VersionHistoryButton } from './FeatureFlaggedControls.jsx';
import EditorDrawerShell from './EditorDrawerShell.jsx';
import { visibleToolGroups } from '../lib/editorDrawer.js';
import QuestionBankManagerPanel from './QuestionBankManagerPanel.jsx';
import LinkedEntityPrompt from './LinkedEntityPrompt.jsx';

globalThis.React = React;

const allFeatures = {
  versionHistory: true,
  glossary: true,
  bankImportExport: true,
  linkedQuestions: true,
};
const noFeatures = {
  versionHistory: false,
  glossary: false,
  bankImportExport: false,
  linkedQuestions: false,
};
const bank = { bank_id: 'bnk_one', name: 'Case bank', questions: [] };
describe('v1 feature-flagged editor surfaces', () => {
  it('fully hides and restores the Version History button', () => {
    expect(renderToStaticMarkup(<VersionHistoryButton onClick={() => {}} featureFlags={noFeatures} />)).toBe('');
    expect(renderToStaticMarkup(<VersionHistoryButton onClick={() => {}} featureFlags={allFeatures} />)).toContain('Version History');
  });

  it('hides and restores the Glossary and Version History Tools entries', () => {
    const labels = (flags) => visibleToolGroups(flags).flatMap((group) => group.items.map((item) => item.label));
    expect(labels(noFeatures)).not.toContain('Glossary');
    expect(labels(noFeatures)).not.toContain('Version History');
    expect(labels(allFeatures)).toContain('Glossary');
    expect(labels(allFeatures)).toContain('Version History');

    const inspector = renderToStaticMarkup(
      <EditorDrawerShell activeTool="glossary" featureFlags={allFeatures} onCloseDrawer={() => {}} />,
    );
    expect(inspector).toContain('aria-label="Glossary"');
  });

  it('hides and restores bank transfer and linked-question controls', () => {
    const commonBankProps = {
      questionBanks: [bank],
      courseJson: { pages: [], question_banks: [bank] },
      assets: [],
      variables: [],
      objectives: [],
      onChangeQuestionBanks: () => {},
      onLinkBlockToBank: () => {},
    };
    const off = renderToStaticMarkup(<QuestionBankManagerPanel {...commonBankProps} featureFlags={noFeatures} />);
    const on = renderToStaticMarkup(<QuestionBankManagerPanel {...commonBankProps} featureFlags={allFeatures} />);
    expect(off).not.toContain('Import bank');
    expect(off).not.toContain('Export bank');
    expect(off).not.toContain('Drop a question block here to link it to');
    expect(on).toContain('Import bank');
    expect(on).toContain('Export bank');
    expect(on).toContain('Drop a question block here to link it to');
  });

  it('hides and restores linked-question confirmation prompts', () => {
    const props = { mode: 'edit', usages: [], onConfirm: () => {}, onDetach: () => {}, onCancel: () => {} };
    expect(renderToStaticMarkup(<LinkedEntityPrompt {...props} featureFlags={noFeatures} />)).toBe('');
    expect(renderToStaticMarkup(<LinkedEntityPrompt {...props} featureFlags={allFeatures} />)).toContain('Update linked question?');
  });
});
