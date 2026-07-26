import { getCorrectOptionIds } from './knowledge-check.js';

export const NATIVE_BANK_FORMAT = 'mnemonify.question_bank';
export const NATIVE_BANK_FORMAT_VERSION = 1;

function clone(value) {
  return structuredClone(value);
}

function generatedId(prefix, existing = new Set()) {
  let id;
  do {
    id = `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  } while (existing.has(id));
  return id;
}

function collectStableIds(value, ids) {
  if (Array.isArray(value)) {
    value.forEach((child) => collectStableIds(child, ids));
    return;
  }
  if (!value || typeof value !== 'object') return;
  Object.entries(value).forEach(([key, child]) => {
    if ((key === 'id' || key.endsWith('_id')) && typeof child === 'string' && child) ids.add(child);
    collectStableIds(child, ids);
  });
}

// A transferred question is a new authoring entity, even when its source id
// does not collide with anything in the target course. Keep the copy
// independent from the source by reminting every stable id in its nested
// content, not just the top-level question id. The editor's page/block copy
// code follows the same rule; this helper keeps the schema-owned bank import
// path from becoming a second exception.
const NESTED_ID_PREFIXES = {
  bank: 'bnk',
  question: 'bq',
  entity: 'ent',
  block: 'blk',
  trigger: 'trg',
  option: 'opt',
  feedback: 'fbk',
  item: 'itm',
  orderingItem: 'ord',
  card: 'crd',
  matchingPrompt: 'mp',
  matchingOption: 'mo',
  hotspotRegion: 'hs',
};

function nextFreshId(kind, existing, idFactory) {
  const prefix = NESTED_ID_PREFIXES[kind] || kind;
  const factory = idFactory[kind];
  let id = typeof factory === 'function' ? factory(existing) : generatedId(prefix, existing);
  while (!id || existing.has(id)) {
    id = generatedId(prefix, existing);
  }
  existing.add(id);
  return id;
}

function defaultNestedIdFactory() {
  return {
    bank: (existing) => generatedId('bnk', existing),
    question: (existing) => generatedId('bq', existing),
    entity: (existing) => generatedId('ent', existing),
    block: (existing) => generatedId('blk', existing),
    trigger: (existing) => generatedId('trg', existing),
    option: (existing) => generatedId('opt', existing),
    feedback: (existing) => generatedId('fbk', existing),
    item: (existing) => generatedId('itm', existing),
    orderingItem: (existing) => generatedId('ord', existing),
    card: (existing) => generatedId('crd', existing),
    matchingPrompt: (existing) => generatedId('mp', existing),
    matchingOption: (existing) => generatedId('mo', existing),
    hotspotRegion: (existing) => generatedId('hs', existing),
  };
}

function regenerateBlockCopy(block, type, idFactory, usedIds) {
  if (!block || typeof block !== 'object') return block;
  const next = { ...clone(block), block_id: nextFreshId('block', usedIds, idFactory) };
  if (Array.isArray(next.triggers)) {
    next.triggers = next.triggers.map((trigger) => ({
      ...trigger,
      trigger_id: nextFreshId('trigger', usedIds, idFactory),
    }));
  }
  if (Object.prototype.hasOwnProperty.call(next, 'content')) {
    next.content = regenerateNestedContentIds(next.content, type || next.type, idFactory, usedIds);
  }
  if (next.left) next.left = regenerateBlockCopy(next.left, next.left.type, idFactory, usedIds);
  if (next.right) next.right = regenerateBlockCopy(next.right, next.right.type, idFactory, usedIds);
  return next;
}

function regenerateNestedContentIds(content, type, idFactory, usedIds) {
  if (!content || typeof content !== 'object') return content;
  let next = clone(content);

  const answerOptions = Array.isArray(content.options)
    && content.options.some((option) => option && Object.prototype.hasOwnProperty.call(option, 'id'))
    && (type === 'knowledge-check' || type === 'knowledge_check' || type === 'question-bank' || !type);
  if (answerOptions) {
    const optionIdMap = new Map();
    next.options = content.options.map((option) => {
      if (!option || typeof option !== 'object') return option;
      const nextId = nextFreshId('option', usedIds, idFactory);
      if (typeof option.id === 'string' && !optionIdMap.has(option.id)) optionIdMap.set(option.id, nextId);
      const feedback = option.feedback && typeof option.feedback === 'object'
        ? { ...clone(option.feedback), feedback_id: nextFreshId('feedback', usedIds, idFactory) }
        : option.feedback;
      return { ...clone(option), id: nextId, ...(feedback ? { feedback } : {}) };
    });
    if (typeof content.correct_option_id === 'string') {
      next.correct_option_id = optionIdMap.get(content.correct_option_id) || content.correct_option_id;
    }
    if (Array.isArray(content.correct_option_ids)) {
      next.correct_option_ids = content.correct_option_ids.map((id) => optionIdMap.get(id) || id);
    }
  }

  const matchingOptions = Array.isArray(content.options)
    && content.options.some((option) => option && Object.prototype.hasOwnProperty.call(option, 'option_id'));
  if (matchingOptions) {
    const optionIdMap = new Map();
    next.options = content.options.map((option) => {
      if (!option || typeof option !== 'object') return option;
      const nextId = nextFreshId('matchingOption', usedIds, idFactory);
      if (typeof option.option_id === 'string') optionIdMap.set(option.option_id, nextId);
      return { ...clone(option), option_id: nextId };
    });
    if (Array.isArray(content.prompts)) {
      next.prompts = content.prompts.map((prompt) => ({
        ...clone(prompt),
        prompt_id: nextFreshId('matchingPrompt', usedIds, idFactory),
        correct_option_id: optionIdMap.get(prompt.correct_option_id) || prompt.correct_option_id,
      }));
    }
  } else if (Array.isArray(content.prompts)) {
    next.prompts = content.prompts.map((prompt) => ({
      ...clone(prompt),
      prompt_id: nextFreshId('matchingPrompt', usedIds, idFactory),
    }));
  }

  if (Array.isArray(content.items) && content.items.some((item) => item && Object.prototype.hasOwnProperty.call(item, 'item_id'))) {
    const itemKind = type === 'ordering' || content.items.some((item) => String(item?.item_id || '').startsWith('ord_'))
      ? 'orderingItem'
      : 'item';
    next.items = content.items.map((item) => {
      if (!item || typeof item !== 'object') return item;
      return {
        ...clone(item),
        item_id: nextFreshId(itemKind, usedIds, idFactory),
        ...(Array.isArray(item.body_blocks)
          ? { body_blocks: item.body_blocks.map((block) => regenerateBlockCopy(block, block.type, idFactory, usedIds)) }
          : {}),
      };
    });
  }

  if (Array.isArray(content.cards)) {
    next.cards = content.cards.map((card) => ({ ...clone(card), card_id: nextFreshId('card', usedIds, idFactory) }));
  }
  if (Array.isArray(content.regions)) {
    next.regions = content.regions.map((region) => ({ ...clone(region), region_id: nextFreshId('hotspotRegion', usedIds, idFactory) }));
  }
  return next;
}

function objectivesForCourse(course) {
  return course?.objectives || course?.meta?.objectives || [];
}

function richTextToPlain(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.replace(/<[^>]*>/g, ' ');
  if (Array.isArray(value)) return value.map(richTextToPlain).join('');
  if (typeof value === 'object') {
    if (value.t === 'variable') return `{${value.var_name || ''}}`;
    if (value.v !== undefined) return richTextToPlain(value.v);
    if (value.rich_text !== undefined) return richTextToPlain(value.rich_text);
    if (value.text !== undefined) return richTextToPlain(value.text);
  }
  return '';
}

function questionText(question) {
  return richTextToPlain(question?.content?.question || question?.content?.prompt || question?.content?.text).replace(/\s+/g, ' ').trim();
}

function collectVariableReferences(value, location, result) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectVariableReferences(child, `${location}[${index}]`, result));
    return;
  }
  if (typeof value === 'string') {
    const matches = value.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g);
    for (const match of matches) result.push({ name: match[1], location });
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.t === 'variable' && value.var_name) result.push({ name: value.var_name, location });
  Object.entries(value).forEach(([key, child]) => {
    if (key === 'var_name' || key === 't') return;
    collectVariableReferences(child, `${location}.${key}`, result);
  });
}

function sourceBank(course, bankId) {
  return (course?.question_banks || []).find((bank) => bank.bank_id === bankId) || null;
}

export function buildNativeQuestionBankExport(course, bankId, exportedAt = new Date().toISOString()) {
  const rawBank = sourceBank(course, bankId);
  if (!rawBank) throw new Error(`Question bank ${bankId} was not found.`);
  const materializedCourse = course?.linked_entities ? materializeForTransfer(course) : course;
  const materializedBank = sourceBank(materializedCourse, bankId) || rawBank;
  const materializedById = new Map((materializedBank.questions || []).map((question) => [question.question_id, question]));
  const linkedEntityIds = new Set();
  const questions = (rawBank.questions || []).map((rawQuestion) => {
    const materialized = materializedById.get(rawQuestion.question_id) || rawQuestion;
    if (rawQuestion.linked_entity_id) linkedEntityIds.add(rawQuestion.linked_entity_id);
    const question = clone(materialized);
    delete question.type;
    return question;
  });
  const linkedEntities = (course?.linked_entities || [])
    .filter((entity) => linkedEntityIds.has(entity.entity_id))
    .map(clone);
  return {
    format: NATIVE_BANK_FORMAT,
    format_version: NATIVE_BANK_FORMAT_VERSION,
    exported_at: exportedAt,
    bank: {
      ...clone(rawBank),
      title: rawBank.name || rawBank.bank_id,
      questions,
    },
    linked_entities: linkedEntities,
  };
}

function materializeForTransfer(course) {
  const entities = new Map((course.linked_entities || []).map((entity) => [entity.entity_id, entity]));
  return {
    ...course,
    question_banks: (course.question_banks || []).map((bank) => ({
      ...bank,
      questions: (bank.questions || []).map((question) => {
        const entity = entities.get(question.linked_entity_id);
        return entity
          ? { ...question, content: clone(entity.content), scored: entity.metadata?.scored ?? question.scored, objective_ids: [...(entity.metadata?.objective_ids || question.objective_ids || [])], tags: [...(entity.metadata?.tags || question.tags || [])] }
          : question;
      }),
    })),
  };
}

export function parseNativeQuestionBankExport(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!parsed || parsed.format !== NATIVE_BANK_FORMAT || parsed.format_version !== NATIVE_BANK_FORMAT_VERSION) {
    throw new Error('This file is not a supported Mnemonify question-bank JSON export.');
  }
  if (!parsed.bank || !Array.isArray(parsed.bank.questions)) throw new Error('The question-bank export is missing its bank or questions.');
  return clone(parsed);
}

function referenceWarnings(course, questions) {
  const objectiveIds = new Set(objectivesForCourse(course).map((objective) => objective.objective_id));
  const variableNames = new Set((course?.variables || []).map((variable) => variable.name));
  const missingObjectives = [];
  const missingVariables = [];
  for (const [index, question] of questions.entries()) {
    for (const objectiveId of question.objective_ids || []) {
      if (!objectiveIds.has(objectiveId)) missingObjectives.push({ id: objectiveId, question_id: question.question_id, location: `Question ${index + 1}.objective_ids` });
    }
    const refs = [];
    collectVariableReferences(question.content, `Question ${index + 1}.content`, refs);
    for (const ref of refs) {
      if (!variableNames.has(ref.name)) missingVariables.push({ name: ref.name, question_id: question.question_id, location: ref.location });
    }
  }
  return { missingObjectives, missingVariables };
}

export function inspectNativeQuestionBankImport(course, payload, targetBankId = null) {
  const parsed = parseNativeQuestionBankExport(payload);
  const target = targetBankId ? sourceBank(course, targetBankId) : null;
  const targetQuestionIds = new Set((target?.questions || []).map((question) => question.question_id));
  const idCollisions = (parsed.bank.questions || []).filter((question) => targetQuestionIds.has(question.question_id)).map((question) => question.question_id);
  return {
    bankTitle: parsed.bank.title || parsed.bank.name || 'Imported Question Bank',
    questionCount: parsed.bank.questions.length,
    idCollisions,
    ...referenceWarnings(course, parsed.bank.questions),
  };
}

function defaultIdFactory() {
  return defaultNestedIdFactory();
}

export function importNativeQuestionBank(course, payload, { mode = 'create_new', targetBankId = null, idFactory = defaultIdFactory() } = {}) {
  const parsed = parseNativeQuestionBankExport(payload);
  const factories = { ...defaultIdFactory(), ...idFactory };
  const existingBanks = course?.question_banks || [];
  const target = mode === 'merge' ? sourceBank(course, targetBankId) : null;
  if (mode === 'merge' && !target) throw new Error('Choose an existing question bank before merging.');
  const usedIds = new Set();
  collectStableIds(course, usedIds);
  const bankId = target?.bank_id || nextFreshId('bank', usedIds, factories);
  const idRemaps = [];
  const sourceEntities = new Map((parsed.linked_entities || []).map((entity) => [entity.entity_id, entity]));
  const entityIdMap = new Map();
  const importedEntities = [];

  function mapEntity(entityId, fallbackQuestion) {
    if (!entityId) return null;
    if (entityIdMap.has(entityId)) return entityIdMap.get(entityId);
    const sourceEntity = sourceEntities.get(entityId) || {
      entity_id: entityId,
      block_type: 'knowledge-check',
      content: clone(fallbackQuestion?.content || {}),
      metadata: { scored: fallbackQuestion?.scored !== false, objective_ids: [...(fallbackQuestion?.objective_ids || [])], tags: [...(fallbackQuestion?.tags || [])], block_fields: {} },
    };
    const nextEntityId = nextFreshId('entity', usedIds, factories);
    entityIdMap.set(entityId, nextEntityId);
    importedEntities.push({
      ...clone(sourceEntity),
      entity_id: nextEntityId,
      content: regenerateNestedContentIds(sourceEntity.content || fallbackQuestion?.content || {}, sourceEntity.block_type, factories, usedIds),
    });
    return nextEntityId;
  }

  const questions = (parsed.bank.questions || []).map((sourceQuestion) => {
    const question = clone(sourceQuestion);
    const originalId = question.question_id;
    const nextId = nextFreshId('question', usedIds, factories);
    idRemaps.push({ from: originalId, to: nextId });
    const questionType = question.type;
    question.question_id = nextId;
    if (question.content) question.content = regenerateNestedContentIds(question.content, questionType, factories, usedIds);
    delete question.type;
    if (question.linked_entity_id) {
      const mappedEntityId = mapEntity(question.linked_entity_id, question);
      question.linked_entity_id = mappedEntityId;
      delete question.content;
    }
    return question;
  });
  const { title: importedTitle, ...importedBankFields } = clone(parsed.bank);
  const nextBank = target
    ? { ...target, questions: [...(target.questions || []), ...questions] }
    : { ...importedBankFields, bank_id: bankId, name: parsed.bank.name || importedTitle || 'Imported Question Bank', questions };
  const nextBanks = target
    ? existingBanks.map((bank) => (bank.bank_id === target.bank_id ? nextBank : bank))
    : [...existingBanks, nextBank];
  return {
    course: {
      ...course,
      question_banks: nextBanks,
      linked_entities: [...(course?.linked_entities || []), ...importedEntities],
    },
    bankId,
    importedQuestions: questions,
    idRemaps,
    ...referenceWarnings(course, parsed.bank.questions),
  };
}

function giftEscape(value) {
  return String(value || '').replace(/([\\~=#:{}])/g, '\\$1');
}

export function exportQuestionBankAsGift(course, bankId) {
  const payload = buildNativeQuestionBankExport(course, bankId);
  const warnings = [
    'GIFT does not preserve Mnemonify objectives, tags, variable bindings, media references, or linked-entity relationships.',
    'Question feedback and per-option feedback are omitted.',
  ];
  if (payload.bank.questions.some((question) => question.content?.multi_select === true)) {
    warnings.push('Multi-select questions are emitted with multiple correct markers; GIFT readers may apply different partial-credit semantics than Mnemonify all-or-nothing scoring.');
  }
  const lines = [];
  payload.bank.questions.forEach((question, index) => {
    const content = question.content || {};
    const title = giftEscape(questionText(question) || `Question ${index + 1}`).slice(0, 80);
    lines.push(`::${title}::`);
    lines.push(giftEscape(questionText(question)));
    lines.push('{');
    const correctIds = new Set(getCorrectOptionIds(content));
    for (const option of content.options || []) {
      const marker = correctIds.has(option.id) || option.correct === true ? '=' : '~';
      lines.push(`${marker}${giftEscape(richTextToPlain(option.text))}`);
    }
    lines.push('}', '');
  });
  return { content: lines.join('\n'), warnings, filename: `${payload.bank.name || payload.bank.bank_id}.gift` };
}

export { richTextToPlain };
