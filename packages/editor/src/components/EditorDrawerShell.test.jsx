import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EditorDrawerShell from './EditorDrawerShell.jsx';
import { toggleTool, visibleToolGroups } from '../lib/editorDrawer.js';

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
  it('groups global tools and gates flagged entries', () => {
    const labels = (flags) => visibleToolGroups(flags).map((group) => ({
      group: group.label,
      items: group.items.map((item) => item.label),
    }));

    expect(labels(flagsOff)).toEqual([
      { group: 'Course', items: ['Course settings'] },
      { group: 'Learner Experience', items: ['Player settings'] },
      { group: 'Advanced Tools', items: ['Variables', 'Objectives', 'Question Banks'] },
      { group: 'Review & Release', items: ['Comments', 'Course Health', 'Publish & Share'] },
    ]);
    expect(labels(flagsOn)).toEqual([
      { group: 'Course', items: ['Course settings'] },
      { group: 'Learner Experience', items: ['Player settings'] },
      { group: 'Advanced Tools', items: ['Variables', 'Objectives', 'Question Banks', 'Glossary'] },
      { group: 'Review & Release', items: ['Comments', 'Course Health', 'Version History', 'Publish & Share'] },
    ]);
    expect(visibleToolGroups(flagsOn, { canEdit: false }).at(-1).items).not.toContainEqual(expect.objectContaining({ id: 'version-history' }));
  });

  it('renders no persistent rail and opens one contextual inspector', () => {
    const html = renderToStaticMarkup(
      <EditorDrawerShell
        activeTool="course"
        featureFlags={flagsOff}
        onCloseDrawer={noop}
      />
    );

    expect(html).not.toContain('editor-icon-rail');
    expect(html).toContain('class="editor-inspector"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Course settings"');
  });

  it('renders contextual placeholders for block, page, and module selection', () => {
    const block = renderToStaticMarkup(
      <EditorDrawerShell contextualDrawer={{ kind: 'block', id: 'blk_one' }} onCloseDrawer={noop} />
    );
    const page = renderToStaticMarkup(
      <EditorDrawerShell contextualDrawer={{ kind: 'page', id: 'page_one' }} onCloseDrawer={noop} />
    );
    const module = renderToStaticMarkup(
      <EditorDrawerShell contextualDrawer={{ kind: 'module', id: 'group_one' }} onCloseDrawer={noop} />
    );

    expect(block).toContain('Block Settings');
    expect(page).toContain('Page Settings');
    expect(module).toContain('Module Settings');
  });

  it('keeps tool selection mutually exclusive', () => {
    expect(toggleTool(null, 'course')).toBe('course');
    expect(toggleTool('course', 'player')).toBe('player');
    expect(toggleTool('player', 'player')).toBeNull();
  });
});
