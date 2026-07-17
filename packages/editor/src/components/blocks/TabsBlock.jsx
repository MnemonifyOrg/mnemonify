import { useState } from 'react';
import EditableRichField from './EditableRichField.jsx';

const MAX_TABS = 6;

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

export default function TabsBlockEditor({ block, onChange }) {
  const items = block.content.items || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const safeActive = Math.min(activeIndex, items.length - 1);

  function setItems(newItems) {
    onChange({ ...block, content: { ...block.content, items: newItems } });
  }

  function updateItem(index, patch) {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addTab() {
    if (items.length >= MAX_TABS) return;
    setItems([...items, { label: `Tab ${items.length + 1}`, body_blocks: [] }]);
    setActiveIndex(items.length);
  }

  function deleteTab(index) {
    setItems(items.filter((_, i) => i !== index));
    setActiveIndex(0);
  }

  return (
    <div className="tabs-block-editor">
      <div className="tabs-block-editor__bar">
        {items.map((item, index) => (
          <div key={index} className={index === safeActive ? 'tabs-block-editor__tab tabs-block-editor__tab--active' : 'tabs-block-editor__tab'}>
            <EditableRichField
              className="editable-field"
              placeholder="Tab title..."
              value={item.label}
              onClick={() => setActiveIndex(index)}
              onCommit={(html) => updateItem(index, { label: html })}
            />
            {items.length > 1 && (
              <button className="btn-text" onClick={() => deleteTab(index)}>
                ✕
              </button>
            )}
          </div>
        ))}
        {items.length < MAX_TABS && (
          <button className="btn-text" onClick={addTab}>
            + Add tab
          </button>
        )}
      </div>
      {items[safeActive] && (
        <EditableRichField
          className="editable-field tabs-block-editor__body"
          placeholder="Click to add tab content..."
          value={bodyHtml(items[safeActive])}
          onCommit={(html) => updateItem(safeActive, withBodyHtml(items[safeActive], html))}
        />
      )}
    </div>
  );
}
