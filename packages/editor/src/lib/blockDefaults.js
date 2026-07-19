import { genBlockId, genCourseId, genPageId, genOptionId, genItemId } from './idGen.js';

// Default content shapes per block type, matching the Phase 1 content
// model documented in DECISIONS.md (2026-07-11 entry). Used both by the
// starter templates and by the "Add Block" picker in the editor.
export const BLOCK_TYPES = [
  'text',
  'heading',
  'image',
  'list',
  'accordion',
  'tabs',
  'knowledge-check',
  'carousel',
  'reflection',
  'two_column',
  'table',
  'embed',
  'video',
  'audio',
];

export const BLOCK_LABELS = {
  text: 'Text',
  heading: 'Heading',
  image: 'Image',
  list: 'List',
  accordion: 'Accordion',
  tabs: 'Tabs',
  'knowledge-check': 'Knowledge Check',
  carousel: 'Image Carousel',
  reflection: 'Reflection',
  two_column: 'Two Column',
  table: 'Table',
  embed: 'Embed',
  video: 'Video',
  audio: 'Audio',
};

// Slot types allowed inside a two-column block (ARCHITECTURE.md 3.6) --
// see DECISIONS.md for why this list is deliberately short.
export const TWO_COLUMN_SLOT_TYPES = ['text', 'heading', 'image', 'embed'];

export const DEFAULT_EMBED_SANDBOX = 'allow-scripts allow-same-origin allow-popups';

function defaultContent(type) {
  switch (type) {
    case 'text':
      return { rich_text: [{ t: 'text', v: '' }] };
    case 'heading':
      return { text: '', level: 2 };
    case 'image':
      // width_preset/alignment: percentage-based sizing, not pixels or
      // freeform resize -- see DECISIONS.md for why.
      return { asset_id: null, width_preset: 'medium', alignment: 'center' };
    case 'list':
      return { style: 'bulleted', items: [''] };
    case 'accordion':
      return { items: [{ item_id: genItemId(), title: '', body_blocks: [] }] };
    case 'tabs':
      return {
        items: [
          { item_id: genItemId(), label: 'Tab 1', body_blocks: [] },
          { item_id: genItemId(), label: 'Tab 2', body_blocks: [] },
        ],
      };
    case 'knowledge-check':
      return {
        question: '',
        options: [
          { id: genOptionId(), text: '', correct: true },
          { id: genOptionId(), text: '', correct: false },
        ],
      };
    case 'carousel':
      return { asset_ids: [] };
    case 'reflection':
      // storage_mode is "local" and only "local" -- see ARCHITECTURE.md 3.8
      // and REQUIREMENTS.md P1-46. Do not add a way to change it here.
      return { prompt: { rich_text: [{ t: 'text', v: '' }] }, storage_mode: 'local' };
    case 'table':
      return { has_header_row: true, has_header_col: false, caption: '', rows: [['', ''], ['', '']] };
    case 'embed':
      return { url: '', label: '', sandbox: DEFAULT_EMBED_SANDBOX };
    case 'video':
    case 'audio':
      // Minimal media block content (Phase 4 Part 3) -- no captions/
      // transcript/timeline fields, those are Phase 5. See DECISIONS.md.
      return { asset_id: null, autoplay: false, loop: false };
    case 'two_column':
      return {};
    default:
      return {};
  }
}

export function createBlock(type) {
  const block = { block_id: genBlockId(), type, content: defaultContent(type), triggers: [] };
  if (type === 'reflection') block.include_in_pdf = true;
  if (type === 'two_column') {
    // left/right start omitted (empty slots) rather than null -- the
    // schema's inner_block definition requires block_id/type/content
    // when the key is present at all, so an empty slot is represented
    // by the key's absence, not a null placeholder.
    block.layout = { split: 50, split_min: 25, split_max: 75 };
  }
  return block;
}

// Inner block for a two-column slot. block_id is namespaced under the
// parent so it's never ambiguous which two-column block a slot's block
// belongs to (e.g. "blk_col1_left") -- see DECISIONS.md.
export function createInnerBlock(type, parentBlockId, side) {
  return { block_id: `${parentBlockId}_${side}`, type, content: defaultContent(type), triggers: [] };
}

// A schema-valid, empty course document. Blank-course creation and the
// onboarding tour both start from this rather than `{}` — CourseEditor
// assumes meta/pages/assets always exist (see course.schema.json).
// CURRENT_SCHEMA_VERSION here must match packages/schema/course.schema.json's
// schema_version const and packages/schema/migrations/index.js's
// CURRENT_VERSION -- a freshly created course starts at the latest version,
// never needs migrating. See DECISIONS.md (Phase 4.5a).
const CURRENT_SCHEMA_VERSION = 2;

export function createBlankCourseJson(title) {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      course_id: genCourseId(),
      title: title || 'Untitled Course',
      theme: { accent: '#0891B2' },
      completion_rule: 'viewed_all_pages',
    },
    variables: [],
    assets: [],
    pages: [{ page_id: genPageId(), title: 'Page 1', blocks: [] }],
  };
}
