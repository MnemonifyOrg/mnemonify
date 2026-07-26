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
// Component references are environment-neutral keys rather than imported
// React components. The editor and player resolve those keys to their local
// component implementations, avoiding a schema -> React dependency while
// still keeping the component contract in this one registry.
//
// Every consuming surface (Add Block picker, editor/player renderers,
// trigger event dropdown, include_in_pdf defaults) reads from this file
// rather than maintaining its own list. Adding a new block type means
// adding one entry here (plus its two component files) -- not editing
// five separate places by hand.

export const BLOCK_CATEGORIES = ['Content', 'Layout', 'Interactive', 'Media'];

const COMMON_TRIGGER_ACTIONS = ['SET_VAR', 'ADJUST_VAR', 'SHOW_BLOCK', 'HIDE_BLOCK', 'JUMP_TO_PAGE'];
const MEDIA_TRIGGER_ACTIONS = [...COMMON_TRIGGER_ACTIONS, 'OPEN_MODAL'];
const VIDEO_TRIGGER_ACTIONS = [...MEDIA_TRIGGER_ACTIONS, 'JUMP_TO_TIMESTAMP'];
export const DEFAULT_EMBED_SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-popups';

function generatedId(ids, key, field) {
  const value = ids?.[key]?.();
  return value ? { [field]: value } : {};
}

// The icon paths are data, not editor code. Keeping them here means the
// picker and any future registry consumer can render the same icon metadata
// without maintaining a second per-type icon table.
const ICONS = {
  text: ['M5 5h14', 'M12 5v14', 'M8 19h8'],
  heading: ['M5 5v14', 'M19 5v14', 'M5 12h14'],
  image: ['M4 5h16v14H4z', 'M7 9h.01', 'M5 17l4-4 3 3 2-2 5 5'],
  list: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  table: ['M4 5h16v14H4z', 'M4 10h16', 'M10 5v14', 'M16 5v14'],
  two_column: ['M4 5h16v14H4z', 'M12 5v14'],
  accordion: ['M5 7h14', 'M5 12h14', 'M5 17h14'],
  tabs: ['M4 6h6v4H4z', 'M12 6h8v4h-8z', 'M4 14h16v4H4z'],
  'knowledge-check': ['M5 5h14v14H5z', 'M8 12l2 2 5-5'],
  reflection: ['M5 5h14v14H5z', 'M8 9h8', 'M8 13h5'],
  button: ['M4 6h16v12H4z', 'M8 12h8', 'M13 9l3 3-3 3'],
  carousel: ['M4 6h16v12H4z', 'M7 15l3-3 2 2 2-2 3 3'],
  embed: ['M8 8l-4 4 4 4', 'M16 8l4 4-4 4', 'M14 5l-4 14'],
  video: ['M5 5h14v14H5z', 'M10 9l5 3-5 3z'],
  audio: ['M5 10h4l5-4v12l-5-4H5z', 'M17 9c2 1 2 5 0 6'],
  flashcards: ['M5 7h12v12H5z', 'M8 4h11v12'],
  matching: ['M5 6h6v4H5z', 'M13 14h6v4h-6z', 'M11 8h2v8'],
  ordering: ['M5 6h14', 'M5 12h14', 'M5 18h14', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  hotspot: ['M4 5h16v14H4z', 'M12 9v6', 'M9 12h6'],
  question_bank_draw: ['M5 5h14v14H5z', 'M8 8h8', 'M8 12h8', 'M8 16h5'],
};

// Phase 4.6 Step 1: which settings-panel sections belong in the always-
// visible "Basic" group vs. the collapsed-by-default "Advanced" disclosure,
// per block type. 'content' means "render this type's own *Settings
// component (BLOCK_SETTINGS), if it has one" -- the core content-editing
// fields (alt text, question/options, split ratio, row/column controls,
// etc.), which SettingsPanel.jsx already renders per-type via
// packages/editor/src/components/blocks/settingsIndex.js. The four
// Advanced-tier concepts (block name/label, visibility condition, triggers,
// faculty notes) are cross-cutting metadata/logic rather than content --
// every block type gets 'blockName'/'visibility'/'facultyNotes'
// universally (no product reason found to vary these), but 'triggers' is
// included only when validEvents is non-empty, matching
// TriggersSection.jsx's own existing "no events, no section" rule exactly
// (see DECISIONS.md -- this was already effectively registry-driven via
// validEvents; settingsGroups.advanced just makes the resulting Advanced
// section list an explicit, single per-type array SettingsPanel.jsx reads,
// instead of four separately-conditioned components deciding individually
// whether to render themselves).
const UNIVERSAL_ADVANCED = ['blockName', 'visibility', 'facultyNotes'];
function settingsGroupsFor({ hasSettings, validEvents }) {
  return {
    basic: hasSettings ? ['content'] : [],
    advanced: validEvents.length > 0 ? [...UNIVERSAL_ADVANCED, 'triggers'] : UNIVERSAL_ADVANCED,
  };
}

export const BLOCK_REGISTRY = {
  text: {
    type: 'text',
    displayName: 'Text',
    category: 'Content',
    editorComponent: 'TextBlockEditor',
    playerRenderer: 'TextBlock',
    iconPaths: ICONS.text,
    createContent: () => ({ rich_text: [{ t: 'text', v: '' }] }),
    validEvents: [],
    supportedActions: [],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: false,
  },
  heading: {
    type: 'heading',
    displayName: 'Heading',
    category: 'Content',
    editorComponent: 'HeadingBlockEditor',
    playerRenderer: 'HeadingBlock',
    iconPaths: ICONS.heading,
    createContent: () => ({ text: '', level: 2 }),
    validEvents: [],
    supportedActions: [],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: true,
  },
  image: {
    type: 'image',
    displayName: 'Image',
    category: 'Content',
    editorComponent: 'ImageBlockEditor',
    playerRenderer: 'ImageBlock',
    iconPaths: ICONS.image,
    createContent: () => ({ asset_id: null, width_preset: 'medium', alignment: 'center' }),
    validEvents: ['onClick'],
    supportedActions: MEDIA_TRIGGER_ACTIONS,
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: true,
  },
  list: {
    type: 'list',
    displayName: 'List',
    category: 'Content',
    editorComponent: 'ListBlockEditor',
    playerRenderer: 'ListBlock',
    iconPaths: ICONS.list,
    createContent: () => ({ style: 'bulleted', items: [''] }),
    validEvents: [],
    supportedActions: [],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: true,
  },
  table: {
    type: 'table',
    displayName: 'Table',
    category: 'Content',
    editorComponent: 'TableBlockEditor',
    playerRenderer: 'TableBlock',
    iconPaths: ICONS.table,
    createContent: () => ({ has_header_row: true, has_header_col: false, caption: '', rows: [['', ''], ['', '']] }),
    validEvents: [],
    supportedActions: [],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: true,
  },
  two_column: {
    type: 'two_column',
    displayName: 'Two Column',
    category: 'Layout',
    editorComponent: 'TwoColumnBlockEditor',
    playerRenderer: 'TwoColumnBlock',
    iconPaths: ICONS.two_column,
    createContent: () => ({}),
    validEvents: [],
    supportedActions: [],
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
    editorComponent: 'AccordionBlockEditor',
    playerRenderer: 'AccordionBlock',
    iconPaths: ICONS.accordion,
    createContent: ({ ids } = {}) => ({ items: [{ ...generatedId(ids, 'item', 'item_id'), title: '', body_blocks: [] }] }),
    validEvents: ['onOpen', 'onClose'],
    supportedActions: COMMON_TRIGGER_ACTIONS,
    canContainBlocks: ['text', 'heading', 'image'],
    includeInPdfDefault: true,
    hasSettings: false,
  },
  tabs: {
    type: 'tabs',
    displayName: 'Tabs',
    category: 'Interactive',
    editorComponent: 'TabsBlockEditor',
    playerRenderer: 'TabsBlock',
    iconPaths: ICONS.tabs,
    createContent: ({ ids } = {}) => ({
      items: [
        { ...generatedId(ids, 'item', 'item_id'), label: 'Tab 1', body_blocks: [] },
        { ...generatedId(ids, 'item', 'item_id'), label: 'Tab 2', body_blocks: [] },
      ],
    }),
    validEvents: ['onOpen', 'onClose'],
    supportedActions: COMMON_TRIGGER_ACTIONS,
    canContainBlocks: ['text', 'heading', 'image'],
    includeInPdfDefault: true,
    hasSettings: false,
  },
  'knowledge-check': {
    type: 'knowledge-check',
    displayName: 'Knowledge Check',
    category: 'Interactive',
    editorComponent: 'KnowledgeCheckBlockEditor',
    playerRenderer: 'KnowledgeCheckBlock',
    iconPaths: ICONS['knowledge-check'],
    createContent: ({ ids } = {}) => ({
      scored: true,
      question: '',
      options: [
        { ...generatedId(ids, 'option', 'id'), text: '', correct: true },
        { ...generatedId(ids, 'option', 'id'), text: '', correct: false },
      ],
    }),
    validEvents: ['onCorrect', 'onIncorrect', 'onComplete'],
    supportedActions: COMMON_TRIGGER_ACTIONS,
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: true,
  },
  reflection: {
    type: 'reflection',
    displayName: 'Reflection',
    category: 'Interactive',
    editorComponent: 'ReflectionBlockEditor',
    playerRenderer: 'ReflectionBlock',
    iconPaths: ICONS.reflection,
    createContent: () => ({ prompt: { rich_text: [{ t: 'text', v: '' }] }, storage_mode: 'local' }),
    validEvents: [],
    supportedActions: [],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: false,
  },
  button: {
    type: 'button',
    displayName: 'Button',
    category: 'Interactive',
    editorComponent: 'ButtonBlockEditor',
    playerRenderer: 'ButtonBlock',
    iconPaths: ICONS.button,
    createContent: () => ({ text: 'Button', target_page_id: '' }),
    validEvents: [],
    supportedActions: [],
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: true,
  },
  carousel: {
    type: 'carousel',
    displayName: 'Image Carousel',
    category: 'Media',
    editorComponent: 'CarouselBlockEditor',
    playerRenderer: 'CarouselBlock',
    iconPaths: ICONS.carousel,
    createContent: () => ({ asset_ids: [] }),
    validEvents: ['onClick'],
    supportedActions: MEDIA_TRIGGER_ACTIONS,
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: false,
  },
  embed: {
    type: 'embed',
    displayName: 'Embed',
    category: 'Media',
    editorComponent: 'EmbedBlockEditor',
    playerRenderer: 'EmbedBlock',
    iconPaths: ICONS.embed,
    createContent: () => ({ url: '', label: '', sandbox: DEFAULT_EMBED_SANDBOX }),
    validEvents: [],
    supportedActions: [],
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: false,
  },
  video: {
    type: 'video',
    displayName: 'Video',
    category: 'Media',
    editorComponent: 'VideoBlockEditor',
    playerRenderer: 'VideoBlock',
    iconPaths: ICONS.video,
    createContent: () => ({ asset_id: null, autoplay: false, loop: false }),
    validEvents: ['onComplete', 'onTimeReached'],
    supportedActions: VIDEO_TRIGGER_ACTIONS,
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: true,
  },
  audio: {
    type: 'audio',
    displayName: 'Audio',
    category: 'Media',
    editorComponent: 'AudioBlockEditor',
    playerRenderer: 'AudioBlock',
    iconPaths: ICONS.audio,
    createContent: () => ({ asset_id: null, autoplay: false, loop: false }),
    validEvents: ['onComplete'],
    supportedActions: COMMON_TRIGGER_ACTIONS,
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: true,
  },
  flashcards: {
    type: 'flashcards',
    displayName: 'Flashcards',
    category: 'Interactive',
    editorComponent: 'FlashcardsBlockEditor',
    playerRenderer: 'FlashcardsBlock',
    iconPaths: ICONS.flashcards,
    createContent: ({ ids } = {}) => ({
      cards: [{
        ...generatedId(ids, 'card', 'card_id'),
        front: { rich_text: [{ t: 'text', v: '' }], image_id: null },
        back: { rich_text: [{ t: 'text', v: '' }], image_id: null },
      }],
    }),
    validEvents: [],
    supportedActions: [],
    canContainBlocks: false,
    includeInPdfDefault: true,
    hasSettings: false,
  },
  matching: {
    type: 'matching',
    displayName: 'Matching',
    category: 'Interactive',
    editorComponent: 'MatchingBlockEditor',
    playerRenderer: 'MatchingBlock',
    iconPaths: ICONS.matching,
    createContent: ({ ids } = {}) => ({
      scored: true,
      prompts: [{ ...generatedId(ids, 'matchingPrompt', 'prompt_id'), text: '', correct_option_id: '' }],
      options: [
        { ...generatedId(ids, 'matchingOption', 'option_id'), text: '' },
        { ...generatedId(ids, 'matchingOption', 'option_id'), text: '' },
      ],
      allow_retry: true,
    }),
    validEvents: ['onCorrect', 'onIncorrect', 'onComplete'],
    supportedActions: COMMON_TRIGGER_ACTIONS,
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: true,
  },
  ordering: {
    type: 'ordering',
    displayName: 'Ordering',
    category: 'Interactive',
    editorComponent: 'OrderingBlockEditor',
    playerRenderer: 'OrderingBlock',
    iconPaths: ICONS.ordering,
    createContent: ({ ids } = {}) => ({
      scored: true,
      items: [
        { ...generatedId(ids, 'orderingItem', 'item_id'), text: '', correct_position: 0 },
        { ...generatedId(ids, 'orderingItem', 'item_id'), text: '', correct_position: 1 },
      ],
    }),
    validEvents: ['onCorrect', 'onIncorrect', 'onComplete'],
    supportedActions: COMMON_TRIGGER_ACTIONS,
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: false,
  },
  hotspot: {
    type: 'hotspot',
    displayName: 'Image Hotspot',
    category: 'Interactive',
    editorComponent: 'HotspotBlockEditor',
    playerRenderer: 'HotspotBlock',
    iconPaths: ICONS.hotspot,
    createContent: () => ({ image_asset_id: null, mode: 'exploratory', scored: true, regions: [] }),
    validEvents: ['onCorrect', 'onIncorrect', 'onComplete'],
    supportedActions: COMMON_TRIGGER_ACTIONS,
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: true,
  },
  question_bank_draw: {
    type: 'question_bank_draw',
    displayName: 'Question Bank',
    category: 'Interactive',
    editorComponent: 'QuestionBankDrawBlockEditor',
    playerRenderer: 'QuestionBankDrawBlock',
    iconPaths: ICONS.question_bank_draw,
    createContent: () => ({ bank_id: '', draw_count: 1 }),
    validEvents: [],
    supportedActions: [],
    canContainBlocks: false,
    includeInPdfDefault: false,
    hasSettings: true,
  },
};

// Backfill settingsGroups onto every entry from its own hasSettings/
// validEvents -- computed once here rather than hand-duplicated 14 times
// above, so the two stay impossible to drift apart.
for (const def of Object.values(BLOCK_REGISTRY)) {
  def.settingsGroups = settingsGroupsFor(def);
}

// Ordered type list -- Object.keys preserves insertion order for
// string-keyed objects in every JS engine this project targets, so this
// stays in the same author-facing order the "Add Block" picker has
// always used, without a second hand-maintained array.
export const BLOCK_TYPES = Object.keys(BLOCK_REGISTRY);

export function getBlockDefinition(type) {
  return BLOCK_REGISTRY[type];
}

export function createDefaultBlockContent(type, ids) {
  return getBlockDefinition(type)?.createContent?.({ ids }) || {};
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
