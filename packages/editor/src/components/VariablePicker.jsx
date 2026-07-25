import { useEffect, useId, useRef, useState } from 'react';
import { captureRichTextSelection } from '../lib/richText.js';
import { SYSTEM_VARIABLE_DEFINITIONS } from '@mnemonify/schema/system-variables.js';

const SCORE_LABELS = { ScoreRaw: 'ScoreRaw (points earned)', ScoreMax: 'ScoreMax (possible points)', ScorePercent: 'ScorePercent (%)', ScorePassed: 'ScorePassed (pass/fail)' };

export default function VariablePicker({ variables = [], fieldRef, selectionRef, onInsert }) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function preserveEditorSelection(event) {
    // Keep the contentEditable focused while the picker opens. A native
    // select blurs the field before its change event runs, which causes the
    // blur commit/resync to replace the DOM nodes that the saved Range points
    // at. The picker options use the same prevention, so insertion happens
    // against the original selection and preserves all inline markup.
    event.preventDefault();
    captureRichTextSelection(fieldRef?.current, selectionRef);
  }

  function toggleOpen() {
    setOpen((current) => !current);
  }

  function handleTriggerKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      captureRichTextSelection(fieldRef?.current, selectionRef);
      setOpen(true);
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  function choose(name) {
    onInsert(name);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="rich-text-variable-picker">
      <button
        ref={triggerRef}
        type="button"
        className="rich-text-variable-picker__trigger"
        aria-label="Insert variable"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        title="Insert Variable"
        onMouseDown={preserveEditorSelection}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
      >
        Insert Variable…
      </button>
      {open && (
        <div id={listboxId} className="rich-text-variable-picker__popover" role="listbox" aria-label="Insert variable">
          <div className="rich-text-variable-picker__group-label">Course Score</div>
          {SYSTEM_VARIABLE_DEFINITIONS.map((variable) => (
            <button
              key={variable.name}
              type="button"
              role="option"
              className="rich-text-variable-picker__option"
              onMouseDown={preserveEditorSelection}
              onClick={() => choose(variable.name)}
            >
              {SCORE_LABELS[variable.name] || variable.name}
            </button>
          ))}
          <div className="rich-text-variable-picker__group-label">My Variables</div>
          {variables.map((variable) => (
            <button
              key={variable.name}
              type="button"
              role="option"
              className="rich-text-variable-picker__option"
              onMouseDown={preserveEditorSelection}
              onClick={() => choose(variable.name)}
            >
              {variable.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
