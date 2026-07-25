import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RichTextToolbar from './RichTextToolbar.jsx';

globalThis.React = React;

describe('shared rich-text toolbar', () => {
  it('renders color, list, alignment, and variable controls in one toolbar', () => {
    const html = renderToStaticMarkup(
      <RichTextToolbar fieldRef={{ current: null }} selectionRef={{ current: null }} variables={[{ name: 'CourseName' }]} onInsert={() => {}} />,
    );
    expect(html).toContain('aria-label="Text color"');
    expect(html).toContain('aria-label="Bulleted list"');
    expect(html).toContain('aria-label="Numbered list"');
    expect(html).toContain('aria-label="Align left"');
    expect(html).toContain('aria-label="Align center"');
    expect(html).toContain('aria-label="Align right"');
    expect(html).toContain('Insert Variable');
    expect(html).toContain('aria-haspopup="listbox"');
  });

  it('can hide list and alignment controls for restricted table-cell fields', () => {
    const html = renderToStaticMarkup(
      <RichTextToolbar fieldRef={{ current: null }} selectionRef={{ current: null }} enableColor={false} enableLists={false} enableAlignment={false} />,
    );
    expect(html).not.toContain('Bulleted list');
    expect(html).not.toContain('Align center');
    expect(html).toContain('aria-label="Bold"');
  });
});
