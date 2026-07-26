import { genBlockId, genCourseId, genPageId, genOptionId, genItemId, genCardId, genMatchingPromptId, genMatchingOptionId, genOrderingItemId } from './idGen.js';
import { BLOCK_TYPES, BLOCK_REGISTRY, DEFAULT_EMBED_SANDBOX, createDefaultBlockContent, getBlockDefinition } from '@mnemonify/schema/block-registry.js';

// Default content shapes per block type, matching the Phase 1 content
// model documented in DECISIONS.md (2026-07-11 entry). Used both by the
// starter templates and by the "Add Block" picker in the editor.
//
// BLOCK_TYPES and BLOCK_LABELS are re-exported here (Phase 4.5b) rather
// than removed, so existing consumers (DrawerSettingsContent.jsx, triggerUtils.js)
// keep working unchanged -- the actual source of truth for the type list
// and display names is now packages/schema/block-registry.js. See
// DECISIONS.md.
export { BLOCK_TYPES };
export const BLOCK_LABELS = Object.fromEntries(BLOCK_TYPES.map((type) => [type, BLOCK_REGISTRY[type].displayName]));

// Slot types and the embed sandbox are registry metadata now, so adding a
// block type cannot silently create a second container/defaults list here.
export const TWO_COLUMN_SLOT_TYPES = getBlockDefinition('two_column').canContainBlocks;
export { DEFAULT_EMBED_SANDBOX };

const ID_FACTORIES = {
  item: genItemId,
  option: genOptionId,
  card: genCardId,
  matchingPrompt: genMatchingPromptId,
  matchingOption: genMatchingOptionId,
  orderingItem: genOrderingItemId,
};

export function createBlock(type) {
  const block = { block_id: genBlockId(), type, content: createDefaultBlockContent(type, ID_FACTORIES), triggers: [] };
  // include_in_pdf default (Phase 4.5b): previously only ever set for
  // `reflection` -- every other type silently got no explicit value at
  // all, despite ARCHITECTURE.md 11.3 documenting a full defaults table
  // for every type. Now reads that table from the one place it's
  // actually defined (packages/schema/block-registry.js) instead of a
  // single hardcoded special case. See DECISIONS.md.
  const definition = getBlockDefinition(type);
  if (definition) block.include_in_pdf = definition.includeInPdfDefault;
  if (type === 'two_column') {
    // left/right start omitted (empty slots) rather than null -- the
    // schema's inner_block definition requires block_id/type/content
    // when the key is present at all, so an empty slot is represented
    // by the key's absence, not a null placeholder.
    block.layout = { split: 50, split_min: 25, split_max: 75 };
  }
  return block;
}

// Inner block for a two-column slot or an accordion/tabs item body (shared
// by TwoColumnBlock.jsx and ItemBlockStack.jsx). block_id is namespaced
// under the parent so it's never ambiguous which parent block a slot/item
// block belongs to (e.g. "blk_col1_left") -- see DECISIONS.md.
export function createInnerBlock(type, parentBlockId, side) {
  const definition = getBlockDefinition(type);
  return {
    block_id: `${parentBlockId}_${side}`,
    type,
    content: createDefaultBlockContent(type, ID_FACTORIES),
    triggers: [],
    ...(definition ? { include_in_pdf: definition.includeInPdfDefault } : {}),
  };
}

// A schema-valid, empty course document. Blank-course creation and the
// onboarding tour both start from this rather than `{}` — CourseEditor
// assumes meta/pages/assets always exist (see course.schema.json).
// CURRENT_SCHEMA_VERSION here must match packages/schema/course.schema.json's
// schema_version const and packages/schema/migrations/index.js's
// CURRENT_VERSION -- a freshly created course starts at the latest version,
// never needs migrating. See DECISIONS.md (Phase 4.5a).
const CURRENT_SCHEMA_VERSION = 6;

export function createBlankCourseJson(title) {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      course_id: genCourseId(),
      title: title || 'Untitled Course',
      theme: { accent: '#0891B2' },
      completion_rule: 'viewed_all_pages',
      publish_settings: { completion_criteria: 'viewed_all_pages', report_status_as: 'both', success_enabled: true, passing_score_pct: 80 },
    },
    variables: [],
    question_banks: [],
    linked_entities: [],
    assets: [],
    pages: [{ page_id: genPageId(), title: 'Page 1', blocks: [] }],
  };
}
