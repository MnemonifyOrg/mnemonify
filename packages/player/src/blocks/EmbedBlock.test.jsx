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

  it('uses a PDF object renderer for the confirmed CAP PDF URL', () => {
    const html = renderToStaticMarkup(
      <EmbedBlock
        block={{
          content: {
            url: 'https://documents-cloud.cap.org/appdocs/learning/VBP/2026/A/2026_VBP-A_Cases_1-5_Resources.pdf',
            label: 'Case resources',
          },
        }}
      />,
    );
    expect(html).toContain('class="block-embed__pdf"');
    expect(html).toContain('data="https://documents-cloud.cap.org/appdocs/learning/VBP/2026/A/2026_VBP-A_Cases_1-5_Resources.pdf"');
    expect(html).toContain('type="application/pdf"');
    expect(html).not.toContain('class="block-embed__iframe"');
  });
});
