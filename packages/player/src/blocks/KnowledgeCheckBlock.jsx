import { useState } from 'react';

export default function KnowledgeCheckBlock({ block, onTrigger }) {
  const [selectedId, setSelectedId] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const { question, options, correct_feedback, incorrect_feedback, show_feedback } = block.content;

  function handleSubmit() {
    setSubmitted(true);
    const selected = options.find((o) => o.id === selectedId);
    onTrigger(block, selected && selected.correct ? 'onCorrect' : 'onIncorrect');
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

  return (
    <div className="block block-knowledge-check">
      <p className="knowledge-check__question">{question}</p>
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
              <label htmlFor={`${block.block_id}-${option.id}`}>{option.text}</label>
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
          {selectedOption?.feedback?.rich_text?.length
            ? selectedOption.feedback.rich_text.map((segment, i) => <span key={i}>{segment.v}</span>)
            : selectedOption?.correct
              ? correct_feedback || 'Correct.'
              : incorrect_feedback || 'Not quite — review the case findings and try again.'}
        </div>
      )}
    </div>
  );
}
