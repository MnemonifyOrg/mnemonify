import { useEffect, useRef } from 'react';

export default function HeadingBlockEditor({ block, onChange }) {
  const ref = useRef(null);
  const initialText = block.content.text || '';

  useEffect(() => {
    if (ref.current) ref.current.textContent = initialText;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.block_id]);

  function handleBlur() {
    const newText = ref.current.textContent;
    if (newText !== initialText) {
      onChange({ ...block, content: { ...block.content, text: newText } });
    }
  }

  return (
    <div
      ref={ref}
      className="editable-field heading-block-editor"
      data-level={block.content.level || 2}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
    />
  );
}

export function HeadingBlockSettings({ block, onChange }) {
  return (
    <>
      <label>Heading level</label>
      <select
        className="input"
        value={block.content.level || 2}
        onChange={(e) => onChange({ ...block, content: { ...block.content, level: Number(e.target.value) } })}
      >
        <option value={1}>Heading 1</option>
        <option value={2}>Heading 2</option>
        <option value={3}>Heading 3</option>
      </select>
    </>
  );
}
