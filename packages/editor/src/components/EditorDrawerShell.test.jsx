import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EditorDrawerShell from './EditorDrawerShell.jsx';
import { toggleRailDrawer, visibleRailItems } from '../lib/editorDrawer.js';

globalThis.React = React;

const flagsOff = {
  glossary: false,
  versionHistory: false,
};

const flagsOn = {
  glossary: true,
  versionHistory: true,
};

const noop = () => {};

describe('EditorDrawerShell', () => {
  it('shows the core rail items and reserves flagged items only when enabled', () => {
    expect(visibleRailItems(flagsOff).map((item) => item.label)).toEqual([
      'Course', 'Player', 'Variables', 'Question Banks', 'Objectives', 'Course Health',
    ]);
    expect(visibleRailItems(flagsOn).map((item) => item.label)).toEqual([
      'Course', 'Player', 'Variables', 'Question Banks', 'Objectives', 'Course Health', 'Glossary', 'Version History',
    ]);
  });

  it('renders a single active icon drawer and hides flagged icons when disabled', () => {
    const html = renderToStaticMarkup(
      <EditorDrawerShell
        activeRailItem="course"
        featureFlags={flagsOff}
        onRailItemClick={noop}
        onCloseDrawer={noop}
      />
    );

    expect((html.match(/editor-icon-rail__item/g) || []).length).toBe(6);
    expect(html).toContain('aria-label="Course"');
    expect(html).toContain('aria-label="Course" aria-pressed="true"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Course"');
    expect(html).not.toContain('aria-label="Glossary"');
    expect(html).not.toContain('aria-label="Version History"');
  });

  it('renders contextual placeholders for block, page, and module selection', () => {
    const block = renderToStaticMarkup(
      <EditorDrawerShell contextualDrawer={{ kind: 'block', id: 'blk_one' }} onRailItemClick={noop} onCloseDrawer={noop} />
    );
    const page = renderToStaticMarkup(
      <EditorDrawerShell contextualDrawer={{ kind: 'page', id: 'page_one' }} onRailItemClick={noop} onCloseDrawer={noop} />
    );
    const module = renderToStaticMarkup(
      <EditorDrawerShell contextualDrawer={{ kind: 'module', id: 'group_one' }} onRailItemClick={noop} onCloseDrawer={noop} />
    );

    expect(block).toContain('Block Settings');
    expect(page).toContain('Page Settings');
    expect(module).toContain('Module Settings');
  });

  it('toggles the active rail item and guarantees one active icon at a time', () => {
    expect(toggleRailDrawer(null, 'course')).toBe('course');
    expect(toggleRailDrawer('course', 'player')).toBe('player');
    expect(toggleRailDrawer('player', 'player')).toBeNull();
  });
});
