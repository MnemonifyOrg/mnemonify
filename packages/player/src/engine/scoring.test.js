import { describe, expect, it } from 'vitest';
import { createScoreState, recordInteractionScore, scoreVariables, restoreInteractionStates, recordInteractionState, prepareQuestionBankDraws } from './scoring.js';

const course = {
  meta: { publish_settings: { success_enabled: true, passing_score_pct: 70 } },
  pages: [{ blocks: [
    { block_id: 'kc-1', type: 'knowledge-check', content: { scored: true } },
    { block_id: 'kc-2', type: 'knowledge-check', content: { scored: false } },
    { block_id: 'match-1', type: 'matching', content: { scored: true } },
    { block_id: 'hot-1', type: 'hotspot', content: { mode: 'exploratory', scored: true } },
  ] }],
};

describe('system score variables', () => {
  it('counts one point per scored interaction, not per sub-item', () => {
    let state = createScoreState(course);
    expect(state.scoreMax).toBe(2);
    state = recordInteractionScore(course, state, course.pages[0].blocks[0], { correct: true });
    state = recordInteractionScore(course, state, course.pages[0].blocks[2], { score: 1 });
    expect(scoreVariables(course, state)).toEqual({ ScoreRaw: 2, ScoreMax: 2, ScorePercent: 100, ScorePassed: true });
  });

  it('counts an interaction only once even if a learner retries it', () => {
    let state = createScoreState(course);
    state = recordInteractionScore(course, state, course.pages[0].blocks[0], { correct: false });
    state = recordInteractionScore(course, state, course.pages[0].blocks[0], { correct: true });
    expect(scoreVariables(course, state).ScoreRaw).toBe(0);
  });
});

describe('knowledge-check resume state', () => {
  it('restores only valid submitted question state from suspend data', () => {
    const restored = restoreInteractionStates(course, {
      'kc-1': { submitted: true, selectedId: 'answer-a', correct: true },
      'removed-kc': { submitted: true, selectedId: 'answer-b', correct: false },
      'kc-2': { submitted: false, selectedId: 'answer-c', correct: false },
    });
    expect(restored).toEqual({
      'kc-1': { submitted: true, selectedId: 'answer-a', correct: true },
    });
  });

  it('records a submitted answer without changing the score tally', () => {
    const state = recordInteractionState({}, course.pages[0].blocks[0], {
      answer_selected: 'answer-a',
      correct: true,
    });
    expect(state).toEqual({
      'kc-1': { submitted: true, selectedId: 'answer-a', correct: true },
    });
  });
});

describe('question bank draw persistence and scoring', () => {
  const bankCourse = {
    meta: { publish_settings: { success_enabled: true, passing_score_pct: 70 } },
    question_banks: [{ bank_id: 'bank-1', questions: Array.from({ length: 8 }, (_, index) => ({
      question_id: `q-${index + 1}`,
      scored: index < 6,
      content: { scored: index < 6, question: `Question ${index + 1}`, options: [] },
    })) }],
    pages: [{ blocks: [{ block_id: 'draw-1', type: 'question_bank_draw', content: { bank_id: 'bank-1', draw_count: 5 } }] }],
  };

  it('selects once, restores the same ids, and includes drawn scored questions in ScoreMax', () => {
    const first = prepareQuestionBankDraws(bankCourse);
    expect(first.questionBankDraws['draw-1']).toHaveLength(5);
    const resumed = prepareQuestionBankDraws(bankCourse, first.questionBankDraws);
    expect(resumed.questionBankDraws).toEqual(first.questionBankDraws);
    const score = createScoreState(first.course);
    expect(score.scoreMax).toBe(first.questionBankDraws['draw-1'].filter((id) => Number(id.split('-')[1]) <= 6).length);
  });

  it('cannot count a restored drawn interaction twice', () => {
    const prepared = prepareQuestionBankDraws(bankCourse, { 'draw-1': ['q-1', 'q-2', 'q-3', 'q-4', 'q-5'] });
    let state = createScoreState(prepared.course, { completedInteractionIds: ['draw-1__q-1'], scoreRaw: 1 });
    const drawn = prepared.course.pages[0].blocks[0].content.drawn_questions[0];
    const synthetic = { block_id: 'draw-1__q-1', type: 'knowledge-check', content: drawn.content };
    state = recordInteractionScore(prepared.course, state, synthetic, { correct: true });
    expect(state.scoreRaw).toBe(1);
  });

  it('filters drawn questions by the containing module objectives', () => {
    const objectiveCourse = {
      meta: {
        page_groups: [{ group_id: 'grp-one', page_ids: ['pg-one'], objective_ids: ['obj-one'] }],
      },
      question_banks: [{
        bank_id: 'bank-objectives',
        questions: [
          { question_id: 'q-match', scored: true, objective_ids: ['obj-one'], content: { question: 'Match', options: [] } },
          { question_id: 'q-other', scored: true, objective_ids: ['obj-two'], content: { question: 'Other', options: [] } },
          { question_id: 'q-unmapped', scored: true, content: { question: 'Unmapped', options: [] } },
        ],
      }],
      pages: [{
        page_id: 'pg-one',
        blocks: [{ block_id: 'draw-objectives', type: 'question_bank_draw', content: { bank_id: 'bank-objectives', draw_count: 2, objective_fallback: 'draw_fewer' } }],
      }],
    };

    const prepared = prepareQuestionBankDraws(objectiveCourse);
    expect(prepared.course.pages[0].blocks[0].content.drawn_question_ids).toEqual(['q-match']);
  });

  it('includes only unmapped questions when the per-draw fallback requests a full draw', () => {
    const objectiveCourse = {
      meta: {
        page_groups: [{ group_id: 'grp-one', page_ids: ['pg-one'], objective_ids: ['obj-one'] }],
      },
      question_banks: [{
        bank_id: 'bank-objectives',
        questions: [
          { question_id: 'q-match', scored: true, objective_ids: ['obj-one'], content: { question: 'Match', options: [] } },
          { question_id: 'q-other', scored: true, objective_ids: ['obj-two'], content: { question: 'Other', options: [] } },
          { question_id: 'q-unmapped', scored: true, content: { question: 'Unmapped', options: [] } },
        ],
      }],
      pages: [{
        page_id: 'pg-one',
        blocks: [{ block_id: 'draw-objectives', type: 'question_bank_draw', content: { bank_id: 'bank-objectives', draw_count: 2, objective_fallback: 'include_unmapped' } }],
      }],
    };

    const prepared = prepareQuestionBankDraws(objectiveCourse);
    expect(new Set(prepared.course.pages[0].blocks[0].content.drawn_question_ids)).toEqual(new Set(['q-match', 'q-unmapped']));
  });

  it('takes all matching questions before using unmapped fill questions', () => {
    const objectiveCourse = {
      meta: {
        page_groups: [{ group_id: 'grp-one', page_ids: ['pg-one'], objective_ids: ['obj-one'] }],
      },
      question_banks: [{
        bank_id: 'bank-objectives',
        questions: [
          { question_id: 'q-match-one', scored: true, objective_ids: ['obj-one'], content: { question: 'Match one', options: [] } },
          { question_id: 'q-match-two', scored: true, objective_ids: ['obj-one'], content: { question: 'Match two', options: [] } },
          { question_id: 'q-unmapped', scored: true, content: { question: 'Unmapped', options: [] } },
        ],
      }],
      pages: [{
        page_id: 'pg-one',
        blocks: [{ block_id: 'draw-objectives', type: 'question_bank_draw', content: { bank_id: 'bank-objectives', draw_count: 2, objective_fallback: 'include_unmapped' } }],
      }],
    };

    const prepared = prepareQuestionBankDraws(objectiveCourse);
    expect(new Set(prepared.course.pages[0].blocks[0].content.drawn_question_ids)).toEqual(new Set(['q-match-one', 'q-match-two']));
  });
});
