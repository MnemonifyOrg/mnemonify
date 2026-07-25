import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ButtonBlock, { getButtonTarget } from './ButtonBlock.jsx';

describe('player Button block', () => {
  it('renders configured text and uses the configured page target', () => {
    const onNavigate = vi.fn();
    const block = { content: { text: 'Go to results', target_page_id: 'pg_results' } };
    const html = renderToStaticMarkup(<ButtonBlock block={block} onNavigate={onNavigate} />);
    expect(html).toContain('Go to results');
    expect(html).not.toContain('disabled');
    expect(getButtonTarget(block)).toBe('pg_results');
  });

  it('disables itself when no page target is configured', () => {
    const html = renderToStaticMarkup(<ButtonBlock block={{ content: { text: 'Choose a page' } }} onNavigate={() => {}} />);
    expect(html).toContain('disabled');
  });
});
