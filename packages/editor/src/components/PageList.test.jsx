import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PageList from './PageList.jsx';
import { buildGroupOptions } from '../lib/pageList.js';

globalThis.React = React;

const pages = [
  { page_id: 'page_one', title: 'Welcome', blocks: [] },
  { page_id: 'page_two', title: 'Case 1', blocks: [] },
];
const groups = [
  { group_id: 'group_one', title: 'Module One', page_ids: ['page_one'], objective_ids: ['objective_one'] },
  { group_id: 'group_two', title: 'Module Two', page_ids: ['page_two'] },
];

const props = {
  pages,
  meta: { page_display: 'grouped', page_groups: groups, objectives: [{ objective_id: 'objective_one', label: 'Objective One' }] },
  onChangeMeta: () => {},
  activePageId: 'page_one',
  onSelectPage: () => {},
  onAddPage: () => {},
  onRenamePage: () => {},
  onDeletePage: () => {},
  onDuplicatePage: () => {},
  onSaveAsPageTemplate: () => {},
  onInsertFromTemplate: () => {},
  onReorderPages: () => {},
  onReorderGroups: () => {},
};

describe('PageList cleanup', () => {
  it('renders module and page kebab triggers without inline objective or assignment controls', () => {
    const html = renderToStaticMarkup(<PageList {...props} />);

    expect(html).toContain('aria-label="Module actions for Module One"');
    expect(html).toContain('aria-label="Page actions for Welcome"');
    expect(html).toContain('aria-label="Page actions for Case 1"');
    expect(html).not.toContain('Assign objectives');
    expect(html).not.toContain('objective-multi-select');
    expect(html).not.toContain('styled-select');
    expect(html).toContain('Drag to reorder pages');
    expect(html).toContain('Drag to reorder modules');
  });

  it('keeps Move to module options sourced from all current modules plus No module', () => {
    expect(buildGroupOptions(groups)).toEqual([
      { value: '', label: 'No module' },
      { value: 'group_one', label: 'Module One' },
      { value: 'group_two', label: 'Module Two' },
    ]);
  });
});
