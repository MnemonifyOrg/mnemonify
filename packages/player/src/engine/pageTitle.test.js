import { describe, expect, it } from 'vitest';
import { shouldRenderPageTitle } from './pageTitle.js';

describe('page title rendering', () => {
  it('hides the page title when the first heading block repeats it', () => {
    expect(shouldRenderPageTitle({ title: 'Results', blocks: [{ type: 'heading', content: { text: 'Results' } }] })).toBe(false);
  });

  it('keeps distinct page titles and headings visible', () => {
    expect(shouldRenderPageTitle({ title: 'Results Summary', blocks: [{ type: 'heading', content: { text: 'Your Score' } }] })).toBe(true);
  });

  it('does not hide a page title when the matching heading is not first', () => {
    expect(shouldRenderPageTitle({ title: 'Results', blocks: [{ type: 'text', content: {} }, { type: 'heading', content: { text: 'Results' } }] })).toBe(true);
  });
});
