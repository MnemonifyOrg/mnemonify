import { useRef } from 'react';

export default function ListBlockEditor({ block, onChange }) {
  const items = block.content.items || [''];
  const rowRefs = useRef([]);

  function setItems(newItems) {
    onChange({ ...block, content: { ...block.content, items: newItems } });
  }

  function handleBlurRow(index, text) {
    if (items[index] !== text) {
      const next = [...items];
      next[index] = text;
      setItems(next);
    }
  }

  function handleKeyDown(e, index) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = [...items];
      next.splice(index + 1, 0, '');
      setItems(next);
      requestAnimationFrame(() => rowRefs.current[index + 1]?.focus());
    } else if (e.key === 'Backspace' && e.currentTarget.textContent === '' && items.length > 1) {
      e.preventDefault();
      const next = items.filter((_, i) => i !== index);
      setItems(next);
      requestAnimationFrame(() => rowRefs.current[Math.max(0, index - 1)]?.focus());
    }
  }

  return (
    <ul className="list-block-editor">
      {items.map((item, index) => (
        <li key={index}>
          <div
            ref={(el) => (rowRefs.current[index] = el)}
            className="editable-field"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Click to add list item..."
            onBlur={(e) => handleBlurRow(index, e.currentTarget.textContent)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {item}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ListBlockSettings({ block, onChange }) {
  return (
    <>
      <label>List style</label>
      <select
        className="input"
        value={block.content.style || 'bulleted'}
        onChange={(e) => onChange({ ...block, content: { ...block.content, style: e.target.value } })}
      >
        <option value="bulleted">Bulleted</option>
        <option value="numbered">Numbered</option>
      </select>
    </>
  );
}
