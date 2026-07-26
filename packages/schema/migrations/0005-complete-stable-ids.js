import { stableId } from './idGen.js';

// v5 already contains the first partial stable-ID migration, but documents
// at that version can still contain nested entities created by later feature
// work. This completion migration is deliberately data-shape preserving:
// it fills missing IDs in the existing objects and does not convert the
// primitive objective_ids reference arrays into a second mapping model.
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
    answerOptionsAssigned: 0,
    feedbackVariantsAssigned: 0,
    accordionItemsAssigned: 0,
    tabItemsAssigned: 0,
    flashcardsAssigned: 0,
    matchingPromptsAssigned: 0,
    matchingOptionsAssigned: 0,
    orderingItemsAssigned: 0,
    hotspotRegionsAssigned: 0,
    objectivesAssigned: 0,
    moduleGroupsAssigned: 0,
    bankQuestionsAssigned: 0,
    glossaryTermsAssigned: 0,
    variablesAssigned: 0,
    resourcesAssigned: 0,
  };
}

function ensureId(object, field, prefix, seed, used, diagnostics, diagnosticKey) {
  if (!isObject(object)) return object;
  if (typeof object[field] === 'string' && object[field]) return object;
  diagnostics[diagnosticKey] += 1;
  return { ...object, [field]: stableId(prefix, seed, used) };
}

function migrateOption(option, path, used, diagnostics) {
  if (!isObject(option)) return option;
  let next = option;
  // Some very early imported questions used option_id. Keep that value and
  // add the canonical `id` used by the current editor/player code.
  if (!next.id && next.option_id) next = { ...next, id: next.option_id };
  next = ensureId(next, 'id', 'opt', path, used, diagnostics, 'answerOptionsAssigned');
  if (isObject(next.feedback)) {
    next = {
      ...next,
      feedback: ensureId(next.feedback, 'feedback_id', 'fbk', `${path}/feedback`, used, diagnostics, 'feedbackVariantsAssigned'),
    };
  }
  return next;
}

function migrateContent(content, type, path, used, diagnostics) {
  if (!isObject(content)) return content;
  let next = content;

  if (Array.isArray(content.options) && (type === 'knowledge-check' || type === 'knowledge_check' || type === 'question-bank')) {
    next = { ...next, options: content.options.map((option, index) => migrateOption(option, `${path}/option-${index}`, used, diagnostics)) };
  }

  if (Array.isArray(content.items) && (type === 'accordion' || type === 'tabs' || type === 'ordering')) {
    const itemPrefix = type === 'ordering' ? 'ord' : 'itm';
    const diagnosticKey = type === 'ordering'
      ? 'orderingItemsAssigned'
      : type === 'accordion' ? 'accordionItemsAssigned' : 'tabItemsAssigned';
    next = {
      ...next,
      items: content.items.map((item, index) => {
        if (!isObject(item)) return item;
        let migrated = ensureId(item, 'item_id', itemPrefix, `${path}/item-${index}`, used, diagnostics, diagnosticKey);
        if (Array.isArray(migrated.body_blocks)) {
          migrated = { ...migrated, body_blocks: migrateBlockList(migrated.body_blocks, `${path}/item-${index}`, used, diagnostics) };
        }
        return migrated;
      }),
    };
  }

  if (Array.isArray(content.cards) && type === 'flashcards') {
    next = {
      ...next,
      cards: content.cards.map((card, index) => ensureId(card, 'card_id', 'crd', `${path}/card-${index}`, used, diagnostics, 'flashcardsAssigned')),
    };
  }

  if (Array.isArray(content.prompts) && type === 'matching') {
    next = {
      ...next,
      prompts: content.prompts.map((prompt, index) => ensureId(prompt, 'prompt_id', 'mp', `${path}/prompt-${index}`, used, diagnostics, 'matchingPromptsAssigned')),
    };
  }

  if (Array.isArray(content.options) && type === 'matching') {
    next = {
      ...next,
      options: content.options.map((option, index) => ensureId(option, 'option_id', 'mo', `${path}/matching-option-${index}`, used, diagnostics, 'matchingOptionsAssigned')),
    };
  }

  if (Array.isArray(content.regions) && type === 'hotspot') {
    next = {
      ...next,
      regions: content.regions.map((region, index) => ensureId(region, 'region_id', 'hs', `${path}/region-${index}`, used, diagnostics, 'hotspotRegionsAssigned')),
    };
  }

  return next;
}

function migrateBlock(block, path, used, diagnostics) {
  if (!isObject(block)) return block;
  let next = { ...block };
  if (Object.prototype.hasOwnProperty.call(block, 'content')) {
    next.content = migrateContent(block.content, block.type, `${path}/content`, used, diagnostics);
  }
  if (next.left) next.left = migrateBlock(next.left, `${path}/left`, used, diagnostics);
  if (next.right) next.right = migrateBlock(next.right, `${path}/right`, used, diagnostics);
  return next;
}

function migrateBlockList(blocks, path, used, diagnostics) {
  return (blocks || []).map((block, index) => migrateBlock(block, `${path}/block-${index}`, used, diagnostics));
}

export default {
  id: '0005-complete-stable-ids',
  fromVersion: 5,
  toVersion: 6,
  migrate(document) {
    const next = structuredClone(document);
    const used = new Set();
    const diagnostics = createDiagnostics();
    collectExistingIds(next, used);

    if (Array.isArray(next.meta?.objectives)) {
      next.meta.objectives = next.meta.objectives.map((objective, index) => ensureId(objective, 'objective_id', 'obj', `meta/objective-${index}`, used, diagnostics, 'objectivesAssigned'));
    }
    if (Array.isArray(next.meta?.page_groups)) {
      next.meta.page_groups = next.meta.page_groups.map((group, index) => ensureId(group, 'group_id', 'grp', `meta/group-${index}`, used, diagnostics, 'moduleGroupsAssigned'));
    }
    if (Array.isArray(next.objectives)) {
      next.objectives = next.objectives.map((objective, index) => ensureId(objective, 'objective_id', 'obj', `objectives/${index}`, used, diagnostics, 'objectivesAssigned'));
    }
    if (Array.isArray(next.variables)) {
      next.variables = next.variables.map((variable, index) => ensureId(variable, 'variable_id', 'var', `variables/${index}`, used, diagnostics, 'variablesAssigned'));
    }
    if (Array.isArray(next.meta?.resources)) {
      next.meta.resources = next.meta.resources.map((resource, index) => ensureId(resource, 'resource_id', 'res', `resources/${index}`, used, diagnostics, 'resourcesAssigned'));
    }
    if (Array.isArray(next.glossary_terms)) {
      next.glossary_terms = next.glossary_terms.map((term, index) => ensureId(term, 'term_id', 'term_course', `glossary/${index}`, used, diagnostics, 'glossaryTermsAssigned'));
    }
    if (Array.isArray(next.pages)) {
      next.pages = next.pages.map((page, pageIndex) => ({
        ...page,
        blocks: migrateBlockList(page.blocks, `pages/${page.page_id || pageIndex}`, used, diagnostics),
      }));
    }
    if (Array.isArray(next.question_banks)) {
      next.question_banks = next.question_banks.map((bank, bankIndex) => ({
        ...bank,
        questions: (bank.questions || []).map((question, questionIndex) => {
          let migrated = ensureId(question, 'question_id', 'bq', `bank/${bank.bank_id || bankIndex}/question-${questionIndex}`, used, diagnostics, 'bankQuestionsAssigned');
          return Object.prototype.hasOwnProperty.call(migrated, 'content')
            ? { ...migrated, content: migrateContent(migrated.content, migrated.type || 'knowledge-check', `bank/${bank.bank_id || bankIndex}/question-${questionIndex}`, used, diagnostics) }
            : migrated;
        }),
      }));
    }
    if (Array.isArray(next.linked_entities)) {
      next.linked_entities = next.linked_entities.map((entity, index) => ({
        ...entity,
        ...(Object.prototype.hasOwnProperty.call(entity, 'content')
          ? { content: migrateContent(entity.content, entity.block_type || 'knowledge-check', `entity/${entity.entity_id || index}`, used, diagnostics) }
          : {}),
      }));
    }

    return { document: { ...next, schema_version: 6 }, diagnostics };
  },
};
