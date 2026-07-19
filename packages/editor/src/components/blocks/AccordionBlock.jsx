import EditableRichField from './EditableRichField.jsx';
import ItemBlockStack from './ItemBlockStack.jsx';
import { genItemId } from '../../lib/idGen.js';

export default function AccordionBlockEditor({
  block,
  onChange,
  assets,
  courseId,
  onAddCourseAsset,
  onAddCourseAssets,
  onUpdateCourseAsset,
}) {
  const items = block.content.items || [];

  function setItems(newItems, options) {
    onChange({ ...block, content: { ...block.content, items: newItems } }, options);
  }

  function updateItem(index, patch, options) {
    setItems(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
      options
    );
  }

  function addItem() {
    setItems([...items, { item_id: genItemId(), title: '', body_blocks: [] }], { forceSnapshot: true });
  }

  function deleteItem(index) {
    setItems(
      items.filter((_, i) => i !== index),
      { forceSnapshot: true }
    );
  }

  return (
    <div className="accordion-block-editor">
      {items.map((item, index) => (
        <div className="accordion-block-editor__item card" key={item.item_id || index}>
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
          <ItemBlockStack
            blocks={item.body_blocks}
            parentBlockId={block.block_id}
            itemIndex={index}
            onChangeBlocks={(newBlocks, options) => updateItem(index, { body_blocks: newBlocks }, options)}
            assets={assets}
            courseId={courseId}
            onAddCourseAsset={onAddCourseAsset}
            onAddCourseAssets={onAddCourseAssets}
            onUpdateCourseAsset={onUpdateCourseAsset}
          />
        </div>
      ))}
      <button className="btn" onClick={addItem}>
        + Add item
      </button>
    </div>
  );
}
