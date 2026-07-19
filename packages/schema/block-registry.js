// Central metadata for every block type Mnemonify ships (Phase 4.5b, per
// ARCHITECTURE-AUDIT.md 4.1: "block behavior should not be distributed
// across switch statements and manually synchronized menus... a central
// registry should describe each block type"). This is the
// framework-agnostic half of that registry -- display name, category,
// valid trigger events, nested-content permissions, and PDF defaults --
// with zero React/JSX dependency, so it's importable by the server, the
// editor, and the player alike without pulling a UI framework into the
// server's dependency graph. It lives in packages/schema next to the JSON
// schema it describes, not in either app package.
//
// What's deliberately NOT here: editorComponent/playerComponent
// references. Those are inherently environment-specific (an editor
// component only exists in packages/editor, a player component only in
// packages/player) and can't live in this shared, framework-free package
// without either (a) pulling React into the Node server's dependency
// graph for no reason, or (b) creating a circular import (editor/player
// importing schema, schema importing editor/player component files).
// packages/editor/src/components/blocks/index.js and
// packages/player/src/blocks/BlockRenderer.jsx each build their own thin,
// environment-local type -> component map instead, keyed by the exact
// same type strings this registry defines -- see DECISIONS.md.
//
// Every consuming surface (Add Block picker, editor/player renderers,
// trigger event dropdown, include_in_pdf defaults) reads from this file
// rather than maintaining its own list. Adding a new block type means
// adding one entry here (plus its two component files) -- not editing
// five separate places by hand.

export const BLOCK_CATEGORIES = ['Content', 'Layout', 'Interactive', 'Media'];

export const BLOCK_REGISTRY = {
  text: {
    type: 'text',
    displayName: 'Text',
    category: 'Content',
    validEvents: [],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: false,
  },
  heading: {
    type: 'heading',
    displayName: 'Heading',
    category: 'Content',
    validEvents: [],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: true,
  },
  image: {
    type: 'image',
    displayName: 'Image',
    category: 'Content',
    validEvents: ['onClick'],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: true,
  },
  list: {
    type: 'list',
    displayName: 'List',
    category: 'Content',
    validEvents: [],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: true,
  },
  table: {
    type: 'table',
    displayName: 'Table',
    category: 'Content',
    validEvents: [],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: true,
  },
  two_column: {
    type: 'two_column',
    displayName: 'Two Column',
    category: 'Layout',
    validEvents: [],
    // Allowed inner types for left/right slots (ARCHITECTURE.md 3.6).
    // Deliberately a different, wider set than accordion/tabs' -- embed
    // is allowed here (the WSI-next-to-clinical-text pattern) but not
    // inside an accordion/tab item.
    canContainBlocks: ['text', 'heading', 'image', 'embed'],
    includeInPdfDefault: true,
    hasSettings: false,
  },
  accordion: {
    type: 'accordion',
    displayName: 'Accordion',
    category: 'Interactive',
    validEvents: ['onOpen', 'onClose'],
    canContainBlocks: ['text', 'heading', 'image'],
    includeInPdfDefault: true,
    hasSettings: false,
  },
  tabs: {
    type: 'tabs',
    displayName: 'Tabs',
    category: 'Interactive',
    validEvents: ['onOpen', 'onClose'],
    canContainBlocks: ['text', 'heading', 'image'],
    includeInPdfDefault: true,
    hasSettings: false,
  },
  'knowledge-check': {
    type: 'knowledge-check',
    displayName: 'Knowledge Check',
    category: 'Interactive',
    validEvents: ['onCorrect', 'onIncorrect', 'onComplete'],
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: true,
  },
  reflection: {
    type: 'reflection',
    displayName: 'Reflection',
    category: 'Interactive',
    validEvents: [],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: false,
  },
  carousel: {
    type: 'carousel',
    displayName: 'Image Carousel',
    category: 'Media',
    validEvents: ['onClick'],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: false,
  },
  embed: {
    type: 'embed',
    displayName: 'Embed',
    category: 'Media',
    validEvents: [],
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: false,
  },
  video: {
    type: 'video',
    displayName: 'Video',
    category: 'Media',
    validEvents: ['onComplete'],
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: true,
  },
  audio: {
    type: 'audio',
    displayName: 'Audio',
    category: 'Media',
    validEvents: ['onComplete'],
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: true,
  },
};

// Ordered type list -- Object.keys preserves insertion order for
// string-keyed objects in every JS engine this project targets, so this
// stays in the same author-facing order the "Add Block" picker has
// always used, without a second hand-maintained array.
export const BLOCK_TYPES = Object.keys(BLOCK_REGISTRY);

export function getBlockDefinition(type) {
  return BLOCK_REGISTRY[type];
}

// Grouped for the Add Block picker: { Content: [...], Layout: [...], ... },
// each category only present if at least one type belongs to it, and
// block types within a category kept in BLOCK_TYPES order.
export function getBlockTypesByCategory() {
  const grouped = {};
  for (const type of BLOCK_TYPES) {
    const def = BLOCK_REGISTRY[type];
    if (!grouped[def.category]) grouped[def.category] = [];
    grouped[def.category].push(def);
  }
  return grouped;
}
