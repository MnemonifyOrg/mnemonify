const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

export default function KnowledgeCheckBlockEditor({ block, onChange }) {
  const { question = '', options = [] } = block.content;

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

  return (
    <div className="knowledge-check-block-editor">
      <div
        className="editable-field knowledge-check-block-editor__question"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const text = e.currentTarget.textContent;
          if (text !== question) setContent({ question: text });
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
              onBlur={(e) => {
                const text = e.currentTarget.textContent;
                if (text !== option.text) updateOption(option.id, { text });
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
        onBlur={(e) => {
          const text = e.currentTarget.textContent;
          if (text !== (block.content.correct_feedback || '')) setContent({ correct_feedback: text });
        }}
      >
        {block.content.correct_feedback || ''}
      </div>

      <label className="kc-feedback-label">Incorrect feedback</label>
      <div
        className="editable-field"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const text = e.currentTarget.textContent;
          if (text !== (block.content.incorrect_feedback || '')) setContent({ incorrect_feedback: text });
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
