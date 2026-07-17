import EditableRichField from './EditableRichField.jsx';

function bodyHtml(item) {
  const textBlock = item.body_blocks?.find((b) => b.type === 'text');
  return textBlock?.content.rich_text?.[0]?.v || '';
}

function withBodyHtml(item, html) {
  const existing = item.body_blocks?.find((b) => b.type === 'text');
  const textBlock = existing || { block_id: `blk_${Math.random().toString(36).slice(2, 8)}`, type: 'text', content: {}, triggers: [] };
  return {
    ...item,
    body_blocks: [{ ...textBlock, content: { rich_text: [{ t: 'html', v: html }] } }],
  };
}

export default function AccordionBlockEditor({ block, onChange }) {
  const items = block.content.items || [];

  function setItems(newItems) {
    onChange({ ...block, content: { ...block.content, items: newItems } });
  }

  function updateItem(index, patch) {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems([...items, { title: '', body_blocks: [] }]);
  }

  function deleteItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  return (
    <div className="accordion-block-editor">
      {items.map((item, index) => (
        <div className="accordion-block-editor__item card" key={index}>
          <div className="accordion-block-editor__item-header">
            <EditableRichField
              className="editable-field"
              placeholder="Click to add accordion title..."
              value={item.title}
              onCommit={(html) => updateItem(index, { title: html })}
            />
            <button className="btn-text" onClick={() => deleteItem(index)}>
              ✕
            </button>
          </div>
          <EditableRichField
            className="editable-field accordion-block-editor__body"
            placeholder="Click to add content..."
            value={bodyHtml(item)}
            onCommit={(html) => updateItem(index, withBodyHtml(item, html))}
          />
        </div>
      ))}
      <button className="btn" onClick={addItem}>
        + Add item
      </button>
    </div>
  );
}
