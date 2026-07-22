import { isReservedSystemVariableName } from '@mnemonify/schema/system-variables.js';
import { resolveQuestionBankDrawPool } from '@mnemonify/schema/objectives.js';

export const SCOREABLE_BLOCK_TYPES = new Set(['knowledge-check', 'matching', 'ordering', 'hotspot']);

function walkBlocks(blocks, visit) {
  for (const block of blocks || []) {
    visit(block);
    if (block.content?.items) {
      for (const item of block.content.items) walkBlocks(item.body_blocks, visit);
    }
    if (block.left) walkBlocks([block.left], visit);
    if (block.right) walkBlocks([block.right], visit);
  }
}

export function collectKnowledgeChecks(course) {
  const result = [];
  for (const page of course?.pages || []) {
    walkBlocks(page.blocks, (block) => {
      result.push(...drawnQuestionBlocks(block));
      if (block.type === 'knowledge-check' && block.block_id) result.push(block);
    });
  }
  return result;
}

export function restoreInteractionStates(course, restored = {}) {
  const validIds = new Set(collectKnowledgeChecks(course).map((block) => block.block_id));
  return Object.fromEntries(
    Object.entries(restored || {}).filter(([blockId, state]) => (
      validIds.has(blockId) && state?.submitted === true && typeof state.selectedId === 'string'
    ))
  );
}

export function recordInteractionState(state, block, payload = {}) {
  if (block?.type !== 'knowledge-check' || !block.block_id || typeof payload.answer_selected !== 'string') return state;
  return {
    ...state,
    [block.block_id]: {
      submitted: true,
      selectedId: payload.answer_selected,
      correct: payload.correct === true,
    },
  };
}

export function questionBlockId(drawBlockId, questionId) {
  return `${drawBlockId}__${questionId}`;
}

function drawnQuestionBlocks(block) {
  return (block.content?.drawn_questions || []).map((question) => ({
    block_id: questionBlockId(block.block_id, question.question_id),
    type: 'knowledge-check',
    content: { ...(question.content || {}), scored: question.scored !== false },
    triggers: [],
  }));
}

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function mapBlocks(blocks, transform) {
  return (blocks || []).map((block) => {
    let next = transform(block);
    if (next.content?.items) {
      next = { ...next, content: { ...next.content, items: next.content.items.map((item) => ({ ...item, body_blocks: mapBlocks(item.body_blocks, transform) })) } };
    }
    if (next.left) next = { ...next, left: mapBlocks([next.left], transform)[0] };
    if (next.right) next = { ...next, right: mapBlocks([next.right], transform)[0] };
    return next;
  });
}

export function prepareQuestionBankDraws(course, restoredDraws = {}) {
  const banks = new Map((course?.question_banks || []).map((bank) => [bank.bank_id, bank]));
  const questionBankDraws = {};
  const pages = (course?.pages || []).map((page) => ({
    ...page,
    blocks: mapBlocks(page.blocks, (block) => {
      if (block.type !== 'question_bank_draw') return block;
      const bank = banks.get(block.content?.bank_id);
      const group = (course?.meta?.page_groups || []).find((candidate) => candidate.page_ids?.includes(page.page_id));
      const requested = Number(block.content?.draw_count) || 0;
      const pool = resolveQuestionBankDrawPool(bank, group, requested, block.content?.objective_fallback || 'draw_fewer');
      const questions = pool.eligibleQuestions;
      const validIds = new Set(questions.map((question) => question.question_id));
      const drawCandidates = pool.filtered && pool.fallback === 'include_unmapped'
        ? [...shuffled(pool.matchingQuestions), ...shuffled(pool.unmappedQuestions)]
        : shuffled(questions);
      const restored = Array.isArray(restoredDraws[block.block_id])
        ? restoredDraws[block.block_id].filter((id) => validIds.has(id))
        : [];
      const selected = [...new Set(restored)].slice(0, requested);
      if (selected.length < Math.min(requested, questions.length)) {
        const remaining = drawCandidates.filter((question) => !selected.includes(question.question_id));
        selected.push(...remaining.slice(0, Math.min(requested, questions.length) - selected.length).map((question) => question.question_id));
      }
      questionBankDraws[block.block_id] = selected;
      return {
        ...block,
        content: {
          ...block.content,
          drawn_question_ids: selected,
          drawn_questions: selected.map((id) => questions.find((question) => question.question_id === id)).filter(Boolean),
        },
      };
    }),
  }));
  return { course: { ...course, pages }, questionBankDraws };
}

export function isScoredInteraction(block) {
  return Boolean(
    block &&
      SCOREABLE_BLOCK_TYPES.has(block.type) &&
      (block.type !== 'hotspot' || block.content?.mode === 'quiz') &&
      block.content?.scored !== false
  );
}

export function collectScoredInteractions(course) {
  const result = [];
  const seen = new Set();
  function walk(blocks) {
    for (const block of blocks || []) {
      for (const drawn of drawnQuestionBlocks(block)) {
        if (isScoredInteraction(drawn) && !seen.has(drawn.block_id)) {
          seen.add(drawn.block_id);
          result.push(drawn);
        }
      }
      if (isScoredInteraction(block) && !seen.has(block.block_id)) {
        seen.add(block.block_id);
        result.push(block);
      }
      if (block.content?.items) {
        for (const item of block.content.items) walk(item.body_blocks);
      }
      if (block.left) walk([block.left]);
      if (block.right) walk([block.right]);
    }
  }
  for (const page of course?.pages || []) walk(page.blocks);
  return result;
}

export function createScoreState(course, restored = {}) {
  const scored = collectScoredInteractions(course);
  const validIds = new Set(scored.map((block) => block.block_id));
  const completedInteractionIds = (restored.completedInteractionIds || []).filter((id) => validIds.has(id));
  return {
    scoreMax: scored.length,
    scoreRaw: Math.min(Number(restored.scoreRaw) || 0, completedInteractionIds.length),
    completedInteractionIds,
  };
}

export function scoreVariables(course, scoreState) {
  const scoreMax = Number.isFinite(scoreState?.scoreMax) ? scoreState.scoreMax : collectScoredInteractions(course).length;
  const scoreRaw = Math.max(0, Math.min(Number(scoreState?.scoreRaw) || 0, scoreMax));
  const scorePercent = scoreMax > 0 ? Math.round((scoreRaw / scoreMax) * 100) : 0;
  const settings = course?.meta?.publish_settings || {};
  const passing = Number(settings.passing_score_pct);
  return {
    ScoreRaw: scoreRaw,
    ScoreMax: scoreMax,
    ScorePercent: scorePercent,
    ScorePassed: settings.success_enabled !== false && Number.isFinite(passing) && scoreMax > 0 && scorePercent >= passing,
  };
}

export function recordInteractionScore(course, state, block, payload = {}) {
  if (!isScoredInteraction(block) || !block.block_id || state.completedInteractionIds.includes(block.block_id)) return state;
  const correct = block.type === 'hotspot' ? true : block.type === 'knowledge-check' ? payload.correct === true : Number(payload.score) >= 1;
  return {
    ...state,
    scoreRaw: state.scoreRaw + (correct ? 1 : 0),
    completedInteractionIds: [...state.completedInteractionIds, block.block_id],
  };
}

export function stripSystemVariables(variables) {
  return Object.fromEntries(Object.entries(variables || {}).filter(([name]) => !isReservedSystemVariableName(name)));
}
