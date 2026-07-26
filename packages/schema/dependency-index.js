// Derived dependency index (Phase 4.5b). This module only reads canonical
// course JSON and produces reverse reference edges; it never writes an index
// back into the course document. Rebuilding it is therefore always safe and
// cannot drift from authored data.

import { BLOCK_REGISTRY } from './block-registry.js';
import { SYSTEM_VARIABLE_DEFINITIONS } from './system-variables.js';

const BLOCK_TARGET_ACTIONS = new Set(['SHOW_BLOCK', 'HIDE_BLOCK', 'ENABLE_BLOCK', 'DISABLE_BLOCK']);
const QUESTION_BLOCK_TYPES = new Set(['knowledge-check', 'matching', 'ordering', 'hotspot']);

function blockDisplayName(type) {
  return BLOCK_REGISTRY[type]?.displayName || type;
}

export function labelForBlock(block, pageBlocks) {
  if (block.label && block.label.trim()) return block.label.trim();
  const typeLabel = blockDisplayName(block.type);
  if (!pageBlocks) return typeLabel;
  const sameType = pageBlocks.filter((candidate) => candidate.type === block.type);
  const position = sameType.findIndex((candidate) => candidate.block_id === block.block_id) + 1;
  return position > 0 ? `${typeLabel} (${position})` : typeLabel;
}

function addEdge(index, targetId, entry, targetType) {
  if (!targetId) return;
  if (!index[targetId]) index[targetId] = [];
  index[targetId].push({ ...entry, targetId, targetType });
}

function walkCondition(condition, onVariable) {
  if (!condition) return;
  if (condition.all) return condition.all.forEach((child) => walkCondition(child, onVariable));
  if (condition.any) return condition.any.forEach((child) => walkCondition(child, onVariable));
  if (condition.var) onVariable(condition.var);
}

function walkTriggers(triggers, owner, index) {
  for (const trigger of triggers || []) {
    walkCondition(trigger.condition, (variableName) => {
      addEdge(index, variableName, { ...owner, referenceType: 'trigger_reads_variable', triggerId: trigger.trigger_id }, 'variable');
    });
    for (const action of trigger.actions || []) {
      if ((action.action === 'SET_VAR' || action.action === 'ADJUST_VAR') && action.var) {
        addEdge(index, action.var, { ...owner, referenceType: 'trigger_writes_variable', triggerId: trigger.trigger_id }, 'variable');
      }
      if (BLOCK_TARGET_ACTIONS.has(action.action) && action.target) {
        addEdge(index, action.target, { ...owner, referenceType: 'trigger_targets_block', triggerId: trigger.trigger_id }, 'block');
      }
      if (action.action === 'JUMP_TO_PAGE' && action.target) {
        addEdge(index, action.target, { ...owner, referenceType: 'trigger_navigates_to_page', triggerId: trigger.trigger_id }, 'page');
      }
    }
  }
}

function walkRichText(richText, owner, index) {
  for (const segment of Array.isArray(richText) ? richText : []) {
    if (segment?.asset_id) addEdge(index, segment.asset_id, { ...owner, referenceType: 'block_uses_asset' }, 'asset');
  }
}

function addObjectiveEdges(objectiveIds, owner, index, referenceType) {
  for (const objectiveId of objectiveIds || []) {
    addEdge(index, objectiveId, { ...owner, referenceType }, 'objective');
  }
}

function addAssetEdge(assetId, owner, index) {
  if (assetId) addEdge(index, assetId, { ...owner, referenceType: 'block_uses_asset' }, 'asset');
}

function walkContentAssetRefs(content, owner, index) {
  if (!content || typeof content !== 'object') return;
  addAssetEdge(content.asset_id, owner, index);
  addAssetEdge(content.image_asset_id, owner, index);
  for (const assetId of content.asset_ids || []) addAssetEdge(assetId, owner, index);
  for (const field of ['rich_text', 'question', 'prompt', 'correct_feedback', 'incorrect_feedback']) {
    walkRichText(content[field], owner, index);
    if (content[field]?.rich_text) walkRichText(content[field].rich_text, owner, index);
  }
  for (const field of ['question_image_id', 'correct_feedback_image_id', 'incorrect_feedback_image_id']) {
    addAssetEdge(content[field], owner, index);
  }
  for (const option of content.options || []) {
    addAssetEdge(option.image_id, owner, index);
    addAssetEdge(option.feedback?.image_id, owner, index);
    walkRichText(option.text, owner, index);
    walkRichText(option.feedback?.rich_text, owner, index);
  }
  for (const card of content.cards || []) {
    addAssetEdge(card.front?.image_id, owner, index);
    addAssetEdge(card.back?.image_id, owner, index);
    walkRichText(card.front?.rich_text, owner, index);
    walkRichText(card.back?.rich_text, owner, index);
  }
  for (const prompt of content.prompts || []) {
    walkRichText(prompt.text, owner, index);
    addAssetEdge(prompt.image_id, owner, index);
  }
  for (const item of content.items || []) {
    walkRichText(item.text, owner, index);
  }
  for (const region of content.regions || []) {
    walkRichText(region.label, owner, index);
  }
}

function walkBlock(block, page, pageBlocks, index) {
  if (!block) return;
  const owner = {
    id: block.block_id,
    entityType: 'block',
    label: labelForBlock(block, pageBlocks),
    pageId: page?.page_id,
  };

  walkCondition(block.visibility_condition, (variableName) => {
    addEdge(index, variableName, { ...owner, referenceType: 'visibility_condition_reads_variable' }, 'variable');
  });
  walkTriggers(block.triggers, owner, index);
  walkContentAssetRefs(block.content, owner, index);

  if (block.objective_ids?.length) {
    addObjectiveEdges(block.objective_ids, owner, index, QUESTION_BLOCK_TYPES.has(block.type) ? 'question_has_objective' : 'block_has_objective');
  }
  if (block.linked_entity_id) {
    addEdge(index, block.linked_entity_id, { ...owner, referenceType: 'linked_entity_usage' }, 'linked_entity');
  }
  if (block.type === 'question_bank_draw' && block.content?.bank_id) {
    addEdge(index, block.content.bank_id, { ...owner, referenceType: 'block_uses_question_bank' }, 'question_bank');
  }

  if (block.left) walkBlock(block.left, page, pageBlocks, index);
  if (block.right) walkBlock(block.right, page, pageBlocks, index);
  for (const item of block.content?.items || []) {
    for (const child of item.body_blocks || []) walkBlock(child, page, pageBlocks, index);
  }
}

function indexPageReferences(page, index) {
  const pageOwner = { id: page.page_id, entityType: 'page', label: page.title || page.page_id, pageId: page.page_id };
  walkCondition(page.continue_gate, (variableName) => {
    addEdge(index, variableName, { ...pageOwner, referenceType: 'continue_gate_reads_variable' }, 'variable');
  });
  walkTriggers(page.triggers, pageOwner, index);
  for (const block of page.blocks || []) walkBlock(block, page, page.blocks || [], index);
}

function indexModuleReferences(courseJson, index) {
  for (const group of courseJson.meta?.page_groups || []) {
    const owner = { id: group.group_id, entityType: 'module', label: group.title || group.group_id };
    addObjectiveEdges(group.objective_ids, owner, index, 'module_has_objective');
  }
}

function indexBankReferences(courseJson, index) {
  for (const bank of courseJson.question_banks || []) {
    for (const question of bank.questions || []) {
      const owner = {
        id: question.question_id,
        entityType: 'question',
        label: `Question in ${bank.bank_id}`,
        bankId: bank.bank_id,
      };
      addObjectiveEdges(question.objective_ids, owner, index, 'question_has_objective');
      if (question.linked_entity_id) {
        addEdge(index, question.linked_entity_id, { ...owner, referenceType: 'linked_entity_usage' }, 'linked_entity');
      }
      walkContentAssetRefs(question.content, owner, index);
    }
  }
}

function indexUtilityReferences(courseJson, index) {
  for (const item of courseJson.meta?.utility_bar?.custom || []) {
    if (item.action === 'jump_page' && item.target) {
      addEdge(index, item.target, {
        id: item.id,
        entityType: 'utility_item',
        label: item.label || 'Custom utility item',
        referenceType: 'utility_item_navigates_to_page',
      }, 'page');
    }
  }
}

// Builds a reverse index keyed by referenced object id. Each edge identifies
// its target type as well as the source, allowing the same index to support
// used-by lookup, safe-delete checks, and deterministic broken-reference
// reporting without another reference walk.
export function buildDependencyIndex(courseJson) {
  const index = {};
  if (!courseJson) return index;

  for (const page of courseJson.pages || []) indexPageReferences(page, index);
  indexModuleReferences(courseJson, index);
  indexBankReferences(courseJson, index);
  indexUtilityReferences(courseJson, index);
  return index;
}

function entityInventory(courseJson) {
  const blockIds = new Set();
  function collect(block) {
    if (!block) return;
    if (block.block_id) blockIds.add(block.block_id);
    collect(block.left);
    collect(block.right);
    for (const item of block.content?.items || []) {
      for (const child of item.body_blocks || []) collect(child);
    }
  }
  for (const page of courseJson?.pages || []) for (const block of page.blocks || []) collect(block);

  return {
    block: blockIds,
    page: new Set((courseJson?.pages || []).map((page) => page.page_id)),
    asset: new Set((courseJson?.assets || []).map((asset) => asset.asset_id)),
    question_bank: new Set((courseJson?.question_banks || []).map((bank) => bank.bank_id)),
    objective: new Set((courseJson?.objectives || courseJson?.meta?.objectives || []).map((objective) => objective.objective_id)),
    linked_entity: new Set((courseJson?.linked_entities || []).map((entity) => entity.entity_id)),
    variable: new Set([
      ...(courseJson?.variables || []).map((variable) => variable.name),
      ...SYSTEM_VARIABLE_DEFINITIONS.map((variable) => variable.name),
    ]),
  };
}

export function getBrokenReferences(courseJson, prebuiltIndex = null) {
  const inventory = entityInventory(courseJson || {});
  const broken = [];
  for (const edges of Object.values(prebuiltIndex || buildDependencyIndex(courseJson))) {
    for (const edge of edges) {
      if (!edge.targetType || inventory[edge.targetType]?.has(edge.targetId)) continue;
      broken.push({ ...edge, reason: `${edge.targetType} does not exist` });
    }
  }
  return broken;
}

// Alias with a verb that reads naturally at analyzer/caller sites.
export const findBrokenReferences = getBrokenReferences;

export function getDependents(entityId, courseJson, prebuiltIndex = null) {
  return (prebuiltIndex || buildDependencyIndex(courseJson))[entityId] || [];
}
