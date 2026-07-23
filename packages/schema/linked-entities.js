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

function blockFields(block) {
  const { block_id, type, content, linked_entity_id, ...fields } = block;
  return fields;
}

export function createLinkedEntityFromBlock(block, entityId = generatedId('ent')) {
  return {
    entity_id: entityId,
    block_type: block.type,
    content: clone(block.content || {}),
    metadata: {
      scored: block.content?.scored !== false,
      objective_ids: [...(block.objective_ids || [])],
      tags: [...(block.tags || [])],
      block_fields: clone(blockFields(block)),
    },
  };
}

export function materializeBlockUsage(block, entity) {
  if (!block?.linked_entity_id || !entity) return block;
  return {
    ...(entity.metadata?.block_fields || {}),
    ...block,
    type: entity.block_type,
    content: clone(entity.content),
    linked_entity_id: entity.entity_id,
  };
}

function mapBlocks(blocks, transform) {
  return (blocks || []).map((block) => {
    let next = transform(block);
    if (next.content?.items) {
      next = {
        ...next,
        content: {
          ...next.content,
          items: next.content.items.map((item) => item?.body_blocks
            ? { ...item, body_blocks: mapBlocks(item.body_blocks, transform) }
            : item),
        },
      };
    }
    if (next.left) next = { ...next, left: mapBlocks([next.left], transform)[0] };
    if (next.right) next = { ...next, right: mapBlocks([next.right], transform)[0] };
    return next;
  });
}

export function materializeLinkedEntities(course) {
  const entities = new Map((course?.linked_entities || []).map((entity) => [entity.entity_id, entity]));
  const pages = (course?.pages || []).map((page) => ({
    ...page,
    blocks: mapBlocks(page.blocks, (block) => materializeBlockUsage(block, entities.get(block.linked_entity_id))),
  }));
  const questionBanks = (course?.question_banks || []).map((bank) => ({
    ...bank,
    questions: (bank.questions || []).map((question) => {
      const entity = entities.get(question.linked_entity_id);
      if (!entity) return question;
      return {
        ...question,
        type: entity.block_type,
        content: clone(entity.content),
        scored: entity.metadata?.scored ?? question.scored,
        objective_ids: [...(entity.metadata?.objective_ids || question.objective_ids || [])],
        tags: [...(entity.metadata?.tags || question.tags || [])],
      };
    }),
  }));
  return { ...course, pages, question_banks: questionBanks };
}

export function findLinkedUsages(course, entityId) {
  const usages = [];
  function visitBlocks(blocks, page) {
    for (const block of blocks || []) {
      if (block.linked_entity_id === entityId) {
        usages.push({ kind: 'page', page_id: page.page_id, block_id: block.block_id, label: page.title || page.page_id });
      }
      if (block.content?.items) {
        for (const item of block.content.items || []) visitBlocks(item.body_blocks, page);
      }
      if (block.left) visitBlocks([block.left], page);
      if (block.right) visitBlocks([block.right], page);
    }
  }
  for (const page of course?.pages || []) visitBlocks(page.blocks, page);
  for (const bank of course?.question_banks || []) {
    for (const question of bank.questions || []) {
      if (question.linked_entity_id === entityId) {
        usages.push({ kind: 'bank', bank_id: bank.bank_id, question_id: question.question_id, label: bank.name || bank.bank_id });
      }
    }
  }
  return usages;
}

function replaceBlock(blocks, blockId, replacement) {
  return (blocks || []).map((block) => {
    if (block.block_id === blockId) return replacement;
    let next = block;
    if (block.content?.items) {
      next = {
        ...next,
        content: {
          ...next.content,
          items: next.content.items.map((item) => item?.body_blocks
            ? { ...item, body_blocks: replaceBlock(item.body_blocks, blockId, replacement) }
            : item),
        },
      };
    }
    if (block.left) next = { ...next, left: replaceBlock([block.left], blockId, replacement)[0] };
    if (block.right) next = { ...next, right: replaceBlock([block.right], blockId, replacement)[0] };
    return next;
  });
}

function removeBlock(blocks, blockId) {
  return (blocks || []).filter((block) => block.block_id !== blockId).map((block) => {
    let next = block;
    if (block.content?.items) {
      next = {
        ...next,
        content: {
          ...next.content,
          items: next.content.items.map((item) => item?.body_blocks
            ? { ...item, body_blocks: removeBlock(item.body_blocks, blockId) }
            : item),
        },
      };
    }
    if (block.left) next = { ...next, left: removeBlock([block.left], blockId)[0] };
    if (block.right) next = { ...next, right: removeBlock([block.right], blockId)[0] };
    return next;
  });
}

function updateEntity(course, entityId, entity) {
  return {
    ...course,
    linked_entities: (course.linked_entities || []).map((candidate) => candidate.entity_id === entityId ? entity : candidate),
  };
}

export function updateLinkedEntityFromBlock(course, entityId, block) {
  const current = (course.linked_entities || []).find((entity) => entity.entity_id === entityId);
  if (!current) return course;
  const next = createLinkedEntityFromBlock(block, entityId);
  return updateEntity(course, entityId, { ...current, ...next });
}

export function linkBlockToBank(course, pageId, blockId, bankId, { entityId, questionId } = {}) {
  const page = (course.pages || []).find((candidate) => candidate.page_id === pageId);
  const block = findBlock(page?.blocks, blockId);
  const bank = (course.question_banks || []).find((candidate) => candidate.bank_id === bankId);
  if (!page || !block || !bank || block.linked_entity_id) return { course, entityId: null, questionId: null };
  const nextEntityId = entityId || generatedId('ent', new Set((course.linked_entities || []).map((entity) => entity.entity_id)));
  const nextQuestionId = questionId || generatedId('bq', new Set((bank.questions || []).map((question) => question.question_id)));
  const entity = createLinkedEntityFromBlock(block, nextEntityId);
  const linkedBlock = { block_id: block.block_id, type: block.type, linked_entity_id: nextEntityId };
  const nextPages = (course.pages || []).map((candidate) => candidate.page_id === pageId
    ? { ...candidate, blocks: replaceBlock(candidate.blocks, blockId, linkedBlock) }
    : candidate);
  const question = {
    question_id: nextQuestionId,
    linked_entity_id: nextEntityId,
    scored: entity.metadata.scored,
    objective_ids: [...entity.metadata.objective_ids],
    tags: [...entity.metadata.tags],
  };
  const nextBanks = (course.question_banks || []).map((candidate) => candidate.bank_id === bankId
    ? { ...candidate, questions: [...(candidate.questions || []), question] }
    : candidate);
  return {
    course: { ...course, pages: nextPages, question_banks: nextBanks, linked_entities: [...(course.linked_entities || []), entity] },
    entityId: nextEntityId,
    questionId: nextQuestionId,
  };
}

export function updateLinkedEntityFromBankQuestion(course, entityId, question) {
  const current = (course.linked_entities || []).find((entity) => entity.entity_id === entityId);
  if (!current) return course;
  return updateEntity(course, entityId, {
    ...current,
    content: clone(question.content || current.content),
    metadata: {
      ...current.metadata,
      scored: question.scored !== false,
      objective_ids: [...(question.objective_ids || [])],
      tags: [...(question.tags || [])],
    },
  });
}

export function unlinkUsage(course, usage) {
  const entity = (course.linked_entities || []).find((candidate) => candidate.entity_id === usage.entityId);
  if (!entity) return course;
  if (usage.kind === 'page') {
    const page = (course.pages || []).find((candidate) => candidate.page_id === usage.page_id);
    const block = findBlock(page?.blocks, usage.block_id);
    const standalone = { ...materializeBlockUsage(block, entity) };
    delete standalone.linked_entity_id;
    return cleanupEntity({ ...course, pages: (course.pages || []).map((candidate) => candidate.page_id === usage.page_id ? { ...candidate, blocks: replaceBlock(candidate.blocks, usage.block_id, standalone) } : candidate) }, usage.entityId);
  }
  const nextBanks = (course.question_banks || []).map((bank) => bank.bank_id === usage.bank_id
    ? { ...bank, questions: (bank.questions || []).map((question) => {
      if (question.question_id !== usage.question_id) return question;
      const standalone = { ...question, content: clone(entity.content) };
      delete standalone.linked_entity_id;
      return standalone;
    }) }
    : bank);
  return cleanupEntity({ ...course, question_banks: nextBanks }, usage.entityId);
}

export function detachUsageWithUpdate(course, usage, updatedUsage) {
  const entity = (course.linked_entities || []).find((candidate) => candidate.entity_id === usage.entityId);
  if (!entity) return course;
  if (usage.kind === 'page') {
    const standalone = { ...updatedUsage };
    delete standalone.linked_entity_id;
    return cleanupEntity({ ...course, pages: (course.pages || []).map((candidate) => candidate.page_id === usage.page_id ? { ...candidate, blocks: replaceBlock(candidate.blocks, usage.block_id, standalone) } : candidate) }, usage.entityId);
  }
  const nextBanks = (course.question_banks || []).map((bank) => bank.bank_id === usage.bank_id
    ? { ...bank, questions: (bank.questions || []).map((question) => question.question_id === usage.question_id ? (() => {
      const standalone = { ...updatedUsage };
      delete standalone.linked_entity_id;
      return standalone;
    })() : question) }
    : bank);
  return cleanupEntity({ ...course, question_banks: nextBanks }, usage.entityId);
}

export function mergeQuestionBanksPreservingLinked(course, nextQuestionBanks) {
  const rawQuestions = new Map();
  for (const bank of course?.question_banks || []) {
    for (const question of bank.questions || []) {
      if (question.linked_entity_id) rawQuestions.set(`${bank.bank_id}:${question.question_id}`, question);
    }
  }
  return (nextQuestionBanks || []).map((bank) => ({
    ...bank,
    questions: (bank.questions || []).map((question) => rawQuestions.get(`${bank.bank_id}:${question.question_id}`) || question),
  }));
}

function preserveBlockReferences(rawBlocks, nextBlocks) {
  const rawById = new Map((rawBlocks || []).map((block) => [block.block_id, block]));
  return (nextBlocks || []).map((nextBlock) => {
    const rawBlock = rawById.get(nextBlock.block_id);
    if (nextBlock.linked_entity_id) {
      return rawBlock?.linked_entity_id === nextBlock.linked_entity_id
        ? rawBlock
        : { block_id: nextBlock.block_id, type: nextBlock.type, linked_entity_id: nextBlock.linked_entity_id };
    }
    let next = nextBlock;
    if (next.content?.items) {
      const rawItemsById = new Map((rawBlock?.content?.items || []).filter((item) => item?.item_id).map((item) => [item.item_id, item]));
      next = {
        ...next,
        content: {
          ...next.content,
          items: next.content.items.map((item, index) => item?.body_blocks
            ? {
              ...item,
              body_blocks: preserveBlockReferences((rawItemsById.get(item.item_id) || rawBlock?.content?.items?.[index])?.body_blocks, item.body_blocks),
            }
            : item),
        },
      };
    }
    if (next.left) next = { ...next, left: preserveBlockReferences(rawBlock?.left ? [rawBlock.left] : [], [next.left])[0] };
    if (next.right) next = { ...next, right: preserveBlockReferences(rawBlock?.right ? [rawBlock.right] : [], [next.right])[0] };
    return next;
  });
}

export function mergePagesPreservingLinked(course, nextPages) {
  const rawPages = new Map((course?.pages || []).map((page) => [page.page_id, page]));
  return (nextPages || []).map((page) => ({
    ...page,
    blocks: preserveBlockReferences(rawPages.get(page.page_id)?.blocks, page.blocks),
  }));
}

export function deleteEntityEverywhere(course, entityId) {
  const pages = (course.pages || []).map((page) => ({ ...page, blocks: removeLinkedEntityBlocks(page.blocks, entityId) }));
  const question_banks = (course.question_banks || []).map((bank) => ({
    ...bank,
    questions: (bank.questions || []).filter((question) => question.linked_entity_id !== entityId),
  }));
  return {
    ...course,
    pages,
    question_banks,
    linked_entities: (course.linked_entities || []).filter((entity) => entity.entity_id !== entityId),
  };
}

function findBlock(blocks, blockId) {
  for (const block of blocks || []) {
    if (block.block_id === blockId) return block;
    const nested = findBlock(block.content?.items?.flatMap((item) => item.body_blocks || []), blockId)
      || findBlock(block.left ? [block.left] : [], blockId)
      || findBlock(block.right ? [block.right] : [], blockId);
    if (nested) return nested;
  }
  return null;
}

function removeLinkedEntityBlocks(blocks, entityId) {
  return (blocks || []).filter((block) => block.linked_entity_id !== entityId).map((block) => {
    let next = block;
    if (block.content?.items) {
      next = { ...next, content: { ...next.content, items: next.content.items.map((item) => item?.body_blocks ? { ...item, body_blocks: removeLinkedEntityBlocks(item.body_blocks, entityId) } : item) } };
    }
    if (block.left) next = { ...next, left: removeLinkedEntityBlocks([block.left], entityId)[0] };
    if (block.right) next = { ...next, right: removeLinkedEntityBlocks([block.right], entityId)[0] };
    return next;
  });
}

function cleanupEntity(course, entityId) {
  return findLinkedUsages(course, entityId).length > 0
    ? course
    : { ...course, linked_entities: (course.linked_entities || []).filter((entity) => entity.entity_id !== entityId) };
}
