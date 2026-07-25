import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import EmbedBlock from './EmbedBlock.jsx';

describe('player DigitalScope-compatible embeds', () => {
  it('keeps the viewer lazy and out of sequential focus until deliberately activated', () => {
    const html = renderToStaticMarkup(
      <EmbedBlock block={{ content: { url: 'https://www.digitalscope.org/LinkHandler.axd?LinkId=fixture' } }} />,
    );
    expect(html).toContain('src="https://www.digitalscope.org/LinkHandler.axd?LinkId=fixture"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('loading="lazy"');
  });
});
