import test from 'node:test';
import assert from 'node:assert/strict';
import { BLOCK_REGISTRY, BLOCK_TYPES, createDefaultBlockContent, getBlockTypesByCategory } from './block-registry.js';

test('registry has one complete definition for every shipped block type', () => {
  assert.equal(new Set(BLOCK_TYPES).size, BLOCK_TYPES.length);
  for (const type of BLOCK_TYPES) {
    const definition = BLOCK_REGISTRY[type];
    assert.equal(definition.type, type);
    assert.ok(definition.displayName);
    assert.ok(definition.iconPaths?.length);
    assert.ok(definition.editorComponent);
    assert.ok(definition.playerRenderer);
    assert.equal(typeof definition.createContent, 'function');
    assert.equal(typeof definition.includeInPdfDefault, 'boolean');
    assert.ok(Array.isArray(definition.validEvents));
    assert.ok(Array.isArray(definition.supportedActions));
    assert.ok(definition.canContainBlocks === false || Array.isArray(definition.canContainBlocks));
    assert.ok(['Content', 'Layout', 'Interactive', 'Media'].includes(definition.category));
  }
});

test('picker categories and default content are projections of the registry', () => {
  const grouped = getBlockTypesByCategory();
  for (const [category, definitions] of Object.entries(grouped)) {
    assert.deepEqual(
      definitions.map((definition) => definition.type),
      BLOCK_TYPES.filter((type) => BLOCK_REGISTRY[type].category === category)
    );
  }

  const ids = {
    item: () => 'itm_test',
    option: () => 'opt_test',
    card: () => 'crd_test',
    matchingPrompt: () => 'mp_test',
    matchingOption: () => 'mo_test',
    orderingItem: () => 'ord_test',
  };
  assert.equal(createDefaultBlockContent('button').target_page_id, '');
  assert.match(createDefaultBlockContent('knowledge-check', ids).options[0].id, /^opt_/);
  assert.match(createDefaultBlockContent('accordion', ids).items[0].item_id, /^itm_/);
  assert.match(createDefaultBlockContent('flashcards', ids).cards[0].card_id, /^crd_/);
  assert.match(createDefaultBlockContent('matching', ids).options[0].option_id, /^mo_/);
  assert.match(createDefaultBlockContent('ordering', ids).items[0].item_id, /^ord_/);
});
