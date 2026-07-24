import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getBlockTypesByCategory } from '@mnemonify/schema/block-registry.js';
import BlockPickerModal from './BlockPickerModal.jsx';
import { BLOCK_ICON_PATHS, filterBlockDefinitions, firstMatchingBlockType } from '../lib/blockPicker.js';

globalThis.React = React;

describe('BlockPickerModal', () => {
  it('renders an autofocus search input and an icon for every registered block type', () => {
    const html = renderToStaticMarkup(<BlockPickerModal onPick={() => {}} onClose={() => {}} />);
    const definitions = Object.values(getBlockTypesByCategory()).flat();

    expect(html).toContain('id="block-picker-search-input"');
    expect(html).toContain('autofocus=""');
    expect(html).toContain('placeholder="Search block types…"');
    expect((html.match(/class="block-picker-grid__icon"/g) || []).length).toBe(definitions.length);
    expect(definitions.every((definition) => BLOCK_ICON_PATHS[definition.type])).toBe(true);
  });

  it('filters case-insensitively and removes empty categories', () => {
    const grouped = getBlockTypesByCategory();
    const filtered = filterBlockDefinitions(grouped, 'IMAGE');

    expect(Object.keys(filtered)).toEqual(['Content', 'Interactive', 'Media']);
    expect(filtered.Content.map((definition) => definition.displayName)).toEqual(['Image']);
    expect(filtered.Media.map((definition) => definition.displayName)).toEqual(['Image Carousel']);

    const singleCategory = filterBlockDefinitions(grouped, 'hotspot');
    expect(Object.keys(singleCategory)).toEqual(['Interactive']);
  });

  it('returns the first match used by Enter-to-insert and restores all categories when cleared', () => {
    const grouped = getBlockTypesByCategory();

    expect(firstMatchingBlockType(grouped, 'question')).toBe('question_bank_draw');
    expect(firstMatchingBlockType(grouped, 'does not exist')).toBeNull();
    expect(Object.keys(filterBlockDefinitions(grouped, ''))).toEqual(['Content', 'Layout', 'Interactive', 'Media']);
  });
});
