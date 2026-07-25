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

  it('uses a PDF object renderer for PDF URLs instead of the sandboxed HTML iframe', () => {
    const html = renderToStaticMarkup(
      <EmbedBlockEditor
        block={{ content: { url: 'https://documents-cloud.cap.org/appdocs/learning/VBP/2026/A/resources.pdf?download=0#page=1' } }}
        onChange={() => {}}
      />,
    );
    expect(html).toContain('class="embed-block-editor__pdf"');
    expect(html).toContain('data="https://documents-cloud.cap.org/appdocs/learning/VBP/2026/A/resources.pdf?download=0#page=1"');
    expect(html).toContain('type="application/pdf"');
    expect(html).not.toContain('class="embed-block-editor__preview"');
  });
});
