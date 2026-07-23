import { useState } from 'react';
import RichText from './RichText.jsx';
import {
  getCorrectOptionIds,
  getKnowledgeCheckOptionFeedback,
  isKnowledgeCheckAnswerCorrect,
  normalizeSelectedOptionIds,
} from '@mnemonify/schema/knowledge-check.js';

// Click-to-zoom like a standalone image block (Modal.jsx / imageZoom.js),
// but never as part of a set -- no images/index passed, so the lightbox
// renders without carousel-style Previous/Next controls, matching each
// KC image being independent (question stem, option, feedback are never
// "the same set" the way carousel images are).
function KcImage({ assetId, assets, onOpenModal }) {
  const asset = (assets || []).find((a) => a.asset_id === assetId);
  if (!asset) return null;
  const resolvedSrc = asset.src.startsWith('/') || asset.src.startsWith('http') ? asset.src : `/${asset.src}`;
  return (
    <button
      type="button"
      className="knowledge-check__image-button"
      onClick={() => onOpenModal?.({ type: 'image', asset, ariaLabel: asset.alt || asset.caption || 'Image' })}
      aria-label={`Open ${asset.alt || 'image'} enlarged`}
    >
      <img className="knowledge-check__image" src={resolvedSrc} alt={asset.alt || ''} />
    </button>
  );
}

export default function KnowledgeCheckBlock({ block, assets, onTrigger, onOpenModal, interactionStates, variables, printMode, worksheetMode }) {
  const {
    question,
    question_image_id: questionImageId,
    options,
    correct_feedback,
    correct_feedback_image_id: correctFeedbackImageId,
    incorrect_feedback,
    incorrect_feedback_image_id: incorrectFeedbackImageId,
    show_feedback,
    multi_select: multiSelect,
    feedback_mode: feedbackMode,
  } = block.content;
  const restoredState = interactionStates?.[block.block_id];
  const [selectedOptionIds, setSelectedOptionIds] = useState(() => normalizeSelectedOptionIds(restoredState?.selectedIds ?? restoredState?.selectedId));
  const [submitted, setSubmitted] = useState(restoredState?.submitted === true);
  const selectedId = selectedOptionIds[0] || null;
  const selectedIds = multiSelect === true ? selectedOptionIds : (selectedId ? [selectedId] : []);
  const answerCorrect = isKnowledgeCheckAnswerCorrect(block.content, selectedIds);

  function handleSubmit() {
    setSubmitted(true);
    const selected = options.find((o) => o.id === selectedId);
    onTrigger(block, answerCorrect ? 'onCorrect' : 'onIncorrect');
    // onComplete (Phase 4 Part 2 Step 3): "any answer submitted," fired in
    // addition to onCorrect/onIncorrect, not instead of -- an author who
    // only cares "did they answer at all" (e.g. to reveal a Continue gate)
    // shouldn't have to attach two triggers covering both outcomes.
    const confidenceLevel = selected?.confidence_level ?? block.content.confidence_level;
    onTrigger(block, 'onComplete', {
      question_id: block.block_id,
      answer_selected: multiSelect === true ? selectedIds : selectedId,
      ...(multiSelect === true ? { answer_selected_ids: selectedIds } : {}),
      ...(confidenceLevel !== undefined && confidenceLevel !== null
        ? { confidence_level: confidenceLevel }
        : {}),
      correct: answerCorrect,
    });
  }

  const selectedOption = options.find((o) => o.id === selectedId);
  const selectedOptionIsCorrect = getCorrectOptionIds(block.content).includes(selectedId);
  const optionFeedback = getKnowledgeCheckOptionFeedback(block.content, selectedIds);
  const activeIndex = selectedId ? options.findIndex((o) => o.id === selectedId) : 0;

  function focusOption(id) {
    document.getElementById(`${block.block_id}-${id}`)?.focus();
  }

  function handleOptionKeyDown(e, index) {
    if (submitted) return;
    const lastIndex = options.length - 1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = index === lastIndex ? 0 : index + 1;
      if (multiSelect !== true) setSelectedOptionIds([options[nextIndex].id]);
      focusOption(options[nextIndex].id);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = index === 0 ? lastIndex : index - 1;
      if (multiSelect !== true) setSelectedOptionIds([options[prevIndex].id]);
      focusOption(options[prevIndex].id);
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      setSelectedOptionIds((current) => {
        if (multiSelect !== true) return [options[index].id];
        return current.includes(options[index].id)
          ? current.filter((id) => id !== options[index].id)
          : [...current, options[index].id];
      });
    }
  }

  if (printMode && worksheetMode) {
    return <div className="block block-knowledge-check block-knowledge-check--worksheet"><p className="knowledge-check__question"><RichText value={question} variables={variables} /></p><ul className="knowledge-check__options">{options.map((option) => <li key={option.id} className="knowledge-check__worksheet-option">□ <RichText value={option.text} variables={variables} /></li>)}</ul></div>;
  }
  return (
    <div className="block block-knowledge-check">
      <KcImage assetId={questionImageId} assets={assets} onOpenModal={onOpenModal} />
      <p className="knowledge-check__question">
<RichText value={question} variables={variables} />
      </p>
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
          <RichText value={question} variables={variables} />
        </legend>
        <ul className="knowledge-check__options">
          {options.map((option, index) => (
            <li
              className={
                selectedOptionIds.includes(option.id)
                  ? 'knowledge-check__option knowledge-check__option--selected'
                  : 'knowledge-check__option'
              }
              key={option.id}
            >
              <input
                type={multiSelect === true ? 'checkbox' : 'radio'}
                id={`${block.block_id}-${option.id}`}
                name={block.block_id}
                value={option.id}
                checked={selectedOptionIds.includes(option.id)}
                disabled={submitted}
                tabIndex={index === activeIndex ? 0 : -1}
                onChange={() => setSelectedOptionIds((current) => {
                  if (multiSelect !== true) return [option.id];
                  return current.includes(option.id)
                    ? current.filter((id) => id !== option.id)
                    : [...current, option.id];
                })}
                onKeyDown={(e) => handleOptionKeyDown(e, index)}
              />
              <label htmlFor={`${block.block_id}-${option.id}`}>
                <KcImage assetId={option.image_id} assets={assets} onOpenModal={onOpenModal} />
<RichText value={option.text} variables={variables} />
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <button
        type="button"
        className="knowledge-check__submit"
        tabIndex={0}
        disabled={selectedOptionIds.length === 0 || submitted}
        onClick={handleSubmit}
      >
        Submit
      </button>
      {submitted && show_feedback !== false && (
        <div className="knowledge-check__feedback" data-correct={String(answerCorrect)} role="status">
          {/* An option's own feedback (answer-level, ARCHITECTURE.md 3.8)
              takes precedence over the block-level correct_feedback /
              incorrect_feedback when present, so distractor-specific
              rationale (e.g. "why this option is wrong") can be shown
              instead of the generic message. */}
          {multiSelect === true && feedbackMode === 'per_option' ? (
            <ul className="knowledge-check__per-option-feedback">
              {optionFeedback.map((feedback) => (
                <li key={feedback.id} data-option-correct={String(feedback.correct)} data-option-selected={String(feedback.selected)}>
                  <RichText value={options.find((option) => option.id === feedback.id)?.text} variables={variables} />
                  {' — '}{feedback.correct ? 'Correct option' : 'Incorrect option'}
                  {feedback.selected ? ' (selected)' : ' (not selected)'}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <KcImage
                assetId={
                  selectedOption?.feedback?.rich_text?.length
                    ? selectedOption.feedback.image_id
                    : selectedOptionIsCorrect
                      ? correctFeedbackImageId
                      : incorrectFeedbackImageId
                }
                assets={assets}
                onOpenModal={onOpenModal}
              />
              {selectedOption?.feedback?.rich_text?.length && multiSelect !== true ? (
                <RichText value={selectedOption.feedback.rich_text} variables={variables} />
              ) : answerCorrect ? (
                correct_feedback ? <RichText value={correct_feedback} variables={variables} /> : 'Correct.'
              ) : incorrect_feedback ? (
                <RichText value={incorrect_feedback} variables={variables} />
              ) : (
                'Not quite — review the case findings and try again.'
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
