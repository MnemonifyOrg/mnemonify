import EditableRichField from './EditableRichField.jsx';

export default function HeadingBlockEditor({ block, onChange }) {
  return (
    <EditableRichField
      className="editable-field heading-block-editor"
      data-level={block.content.level || 2}
      placeholder="Click to add heading..."
      value={block.content.text || ''}
      onCommit={(html) => onChange({ ...block, content: { ...block.content, text: html } })}
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
