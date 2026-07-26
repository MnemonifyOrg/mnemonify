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

describe('stable IDs on newly-created nested entities', () => {
  it('creates IDs for every supported repeated question/block item', () => {
    expect(createBlock('knowledge-check').content.options.every((option) => /^opt_/.test(option.id))).toBe(true);
    expect(createBlock('accordion').content.items.every((item) => /^itm_/.test(item.item_id))).toBe(true);
    expect(createBlock('tabs').content.items.every((item) => /^itm_/.test(item.item_id))).toBe(true);
    expect(createBlock('flashcards').content.cards.every((card) => /^crd_/.test(card.card_id))).toBe(true);
    expect(createBlock('matching').content.prompts.every((prompt) => /^mp_/.test(prompt.prompt_id))).toBe(true);
    expect(createBlock('matching').content.options.every((option) => /^mo_/.test(option.option_id))).toBe(true);
    expect(createBlock('ordering').content.items.every((item) => /^ord_/.test(item.item_id))).toBe(true);
  });
});
