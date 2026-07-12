import { useEffect, useRef } from 'react';

// Phase 3 limitation: the rich_text content model (DECISIONS.md 2026-07-11)
// stores each segment as plain { t, v } text -- there is no field to persist
// bold/italic/underline. The toolbar below still uses execCommand for an
// in-the-moment WYSIWYG feel, but only plain text (textContent) is saved on
// blur, so formatting does not survive a reload. See DECISIONS.md 2026-07-12.
export default function TextBlockEditor({ block, onChange }) {
  const ref = useRef(null);
  const initialText = block.content.rich_text?.[0]?.v || '';

  useEffect(() => {
    if (ref.current) ref.current.textContent = initialText;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.block_id]);

  function handleBlur() {
    const newText = ref.current.textContent;
    if (newText !== initialText) {
      onChange({ ...block, content: { ...block.content, rich_text: [{ t: 'text', v: newText }] } });
    }
  }

  function format(command) {
    document.execCommand(command);
    ref.current.focus();
  }

  return (
    <div className="text-block-editor">
      <div className="rich-text-toolbar">
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
      <div
        ref={ref}
        className="editable-field text-block-editor__body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Click to add text..."
        onBlur={handleBlur}
      />
    </div>
  );
}
