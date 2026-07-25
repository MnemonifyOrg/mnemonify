import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderNodes } from './RichText.jsx';

describe('player rich-text external links', () => {
  it('renders links in a new tab without losing the course page', () => {
    const html = renderToStaticMarkup(renderNodes([
      { type: 'link', href: 'https://example.com/docs', children: [{ type: 'text', value: 'Read the guide' }] },
    ], {}));
    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Read the guide');
  });
});
