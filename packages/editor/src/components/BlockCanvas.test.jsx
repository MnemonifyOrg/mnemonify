import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BlockCanvas from './BlockCanvas.jsx';

globalThis.React = React;

const page = {
  page_id: 'page_one',
  blocks: [{ block_id: 'block_one', type: 'unregistered-block', content: {} }],
};

const commonProps = {
  page,
  pages: [page],
  variables: [],
  onSelectBlock: () => {},
  onChangeBlock: () => {},
  onDuplicateBlock: () => {},
  onDeleteBlock: () => {},
  onAddBlock: () => {},
  onReorderBlocks: () => {},
  assets: [],
  questionBanks: [],
  featureFlags: { linkedQuestions: false },
};

describe('block canvas hover toolbar', () => {
  it('keeps the chrome in the DOM while unselected blocks use the hidden visual state', () => {
    const html = renderToStaticMarkup(<BlockCanvas {...commonProps} selectedBlockId={null} />);

    expect(html).toContain('class="block-wrapper"');
    expect(html).toContain('class="block-wrapper__chrome"');
    expect(html).toContain('class="block-wrapper__toolbar"');
    expect(html).toContain('class="block-wrapper__label"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('title="Drag to reorder"');
    expect(html).toContain('title="Open settings"');
    expect(html).toContain('title="Duplicate"');
    expect(html).toContain('title="Delete"');
    expect(html).not.toContain('block-wrapper--selected');
  });

  it('marks the selected block so the accent ring and floating chrome become visible', () => {
    const html = renderToStaticMarkup(<BlockCanvas {...commonProps} selectedBlockId="block_one" />);

    expect(html).toContain('class="block-wrapper block-wrapper--selected"');
    expect(html).toContain('title="Open settings"');
  });
});
