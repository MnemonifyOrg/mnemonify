import { genItemId, genVariableId } from './idGen.js';

// Phase 4.5a's real gap (DECISIONS.md, Step 1 identity audit): accordion
// and tab nested items have no id at all in every course document created
// before this migration existed, and variables are identified only by
// `name`. This migration fills in both, and nothing else -- it never
// touches, removes, or renumbers any id that already exists (blocks,
// pages, triggers, assets, KC options, resources, objectives/concepts all
// already had stable ids before 4.5a and are left completely alone here).
//
// Pure function: takes one course document at schema_version 1, returns a
// new document at schema_version 2 plus a diagnostics summary. Never
// mutates the object it's given -- every level that changes is rebuilt
// with a fresh object/array, including nested ones (e.g. an accordion
// item that already had an item_id still gets a new item object, because
// its body_blocks may need migrating even though the item_id itself
// doesn't change).
function migrateBlockList(blocks, diagnostics) {
  return (blocks || []).map((block) => migrateBlock(block, diagnostics));
}

function migrateBlock(block, diagnostics) {
  if (!block || typeof block !== 'object') return block;

  let next = block;

  if ((block.type === 'accordion' || block.type === 'tabs') && block.content?.items) {
    next = {
      ...block,
      content: {
        ...block.content,
        items: block.content.items.map((item) => {
          if (!item || typeof item !== 'object') return item;
          const hadId = Boolean(item.item_id);
          if (!hadId) diagnostics.itemsAssigned += 1;
          return {
            ...item,
            item_id: hadId ? item.item_id : genItemId(),
            body_blocks: migrateBlockList(item.body_blocks, diagnostics),
          };
        }),
      },
    };
  }

  // two_column slots can only ever hold text/heading/image/embed
  // (blockDefaults.js TWO_COLUMN_SLOT_TYPES) -- never accordion/tabs, so
  // this recursion is a defensive no-op today, kept for the same reason
  // the pre-existing assignBlockIds/rebuildBlockWithIds recursion in
  // CourseEditor.jsx always walks left/right too: correctness shouldn't
  // depend on remembering that constraint holds forever.
  if (next.left) next = { ...next, left: migrateBlock(next.left, diagnostics) };
  if (next.right) next = { ...next, right: migrateBlock(next.right, diagnostics) };

  return next;
}

function migrateVariables(variables, diagnostics) {
  return (variables || []).map((v) => {
    if (v.variable_id) return v;
    diagnostics.variablesAssigned += 1;
    return { variable_id: genVariableId(), ...v };
  });
}

// Not an identity fix -- found running this migration against every real
// course in the dev database for the first time (this codebase never had
// a live schema validator before Phase 4.5a, so nothing had ever actually
// checked resource size_bytes's type against the schema until now). The
// `resources` Postgres table stores size_bytes as BIGINT, which `pg`
// returns as a JS string, not a number; that string was copied verbatim
// into course_json.meta.resources[] on upload (fixed at the source in
// packages/server/src/routes/resources.js's insertResource, so this only
// matters for documents attached before that fix). Coercing it here is
// required for "runs cleanly on historical fixtures" to be true against
// REAL fixtures, not just clean hand-built ones -- see DECISIONS.md.
function migrateResources(resources, diagnostics) {
  return (resources || []).map((r) => {
    if (typeof r.size_bytes === 'number') return r;
    diagnostics.resourceSizesCoerced += 1;
    return { ...r, size_bytes: Number(r.size_bytes) };
  });
}

export default {
  id: '0001-add-missing-stable-ids',
  fromVersion: 1,
  toVersion: 2,
  migrate(document) {
    const diagnostics = { itemsAssigned: 0, variablesAssigned: 0, resourceSizesCoerced: 0 };

    const pages = (document.pages || []).map((page) => ({
      ...page,
      blocks: migrateBlockList(page.blocks, diagnostics),
    }));

    const variables = migrateVariables(document.variables, diagnostics);
    const meta = document.meta?.resources
      ? { ...document.meta, resources: migrateResources(document.meta.resources, diagnostics) }
      : document.meta;

    return {
      document: { ...document, schema_version: 2, meta, pages, variables },
      diagnostics,
    };
  },
};
