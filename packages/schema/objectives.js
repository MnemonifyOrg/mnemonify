export function objectiveLabel(objective) {
  return objective?.label || objective?.text || '';
}

export function questionObjectiveIds(question) {
  return Array.isArray(question?.objective_ids)
    ? question.objective_ids
    : Array.isArray(question?.content?.objective_ids)
      ? question.content.objective_ids
      : [];
}

export function hasObjectiveIntersection(ids, assignedIds) {
  const assigned = new Set(assignedIds || []);
  return (ids || []).some((id) => assigned.has(id));
}

export function resolveQuestionBankPool(bank, group) {
  const questions = Array.isArray(bank?.questions) ? bank.questions : [];
  const assignedIds = Array.isArray(group?.objective_ids) ? group.objective_ids : [];

  if (assignedIds.length === 0) {
    return {
      filtered: false,
      assignedIds,
      matchingQuestions: questions,
      unmappedQuestions: [],
      eligibleQuestions: questions,
    };
  }

  const matchingQuestions = questions.filter((question) => (
    hasObjectiveIntersection(questionObjectiveIds(question), assignedIds)
  ));
  const unmappedQuestions = questions.filter((question) => questionObjectiveIds(question).length === 0);

  return {
    filtered: true,
    assignedIds,
    matchingQuestions,
    unmappedQuestions,
    eligibleQuestions: matchingQuestions,
  };
}

export function resolveQuestionBankDrawPool(bank, group, drawCount, fallback = 'draw_fewer') {
  const pool = resolveQuestionBankPool(bank, group);
  const requested = Math.max(0, Number(drawCount) || 0);
  const underPool = pool.filtered && pool.matchingQuestions.length < requested;
  const eligibleQuestions = underPool && fallback === 'include_unmapped'
    ? [...pool.matchingQuestions, ...pool.unmappedQuestions]
    : pool.eligibleQuestions;

  return {
    ...pool,
    requested,
    fallback,
    underPool,
    needsFallbackChoice: underPool,
    eligibleQuestions: eligibleQuestions.slice(0, requested),
  };
}
