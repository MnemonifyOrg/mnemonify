import { stableId } from './idGen.js';

const KNOWLEDGE_CHECK_TYPES = new Set(['knowledge-check', 'knowledge_check', 'question-bank']);

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function collectExistingIds(value, ids) {
  if (Array.isArray(value)) {
    value.forEach((child) => collectExistingIds(child, ids));
    return;
  }
  if (!isObject(value)) return;
  Object.entries(value).forEach(([key, child]) => {
    if ((key === 'id' || key.endsWith('_id')) && typeof child === 'string' && child) ids.add(child);
    collectExistingIds(child, ids);
  });
}

function createDiagnostics() {
  return {
    duplicateOptionGroupsFound: 0,
    duplicateOptionIdsRegenerated: 0,
    optionReferencesUpdated: 0,
  };
}

function updateOptionReferences(content, remappedIds, diagnostics) {
  let next = content;
  if (typeof content.correct_option_id === 'string' && remappedIds.has(content.correct_option_id)) {
    next = { ...next, correct_option_id: remappedIds.get(content.correct_option_id) };
    diagnostics.optionReferencesUpdated += 1;
  }
  if (Array.isArray(content.correct_option_ids)) {
    const updated = content.correct_option_ids.map((id) => remappedIds.get(id) || id);
    if (updated.some((id, index) => id !== content.correct_option_ids[index])) {
      next = { ...next, correct_option_ids: updated };
      diagnostics.optionReferencesUpdated += 1;
    }
  }
  return next;
}

function migrateKnowledgeCheckContent(content, path, usedIds, seenOptionIds, duplicateOptionGroups, diagnostics) {
  if (!isObject(content) || !Array.isArray(content.options)) return content;

  const remappedIds = new Map();
  let changed = false;
  const options = content.options.map((option, index) => {
    if (!isObject(option) || typeof option.id !== 'string' || !option.id) return option;

    const priorOccurrence = seenOptionIds.get(option.id);
    if (!priorOccurrence) {
      seenOptionIds.set(option.id, { path, index });
      return option;
    }

    duplicateOptionGroups.add(option.id);
    const nextId = stableId('opt', `${path}/duplicate-option-${index}`, usedIds);
    if (priorOccurrence.path !== path && !remappedIds.has(option.id)) remappedIds.set(option.id, nextId);
    diagnostics.duplicateOptionIdsRegenerated += 1;
    changed = true;
    return { ...option, id: nextId };
  });

  if (!changed) return content;
  return updateOptionReferences({ ...content, options }, remappedIds, diagnostics);
}

function migrateBlock(block, path, usedIds, seenOptionIds, duplicateOptionGroups, diagnostics) {
  if (!isObject(block)) return block;
  let next = block;

  if (KNOWLEDGE_CHECK_TYPES.has(block.type)) {
    next = { ...next, content: migrateKnowledgeCheckContent(block.content, `${path}/content`, usedIds, seenOptionIds, duplicateOptionGroups, diagnostics) };
  }

  if (Array.isArray(block.content?.items) && (block.type === 'accordion' || block.type === 'tabs')) {
    const items = block.content.items.map((item, index) => isObject(item) && Array.isArray(item.body_blocks)
      ? {
          ...item,
          body_blocks: item.body_blocks.map((child, childIndex) => migrateBlock(
            child,
            `${path}/content/item-${index}/body-block-${childIndex}`,
            usedIds,
            seenOptionIds,
            duplicateOptionGroups,
            diagnostics,
          )),
        }
      : item);
    next = { ...next, content: { ...next.content, items } };
  }

  if (block.left) next = { ...next, left: migrateBlock(block.left, `${path}/left`, usedIds, seenOptionIds, diagnostics) };
  if (block.right) next = { ...next, right: migrateBlock(block.right, `${path}/right`, usedIds, seenOptionIds, diagnostics) };
  return next;
}

function migrateBlockList(blocks, path, usedIds, seenOptionIds, duplicateOptionGroups, diagnostics) {
  return (blocks || []).map((block, index) => migrateBlock(block, `${path}/block-${index}`, usedIds, seenOptionIds, duplicateOptionGroups, diagnostics));
}

function migrateQuestion(question, path, usedIds, seenOptionIds, duplicateOptionGroups, diagnostics) {
  if (!isObject(question) || !Object.prototype.hasOwnProperty.call(question, 'content')) return question;
  return {
    ...question,
    content: migrateKnowledgeCheckContent(question.content, path, usedIds, seenOptionIds, duplicateOptionGroups, diagnostics),
  };
}

export default {
  id: '0006-regenerate-duplicate-option-ids',
  fromVersion: 6,
  toVersion: 7,
  migrate(document) {
    const next = structuredClone(document);
    const usedIds = new Set();
    const seenOptionIds = new Map();
    const duplicateOptionGroups = new Set();
    const diagnostics = createDiagnostics();
    collectExistingIds(next, usedIds);

    next.pages = (next.pages || []).map((page, pageIndex) => ({
      ...page,
      blocks: migrateBlockList(page.blocks, `pages/${page.page_id || pageIndex}`, usedIds, seenOptionIds, duplicateOptionGroups, diagnostics),
    }));
    next.question_banks = (next.question_banks || []).map((bank, bankIndex) => ({
      ...bank,
      questions: (bank.questions || []).map((question, questionIndex) => migrateQuestion(
        question,
        `bank/${bank.bank_id || bankIndex}/question-${questionIndex}/content`,
        usedIds,
        seenOptionIds,
        duplicateOptionGroups,
        diagnostics,
      )),
    }));
    next.linked_entities = (next.linked_entities || []).map((entity, entityIndex) => ({
      ...entity,
      content: migrateKnowledgeCheckContent(
        entity.content,
        `entity/${entity.entity_id || entityIndex}/content`,
        usedIds,
        seenOptionIds,
        duplicateOptionGroups,
        diagnostics,
      ),
    }));

    diagnostics.duplicateOptionGroupsFound = duplicateOptionGroups.size;
    return { document: { ...next, schema_version: 7 }, diagnostics };
  },
};
