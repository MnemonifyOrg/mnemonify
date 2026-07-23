import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import VersionHistoryModal from './VersionHistoryModal.jsx';
import { restoreConfirmationMessage } from '../lib/versionHistory.js';

globalThis.React = React;

const versions = [
  { version_id: 'old', name: 'Alpha', created_at: '2026-07-22T10:00:00.000Z', author: 'Ava' },
  { version_id: 'new', name: 'Beta', created_at: '2026-07-22T12:00:00.000Z', author: 'Beau' },
];

describe('version history modal', () => {
it('renders the save action and newest versions first', () => {
  const html = renderToStaticMarkup(<VersionHistoryModal versions={versions} onSave={() => {}} onRestore={() => {}} onClose={() => {}} />);
  expect(html).toContain('Version History');
  expect(html).toContain('Save snapshot');
  expect(html.indexOf('Beta')).toBeLessThan(html.indexOf('Alpha'));
  expect(html).toContain('Beau');
  expect(html).toContain('Restore');
});

it('restore confirmation explicitly warns that current state is replaced', () => {
  expect(restoreConfirmationMessage(versions[0])).toContain('Restore “Alpha”?');
  expect(restoreConfirmationMessage(versions[0])).toContain('replaces the current course state');
  expect(restoreConfirmationMessage(versions[0])).toContain('new history entry');
});
});
