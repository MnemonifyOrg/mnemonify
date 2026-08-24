import { BLOCK_REGISTRY } from '@mnemonify/schema/block-registry.js';

// Backward-compatible export for the picker tests/consumers. The actual
// icon data now lives in the central registry and is only projected here.
export const BLOCK_ICON_PATHS = Object.fromEntries(
  Object.values(BLOCK_REGISTRY).map((definition) => [definition.type, definition.iconPaths])
);

export const START_HERE_TYPES = Object.freeze([
  'text',
  'image',
  'video',
  'knowledge-check',
  'two_column',
]);

export const BLOCK_DESCRIPTIONS = Object.freeze({
  text: 'Add a paragraph of text',
  heading: 'Add a section heading',
  image: 'Add a still image',
  list: 'Add a bulleted or numbered list',
  table: 'Organize information in rows and columns',
  two_column: 'Place content side by side',
  accordion: 'Hide details behind expandable sections',
  tabs: 'Organize content into selectable tabs',
  'knowledge-check': 'Test understanding with a scored question',
  reflection: 'Invite learners to write a private reflection',
  button: 'Add a button that links to another page',
  carousel: 'Let learners browse a set of images',
  embed: 'Show content from another website',
  video: 'Add a video with playback controls',
  audio: 'Add an audio recording',
  flashcards: 'Practice with front-and-back cards',
  matching: 'Ask learners to match related items',
  ordering: 'Ask learners to put items in the right order',
  hotspot: 'Let learners explore or identify areas in an image',
  question_bank_draw: 'Draw questions from a reusable question bank',
});

export function getBlockDescription(type) {
  return BLOCK_DESCRIPTIONS[type] || '';
}

export function filterBlockDefinitions(grouped, query) {
  const needle = query.trim().toLowerCase();
  return Object.entries(grouped).reduce((filtered, [category, definitions]) => {
    const matches = needle
      ? definitions.filter((definition) => definition.displayName.toLowerCase().includes(needle))
      : definitions;
    if (matches.length > 0) filtered[category] = matches;
    return filtered;
  }, {});
}

export function firstMatchingBlockType(grouped, query) {
  const filtered = filterBlockDefinitions(grouped, query);
  return Object.values(filtered)[0]?.[0]?.type || null;
}
