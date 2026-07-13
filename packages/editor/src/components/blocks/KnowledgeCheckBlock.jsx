import { useRef, useState } from 'react';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const BLUR_HIDE_DELAY_MS = 150;

export default function KnowledgeCheckBlockEditor({ block, onChange }) {
  const { question = '', options = [] } = block.content;
  const containerRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const [toolbarPos, setToolbarPos] = useState(null);

  function setContent(patch) {
    onChange({ ...block, content: { ...block.content, ...patch } });
  }

  function updateOption(id, patch) {
    setContent({ options: options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  }

  function markCorrect(id) {
    setContent({ options: options.map((o) => ({ ...o, correct: o.id === id })) });
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    const id = `opt_${Math.random().toString(36).slice(2, 6)}`;
    setContent({ options: [...options, { id, text: '', correct: false }] });
  }

  function deleteOption(id) {
    if (options.length <= MIN_OPTIONS) return;
    setContent({ options: options.filter((o) => o.id !== id) });
  }

  // The toolbar tracks whichever field is currently focused, rather than
  // sitting permanently above one fixed field (unlike TextBlock.jsx, which
  // only ever has one field). Blur hides it after a short delay so a click
  // on a toolbar button -- which itself steals focus -- doesn't hide the
  // toolbar before the click is registered; the delay is cancelled if
  // another field in this same block picks up focus in the meantime.
  function handleFieldFocus(e) {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    const fieldRect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setToolbarPos({ top: fieldRect.top - containerRect.top, left: fieldRect.left - containerRect.left });
  }

  function handleFieldBlur() {
    blurTimeoutRef.current = setTimeout(() => setToolbarPos(null), BLUR_HIDE_DELAY_MS);
  }

  function format(command) {
    document.execCommand(command);
  }

  return (
    <div className="knowledge-check-block-editor" ref={containerRef} style={{ position: 'relative' }}>
      {toolbarPos && (
        <div
          className="rich-text-toolbar knowledge-check-block-editor__toolbar"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
        >
          <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('bold')}>
            <strong>B</strong>
          </button>
          <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('italic')}>
            <em>I</em>
          </button>
          <button type="button" className="btn-text" onMouseDown={(e) => e.preventDefault()} onClick={() => format('underline')}>
            <u>U</u>
          </button>
        </div>
      )}

      <div
        className="editable-field knowledge-check-block-editor__question"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Click to add your question..."
        onFocus={handleFieldFocus}
        onBlur={(e) => {
          const text = e.currentTarget.textContent;
          if (text !== question) setContent({ question: text });
          handleFieldBlur();
        }}
      >
        {question}
      </div>

      <ul className="knowledge-check-block-editor__options">
        {options.map((option) => (
          <li key={option.id}>
            <input type="radio" checked={!!option.correct} onChange={() => markCorrect(option.id)} title="Mark as correct answer" />
            <div
              className="editable-field"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Click to add answer option..."
              onFocus={handleFieldFocus}
              onBlur={(e) => {
                const text = e.currentTarget.textContent;
                if (text !== option.text) updateOption(option.id, { text });
                handleFieldBlur();
              }}
            >
              {option.text}
            </div>
            {options.length > MIN_OPTIONS && (
              <button className="btn-text" onClick={() => deleteOption(option.id)}>
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      {options.length < MAX_OPTIONS && (
        <button className="btn" onClick={addOption}>
          + Add option
        </button>
      )}

      <label className="kc-feedback-label">Correct feedback</label>
      <div
        className="editable-field"
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFieldFocus}
        onBlur={(e) => {
          const text = e.currentTarget.textContent;
          if (text !== (block.content.correct_feedback || '')) setContent({ correct_feedback: text });
          handleFieldBlur();
        }}
      >
        {block.content.correct_feedback || ''}
      </div>

      <label className="kc-feedback-label">Incorrect feedback</label>
      <div
        className="editable-field"
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFieldFocus}
        onBlur={(e) => {
          const text = e.currentTarget.textContent;
          if (text !== (block.content.incorrect_feedback || '')) setContent({ incorrect_feedback: text });
          handleFieldBlur();
        }}
      >
        {block.content.incorrect_feedback || ''}
      </div>
    </div>
  );
}

export function KnowledgeCheckBlockSettings({ block, onChange }) {
  const showFeedback = block.content.show_feedback !== false;
  return (
    <label className="settings-panel__checkbox-row">
      <input
        type="checkbox"
        checked={showFeedback}
        onChange={(e) => onChange({ ...block, content: { ...block.content, show_feedback: e.target.checked } })}
      />
      Show feedback after answering
    </label>
  );
}
