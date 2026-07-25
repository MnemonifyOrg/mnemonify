import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import EmbedBlockEditor from './EmbedBlock.jsx';

describe('editor DigitalScope-compatible embed preview', () => {
  it('uses the same lazy, non-sequential-focus iframe mitigation in the canvas', () => {
    const html = renderToStaticMarkup(
      <EmbedBlockEditor block={{ content: { url: 'https://www.digitalscope.org/LinkHandler.axd?LinkId=fixture' } }} onChange={() => {}} />,
    );
    expect(html).toContain('src="https://www.digitalscope.org/LinkHandler.axd?LinkId=fixture"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('loading="lazy"');
  });
});
