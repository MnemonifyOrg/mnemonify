import { describe, expect, it } from 'vitest';
import { createScoreState, recordInteractionScore, scoreVariables } from './scoring.js';

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
