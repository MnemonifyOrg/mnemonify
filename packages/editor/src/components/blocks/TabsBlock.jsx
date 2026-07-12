import { useState } from 'react';

const MAX_TABS = 6;

function bodyText(item) {
  const textBlock = item.body_blocks?.find((b) => b.type === 'text');
  return textBlock?.content.rich_text?.[0]?.v || '';
}

function withBodyText(item, text) {
  const existing = item.body_blocks?.find((b) => b.type === 'text');
  const textBlock = existing || { block_id: `blk_${Math.random().toString(36).slice(2, 8)}`, type: 'text', content: {}, triggers: [] };
  return {
    ...item,
    body_blocks: [{ ...textBlock, content: { rich_text: [{ t: 'text', v: text }] } }],
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
            <div
              className="editable-field"
              contentEditable
              suppressContentEditableWarning
              onClick={() => setActiveIndex(index)}
              onBlur={(e) => updateItem(index, { label: e.currentTarget.textContent })}
            >
              {item.label}
            </div>
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
        <div
          className="editable-field tabs-block-editor__body"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => updateItem(safeActive, withBodyText(items[safeActive], e.currentTarget.textContent))}
        >
          {bodyText(items[safeActive])}
        </div>
      )}
    </div>
  );
}
