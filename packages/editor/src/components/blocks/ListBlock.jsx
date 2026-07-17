import { useRef } from 'react';
import EditableRichField from './EditableRichField.jsx';

export default function ListBlockEditor({ block, onChange }) {
  const items = block.content.items || [''];
  const rowRefs = useRef([]);

  function setItems(newItems) {
    onChange({ ...block, content: { ...block.content, items: newItems } });
  }

  function handleCommitRow(index, html) {
    if (items[index] !== html) {
      const next = [...items];
      next[index] = html;
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
          <EditableRichField
            fieldRef={(el) => (rowRefs.current[index] = el)}
            className="editable-field"
            placeholder="Click to add list item..."
            value={item}
            onCommit={(html) => handleCommitRow(index, html)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          />
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
