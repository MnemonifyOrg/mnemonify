// Derived dependency index (Phase 4.5b, per ARCHITECTURE-AUDIT.md 4.4 and
// DATA-MODEL.md section 16's dependency-edges list). Given a course
// document, answers "what references this entity?" for blocks,
// variables, assets, and pages -- enabling safe-delete warnings,
// "used by" displays, and (later) broken-reference detection.
//
// This is DERIVED, never a second persisted source of truth (ADR-0007's
// same principle applied here, not just to the learning-alignment
// graph): nothing in this file writes to course_json, and its output is
// never saved back into the document. Call it fresh whenever you need an
// answer; there is no cache to invalidate because nothing is cached. If
// a future caller needs to avoid rebuilding the index on every keystroke,
// that caller owns memoizing buildDependencyIndex()'s result and
// invalidating it on save -- this module doesn't need to know about that
// to stay correct, per the same "derived, rebuildable" principle
// DATA-MODEL.md section 15 already establishes for every other index in
// this codebase.
//
// Framework-agnostic (no React), living in packages/schema next to
// block-registry.js and course.schema.json for the same reason: it's
// pure data logic that the server, the editor, and the player could all
// reasonably need, with no framework dependency to drag along.

import { BLOCK_REGISTRY } from './block-registry.js';

function blockDisplayName(type) {
  return BLOCK_REGISTRY[type]?.displayName || type;
}

// Same convention as packages/editor/src/lib/triggerUtils.js's
// blockLabel/autoBlockLabel (P1-56 custom labels, falling back to
// "{Type} ({position among same-type blocks on this page})") --
// deliberately re-implemented here rather than imported, since that file
// lives in the editor package and pulling it in would create the same
// kind of cross-package coupling block-registry.js's own header comment
// explains avoiding. Kept in sync by convention; both must produce
// identical labels for the same block, since an author comparing a
// SHOW_BLOCK dropdown label against a delete-warning label should never
// see two different names for the same block.
export function labelForBlock(block, pageBlocks) {
  if (block.label && block.label.trim()) return block.label.trim();
  const typeLabel = blockDisplayName(block.type);
  if (!pageBlocks) return typeLabel;
  const sameType = pageBlocks.filter((b) => b.type === block.type);
  const position = sameType.findIndex((b) => b.block_id === block.block_id) + 1;
  return position > 0 ? `${typeLabel} (${position})` : typeLabel;
}

function addEdge(index, targetId, entry) {
  if (!targetId) return;
  if (!index[targetId]) index[targetId] = [];
  index[targetId].push(entry);
}

// Walks a condition (bare comparison | {all:[...]} | {any:[...]} |
// null/undefined -- the one shape shared by trigger.condition,
// block.visibility_condition, and page.continue_gate) and calls
// onVar(name) for every variable it reads.
function walkCondition(condition, onVar) {
  if (!condition) return;
  if (condition.all) return condition.all.forEach((c) => walkCondition(c, onVar));
  if (condition.any) return condition.any.forEach((c) => walkCondition(c, onVar));
  if (condition.var) onVar(condition.var);
}

function walkTriggers(triggers, owner, index) {
  for (const trigger of triggers || []) {
    walkCondition(trigger.condition, (varName) => {
      addEdge(index, varName, { ...owner, referenceType: 'trigger_reads_variable', triggerId: trigger.trigger_id });
    });
    for (const action of trigger.actions || []) {
      if ((action.action === 'SET_VAR' || action.action === 'ADJUST_VAR') && action.var) {
        addEdge(index, action.var, { ...owner, referenceType: 'trigger_writes_variable', triggerId: trigger.trigger_id });
      }
      if (['SHOW_BLOCK', 'HIDE_BLOCK', 'ENABLE_BLOCK', 'DISABLE_BLOCK'].includes(action.action) && action.target) {
        addEdge(index, action.target, { ...owner, referenceType: 'trigger_targets_block', triggerId: trigger.trigger_id });
      }
      if (action.action === 'JUMP_TO_PAGE' && action.target) {
        addEdge(index, action.target, { ...owner, referenceType: 'trigger_navigates_to_page', triggerId: trigger.trigger_id });
      }
    }
  }
}

// Walks a rich_text array (the {t, v, asset_id?} segment shape shared by
// text blocks, reflection prompts, and per-option KC feedback) for
// asset_link segments -- REQUIREMENTS.md's "link a term inside a case
// discussion text block to a lightbox image."
function walkRichText(richText, owner, index) {
  for (const segment of richText || []) {
    if (segment.asset_id) {
      addEdge(index, segment.asset_id, { ...owner, referenceType: 'block_uses_asset' });
    }
  }
}

function walkBlockAssetRefs(block, owner, index) {
  const content = block.content || {};
  if (content.asset_id) addEdge(index, content.asset_id, { ...owner, referenceType: 'block_uses_asset' });
  for (const assetId of content.asset_ids || []) {
    addEdge(index, assetId, { ...owner, referenceType: 'block_uses_asset' });
  }
  if (content.rich_text) walkRichText(content.rich_text, owner, index);
  // knowledge-check: question image, per-option image/feedback image,
  // block-level correct/incorrect feedback images.
  if (content.question_image_id) addEdge(index, content.question_image_id, { ...owner, referenceType: 'block_uses_asset' });
  if (content.correct_feedback_image_id) addEdge(index, content.correct_feedback_image_id, { ...owner, referenceType: 'block_uses_asset' });
  if (content.incorrect_feedback_image_id) addEdge(index, content.incorrect_feedback_image_id, { ...owner, referenceType: 'block_uses_asset' });
  for (const option of content.options || []) {
    if (option.image_id) addEdge(index, option.image_id, { ...owner, referenceType: 'block_uses_asset' });
    if (option.feedback?.image_id) addEdge(index, option.feedback.image_id, { ...owner, referenceType: 'block_uses_asset' });
    if (option.feedback?.rich_text) walkRichText(option.feedback.rich_text, owner, index);
  }
}

// Recurses into a block and everything it can contain (two_column
// left/right slots; accordion/tabs item body_blocks) -- the exact same
// containment shape CourseEditor.jsx's id-remap functions and migration
// 0001 already walk, just for dependency edges instead of ids.
function walkBlock(block, page, pageBlocks, index) {
  if (!block) return;
  const owner = { id: block.block_id, entityType: 'block', label: labelForBlock(block, pageBlocks), pageId: page?.page_id };

  walkCondition(block.visibility_condition, (varName) => {
    addEdge(index, varName, { ...owner, referenceType: 'visibility_condition_reads_variable' });
  });
  walkTriggers(block.triggers, owner, index);
  walkBlockAssetRefs(block, owner, index);

  if (block.left) walkBlock(block.left, page, pageBlocks, index);
  if (block.right) walkBlock(block.right, page, pageBlocks, index);
  for (const item of block.content?.items || []) {
    for (const child of item.body_blocks || []) {
      walkBlock(child, page, pageBlocks, index);
    }
  }
}

// Builds the full dependency index for a course document: a plain object
// keyed by entity id (block_id, variable name, asset_id, or page_id),
// each value an array of { id, entityType, label, referenceType, ... }
// describing everything that references that entity.
export function buildDependencyIndex(courseJson) {
  const index = {};
  if (!courseJson) return index;

  for (const page of courseJson.pages || []) {
    const pageOwner = { id: page.page_id, entityType: 'page', label: page.title || page.page_id, pageId: page.page_id };
    walkCondition(page.continue_gate, (varName) => {
      addEdge(index, varName, { ...pageOwner, referenceType: 'continue_gate_reads_variable' });
    });
    walkTriggers(page.triggers, pageOwner, index);
    for (const block of page.blocks || []) {
      walkBlock(block, page, page.blocks, index);
    }
  }

  // Player-settings utility bar custom items can jump to a page
  // (P1-57/58) -- the same "trigger navigates to page" reference shape,
  // just authored outside a block or page trigger.
  for (const item of courseJson.meta?.utility_bar?.custom || []) {
    if (item.action === 'jump_page' && item.target) {
      addEdge(index, item.target, {
        id: item.id,
        entityType: 'utility_item',
        label: item.label || 'Custom utility item',
        referenceType: 'utility_item_navigates_to_page',
      });
    }
  }

  return index;
}

// Convenience wrapper matching the exact signature ARCHITECTURE-AUDIT.md
// 4.4 / this phase's task describes: getDependents(entityId, courseJson).
// Builds the index fresh each call -- see this file's header comment for
// why that's the right default and where caching would go if a future
// caller ever needs it.
export function getDependents(entityId, courseJson) {
  const index = buildDependencyIndex(courseJson);
  return index[entityId] || [];
}
