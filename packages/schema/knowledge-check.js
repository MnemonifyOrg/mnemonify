function uniqueIds(ids) {
  return [...new Set((ids || []).filter((id) => typeof id === 'string' && id.length > 0))];
}

/**
 * Returns the explicit answer key when present, while retaining support for
 * the original option.correct representation used by existing courses.
 */
export function getCorrectOptionIds(content = {}) {
  if (content.multi_select === true) {
    if (Array.isArray(content.correct_option_ids)) return uniqueIds(content.correct_option_ids);
    return uniqueIds((content.options || []).filter((option) => option.correct).map((option) => option.id));
  }
  if (typeof content.correct_option_id === 'string' && content.correct_option_id) return [content.correct_option_id];
  const correct = (content.options || []).find((option) => option.correct);
  return correct?.id ? [correct.id] : [];
}

export function normalizeSelectedOptionIds(selected) {
  if (Array.isArray(selected)) return uniqueIds(selected);
  return typeof selected === 'string' && selected ? [selected] : [];
}

/**
 * Multi-select questions are deliberately all-or-nothing: set equality is
 * used rather than an overlap/partial-credit calculation.
 */
export function isKnowledgeCheckAnswerCorrect(content = {}, selected) {
  const selectedIds = normalizeSelectedOptionIds(selected);
  const correctIds = getCorrectOptionIds(content);
  return selectedIds.length === correctIds.length && selectedIds.every((id) => correctIds.includes(id));
}

export function getKnowledgeCheckOptionFeedback(content = {}, selected) {
  const selectedIds = new Set(normalizeSelectedOptionIds(selected));
  const correctIds = new Set(getCorrectOptionIds(content));
  return (content.options || []).map((option) => ({
    id: option.id,
    selected: selectedIds.has(option.id),
    correct: correctIds.has(option.id),
  }));
}
