// Overlay knowledge checks are optional pause-point gates. The property is
// deliberately opt-in so existing interactive-video overlays retain their
// current dismiss-and-resume behavior when it is absent.
export function requiresAnswerBeforeContinuing(block) {
  return block?.type === 'knowledge-check' && block.require_answer === true;
}

export function canContinueFromOverlay(context) {
  return !context?.requiresAnswer || context.answered === true;
}
