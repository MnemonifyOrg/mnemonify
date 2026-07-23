function richTextToPlain(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.replace(/<[^>]*>/g, ' ');
  if (Array.isArray(value)) return value.map((segment) => segment?.v || '').join(' ');
  if (value.rich_text) return richTextToPlain(value.rich_text);
  return '';
}

export function questionType(question) {
  return question?.content?.question_type || question?.content?.block_type || question?.content?.type || 'knowledge-check';
}

export function questionSearchText(question) {
  const content = question?.content || {};
  return [
    richTextToPlain(content.question),
    ...(content.options || []).map((option) => richTextToPlain(option.text)),
    richTextToPlain(content.correct_feedback),
    richTextToPlain(content.incorrect_feedback),
    ...(question?.tags || []),
  ].join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function questionDisplayText(question) {
  const text = richTextToPlain(question?.content?.question).replace(/\s+/g, ' ').trim();
  return text || 'Untitled question';
}

export function filterBankQuestions(questions, { query = '', type = 'all', objectiveId = 'all' } = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  return (questions || []).filter((question) => {
    if (normalizedQuery && !questionSearchText(question).includes(normalizedQuery)) return false;
    if (type !== 'all' && questionType(question) !== type) return false;
    if (objectiveId !== 'all' && !(question.objective_ids || []).includes(objectiveId)) return false;
    return true;
  });
}

function selected(question, ids) {
  return ids.includes(question.question_id);
}

export function bulkDeleteQuestions(questions, questionIds) {
  const ids = new Set(questionIds || []);
  return (questions || []).filter((question) => !ids.has(question.question_id));
}

export function bulkAssignObjective(questions, questionIds, objectiveId) {
  if (!objectiveId) return [...(questions || [])];
  return (questions || []).map((question) => selected(question, questionIds || [])
    ? { ...question, objective_ids: [...new Set([...(question.objective_ids || []), objectiveId])] }
    : question);
}

export function bulkRemoveObjective(questions, questionIds, objectiveId) {
  if (!objectiveId) return [...(questions || [])];
  return (questions || []).map((question) => selected(question, questionIds || [])
    ? { ...question, objective_ids: (question.objective_ids || []).filter((id) => id !== objectiveId) }
    : question);
}

export function bulkAssignTag(questions, questionIds, tag) {
  const normalizedTag = String(tag || '').trim();
  if (!normalizedTag) return [...(questions || [])];
  return (questions || []).map((question) => selected(question, questionIds || [])
    ? { ...question, tags: [...new Set([...(question.tags || []), normalizedTag])] }
    : question);
}

export function bulkRemoveTag(questions, questionIds, tag) {
  const normalizedTag = String(tag || '').trim();
  if (!normalizedTag) return [...(questions || [])];
  return (questions || []).map((question) => selected(question, questionIds || [])
    ? { ...question, tags: (question.tags || []).filter((candidate) => candidate !== normalizedTag) }
    : question);
}
