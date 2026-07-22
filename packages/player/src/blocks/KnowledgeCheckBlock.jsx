import { useState } from 'react';
import RichText from './RichText.jsx';

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

export default function KnowledgeCheckBlock({ block, assets, onTrigger, onOpenModal, interactionStates, printMode, worksheetMode }) {
  const restoredState = interactionStates?.[block.block_id];
  const [selectedId, setSelectedId] = useState(restoredState?.selectedId || null);
  const [submitted, setSubmitted] = useState(restoredState?.submitted === true);
  const {
    question,
    question_image_id: questionImageId,
    options,
    correct_feedback,
    correct_feedback_image_id: correctFeedbackImageId,
    incorrect_feedback,
    incorrect_feedback_image_id: incorrectFeedbackImageId,
    show_feedback,
  } = block.content;

  function handleSubmit() {
    setSubmitted(true);
    const selected = options.find((o) => o.id === selectedId);
    onTrigger(block, selected && selected.correct ? 'onCorrect' : 'onIncorrect');
    // onComplete (Phase 4 Part 2 Step 3): "any answer submitted," fired in
    // addition to onCorrect/onIncorrect, not instead of -- an author who
    // only cares "did they answer at all" (e.g. to reveal a Continue gate)
    // shouldn't have to attach two triggers covering both outcomes.
    const confidenceLevel = selected?.confidence_level ?? block.content.confidence_level;
    onTrigger(block, 'onComplete', {
      question_id: block.block_id,
      answer_selected: selectedId,
      ...(confidenceLevel !== undefined && confidenceLevel !== null
        ? { confidence_level: confidenceLevel }
        : {}),
      correct: !!selected?.correct,
    });
  }

  const selectedOption = options.find((o) => o.id === selectedId);
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
      setSelectedId(options[nextIndex].id);
      focusOption(options[nextIndex].id);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = index === 0 ? lastIndex : index - 1;
      setSelectedId(options[prevIndex].id);
      focusOption(options[prevIndex].id);
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      setSelectedId(options[index].id);
    }
  }

  if (printMode && worksheetMode) {
    return <div className="block block-knowledge-check block-knowledge-check--worksheet"><p className="knowledge-check__question"><RichText value={question} /></p><ul className="knowledge-check__options">{options.map((option) => <li key={option.id} className="knowledge-check__worksheet-option">□ <RichText value={option.text} /></li>)}</ul></div>;
  }
  return (
    <div className="block block-knowledge-check">
      <KcImage assetId={questionImageId} assets={assets} onOpenModal={onOpenModal} />
      <p className="knowledge-check__question">
        <RichText value={question} />
      </p>
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
          {question}
        </legend>
        <ul className="knowledge-check__options">
          {options.map((option, index) => (
            <li
              className={
                selectedId === option.id
                  ? 'knowledge-check__option knowledge-check__option--selected'
                  : 'knowledge-check__option'
              }
              key={option.id}
            >
              <input
                type="radio"
                id={`${block.block_id}-${option.id}`}
                name={block.block_id}
                value={option.id}
                checked={selectedId === option.id}
                disabled={submitted}
                tabIndex={index === activeIndex ? 0 : -1}
                onChange={() => setSelectedId(option.id)}
                onKeyDown={(e) => handleOptionKeyDown(e, index)}
              />
              <label htmlFor={`${block.block_id}-${option.id}`}>
                <KcImage assetId={option.image_id} assets={assets} onOpenModal={onOpenModal} />
                <RichText value={option.text} />
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <button
        type="button"
        className="knowledge-check__submit"
        tabIndex={0}
        disabled={!selectedId || submitted}
        onClick={handleSubmit}
      >
        Submit
      </button>
      {submitted && show_feedback !== false && (
        <div className="knowledge-check__feedback" data-correct={String(!!selectedOption?.correct)} role="status">
          {/* An option's own feedback (answer-level, ARCHITECTURE.md 3.8)
              takes precedence over the block-level correct_feedback /
              incorrect_feedback when present, so distractor-specific
              rationale (e.g. "why this option is wrong") can be shown
              instead of the generic message. */}
          <KcImage
            assetId={
              selectedOption?.feedback?.rich_text?.length
                ? selectedOption.feedback.image_id
                : selectedOption?.correct
                  ? correctFeedbackImageId
                  : incorrectFeedbackImageId
            }
            assets={assets}
            onOpenModal={onOpenModal}
          />
          {selectedOption?.feedback?.rich_text?.length ? (
            selectedOption.feedback.rich_text.map((segment, i) =>
              segment.t === 'html' ? <RichText key={i} value={segment.v} /> : <span key={i}>{segment.v}</span>
            )
          ) : selectedOption?.correct ? (
            correct_feedback ? <RichText value={correct_feedback} /> : 'Correct.'
          ) : incorrect_feedback ? (
            <RichText value={incorrect_feedback} />
          ) : (
            'Not quite — review the case findings and try again.'
          )}
        </div>
      )}
    </div>
  );
}
