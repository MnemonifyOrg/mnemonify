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
  return {
    bank: (existing) => generatedId('bnk', existing),
    question: (existing) => generatedId('bq', existing),
    entity: (existing) => generatedId('ent', existing),
  };
}

export function importNativeQuestionBank(course, payload, { mode = 'create_new', targetBankId = null, idFactory = defaultIdFactory() } = {}) {
  const parsed = parseNativeQuestionBankExport(payload);
  const existingBanks = course?.question_banks || [];
  const target = mode === 'merge' ? sourceBank(course, targetBankId) : null;
  if (mode === 'merge' && !target) throw new Error('Choose an existing question bank before merging.');
  const bankId = target?.bank_id || idFactory.bank(new Set(existingBanks.map((bank) => bank.bank_id)));
  // Question ids are stable identifiers used by draw/resume state, so keep
  // them unique across the target course, not only within the selected bank.
  const existingQuestionIds = new Set(existingBanks.flatMap((bank) => (bank.questions || []).map((question) => question.question_id)));
  const importedQuestionIds = new Set();
  const idRemaps = [];
  const sourceEntities = new Map((parsed.linked_entities || []).map((entity) => [entity.entity_id, entity]));
  const existingEntityIds = new Set((course?.linked_entities || []).map((entity) => entity.entity_id));
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
    const nextEntityId = existingEntityIds.has(entityId) ? idFactory.entity(new Set([...existingEntityIds, ...importedEntities.map((entity) => entity.entity_id)])) : entityId;
    entityIdMap.set(entityId, nextEntityId);
    importedEntities.push({ ...clone(sourceEntity), entity_id: nextEntityId });
    return nextEntityId;
  }

  const questions = (parsed.bank.questions || []).map((sourceQuestion) => {
    const question = clone(sourceQuestion);
    const originalId = question.question_id;
    let nextId = originalId;
    if (existingQuestionIds.has(nextId) || importedQuestionIds.has(nextId)) {
      nextId = idFactory.question(new Set([...existingQuestionIds, ...importedQuestionIds]));
      idRemaps.push({ from: originalId, to: nextId });
    }
    importedQuestionIds.add(nextId);
    question.question_id = nextId;
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
