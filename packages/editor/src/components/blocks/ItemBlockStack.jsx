import { BLOCK_EDITORS } from './index.js';
import { BLOCK_LABELS, createInnerBlock } from '../../lib/blockDefaults.js';
import { ImageSizeAlignmentFields } from './ImageBlock.jsx';

// Shared by AccordionBlock.jsx and TabsBlock.jsx editors -- each accordion
// item / tab holds an array of inner blocks (item.body_blocks), the same
// container pattern two_column uses for its left/right slots (ARCHITECTURE.md
// 3.6), except a stack has no fixed slot count: blocks can be added, removed,
// and reordered freely. Kept intentionally simple per the item 6 spec -- a
// vertical stack, not a nested two-column layout -- so this has no drag
// handles, just up/down buttons.
const STACK_PICKER_TYPES = ['text', 'heading', 'image'];
const STACK_PICKER_LABELS = { text: 'Add Text', heading: 'Add Heading', image: 'Add Image' };

export default function ItemBlockStack({
  blocks,
  parentBlockId,
  itemIndex,
  onChangeBlocks,
  assets,
  courseId,
  onAddCourseAsset,
  onAddCourseAssets,
  onUpdateCourseAsset,
}) {
  const list = blocks || [];

  function addBlock(type) {
    // Namespaced under the parent block + item index, same convention as
    // two_column's blk_col1_left (see DECISIONS.md) -- e.g. blk_acc1_item0_blk1.
    const innerBlock = createInnerBlock(type, parentBlockId, `item${itemIndex}_blk${list.length}`);
    onChangeBlocks([...list, innerBlock], { forceSnapshot: true });
  }

  function removeBlock(index) {
    onChangeBlocks(
      list.filter((_, i) => i !== index),
      { forceSnapshot: true }
    );
  }

  function moveBlock(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    onChangeBlocks(next, { forceSnapshot: true });
  }

  function updateBlock(index, updatedBlock, options) {
    onChangeBlocks(
      list.map((b, i) => (i === index ? updatedBlock : b)),
      options
    );
  }

  return (
    <div className="item-block-stack">
      {list.map((childBlock, index) => {
        const Editor = BLOCK_EDITORS[childBlock.type];
        return (
          <div className="item-block-stack__block" key={childBlock.block_id}>
            <div className="item-block-stack__block-header">
              <span className="item-block-stack__block-label">{BLOCK_LABELS[childBlock.type] || childBlock.type}</span>
              <div className="item-block-stack__block-controls">
                <button
                  type="button"
                  className="btn-text"
                  title="Move up"
                  disabled={index === 0}
                  onClick={() => moveBlock(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-text"
                  title="Move down"
                  disabled={index === list.length - 1}
                  onClick={() => moveBlock(index, 1)}
                >
                  ↓
                </button>
                <button type="button" className="btn-text" title="Remove block" onClick={() => removeBlock(index)}>
                  ✕
                </button>
              </div>
            </div>
            {Editor && (
              <Editor
                block={childBlock}
                onChange={(updated, options) => updateBlock(index, updated, options)}
                assets={assets}
                courseId={courseId}
                onAddCourseAsset={onAddCourseAsset}
                onAddCourseAssets={onAddCourseAssets}
                onUpdateCourseAsset={onUpdateCourseAsset}
              />
            )}
            {/* Same rationale as TwoColumnBlock.jsx's SlotContent: an image
                inside a stack has no separate Settings-panel entry of its
                own, so its Size/Alignment controls live here inline. */}
            {childBlock.type === 'image' && (
              <ImageSizeAlignmentFields block={childBlock} onChange={(updated, options) => updateBlock(index, updated, options)} />
            )}
          </div>
        );
      })}
      <div className="item-block-stack__picker">
        {STACK_PICKER_TYPES.map((type) => (
          <button key={type} type="button" className="btn" onClick={() => addBlock(type)}>
            {STACK_PICKER_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
