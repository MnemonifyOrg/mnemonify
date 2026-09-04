import { describe, expect, it } from 'vitest';
import { canContinueFromOverlay, requiresAnswerBeforeContinuing } from './overlayQuestion.js';

describe('interactive video overlay answer gates', () => {
  it('keeps the existing non-blocking behavior when the setting is absent or false', () => {
    expect(requiresAnswerBeforeContinuing({ type: 'knowledge-check' })).toBe(false);
    expect(requiresAnswerBeforeContinuing({ type: 'knowledge-check', require_answer: false })).toBe(false);
    expect(canContinueFromOverlay({ requiresAnswer: false, answered: false })).toBe(true);
  });

  it('keeps a required-answer overlay paused until the question is answered', () => {
    expect(requiresAnswerBeforeContinuing({ type: 'knowledge-check', require_answer: true })).toBe(true);
    expect(canContinueFromOverlay({ requiresAnswer: true, answered: false })).toBe(false);
    expect(canContinueFromOverlay({ requiresAnswer: true, answered: true })).toBe(true);
  });

  it('only enables the setting for knowledge-check overlays', () => {
    expect(requiresAnswerBeforeContinuing({ type: 'text', require_answer: true })).toBe(false);
  });
});
