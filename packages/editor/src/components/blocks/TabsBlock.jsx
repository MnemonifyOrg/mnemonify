import { useState } from 'react';
import EditableRichField from './EditableRichField.jsx';
import ItemBlockStack from './ItemBlockStack.jsx';

const MAX_TABS = 6;

export default function TabsBlockEditor({
  block,
  onChange,
  assets,
  courseId,
  onAddCourseAsset,
  onAddCourseAssets,
  onUpdateCourseAsset,
}) {
  const items = block.content.items || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const safeActive = Math.min(activeIndex, items.length - 1);

  function setItems(newItems, options) {
    onChange({ ...block, content: { ...block.content, items: newItems } }, options);
  }

  function updateItem(index, patch, options) {
    setItems(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
      options
    );
  }

  function addTab() {
    if (items.length >= MAX_TABS) return;
    setItems([...items, { label: `Tab ${items.length + 1}`, body_blocks: [] }], { forceSnapshot: true });
    setActiveIndex(items.length);
  }

  function deleteTab(index) {
    setItems(
      items.filter((_, i) => i !== index),
      { forceSnapshot: true }
    );
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
        <ItemBlockStack
          blocks={items[safeActive].body_blocks}
          parentBlockId={block.block_id}
          itemIndex={safeActive}
          onChangeBlocks={(newBlocks, options) => updateItem(safeActive, { body_blocks: newBlocks }, options)}
          assets={assets}
          courseId={courseId}
          onAddCourseAsset={onAddCourseAsset}
          onAddCourseAssets={onAddCourseAssets}
          onUpdateCourseAsset={onUpdateCourseAsset}
        />
      )}
    </div>
  );
}
