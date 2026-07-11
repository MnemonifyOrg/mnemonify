import { useState } from 'react';

export default function KnowledgeCheckBlock({ block, onTrigger }) {
  const [selectedId, setSelectedId] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const { question, options } = block.content;

  function handleSubmit() {
    setSubmitted(true);
    const selected = options.find((o) => o.id === selectedId);
    onTrigger(block, selected && selected.correct ? 'onCorrect' : 'onIncorrect');
  }

  const selectedOption = options.find((o) => o.id === selectedId);

  return (
    <div className="block block-knowledge-check">
      <p className="knowledge-check__question">{question}</p>
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
          {question}
        </legend>
        <ul className="knowledge-check__options">
          {options.map((option) => (
            <li className="knowledge-check__option" key={option.id}>
              <input
                type="radio"
                id={`${block.block_id}-${option.id}`}
                name={block.block_id}
                value={option.id}
                checked={selectedId === option.id}
                disabled={submitted}
                onChange={() => setSelectedId(option.id)}
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
      {submitted && (
        <div className="knowledge-check__feedback" data-correct={String(!!selectedOption?.correct)} role="status">
          {selectedOption?.correct ? 'Correct.' : 'Not quite — review the case findings and try again.'}
        </div>
      )}
    </div>
  );
}
