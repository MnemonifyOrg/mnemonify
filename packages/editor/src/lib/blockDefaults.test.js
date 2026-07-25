import { describe, expect, it } from 'vitest';
import { createBlock } from './blockDefaults.js';

describe('Button block defaults', () => {
  it('creates the generic button content shape used by the editor and player', () => {
    expect(createBlock('button')).toMatchObject({
      type: 'button',
      content: { text: 'Button', target_page_id: '' },
      include_in_pdf: false,
    });
  });
});
