import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BLOCK_EDITORS } from './blocks/index.js';
import { createBlock } from '../lib/blockDefaults.js';
import { blockLabel } from '../lib/triggerUtils.js';
import GenericBlockPreview from './GenericBlockPreview.jsx';
import BlockPickerModal from './BlockPickerModal.jsx';
import MoveCopyBlockModal from './MoveCopyBlockModal.jsx';

function BlockWrapper({
  block,
  pageBlocks,
  selected,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
  assets,
  courseId,
  onAddCourseAsset,
  onAddCourseAssets,
  onUpdateCourseAsset,
  pages,
  activePageId,
  onMoveBlockToPage,
  onCopyBlockToPage,
}) {
  const Editor = BLOCK_EDITORS[block.type] || GenericBlockPreview;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.block_id });
  const [moveCopyMode, setMoveCopyMode] = useState(null); // 'move' | 'copy' | null

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={selected ? 'block-wrapper block-wrapper--selected' : 'block-wrapper'}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.block_id);
      }}
    >
      <div className="block-wrapper__toolbar">
        <span className="block-wrapper__handle" title="Drag to reorder" {...attributes} {...listeners}>
          ⠿
        </span>
        <span className="block-wrapper__label">{blockLabel(block, pageBlocks)}</span>
        <span className="block-wrapper__spacer" />
        <button
          className="btn-text"
          title="Move to page"
          onClick={(e) => {
            e.stopPropagation();
            setMoveCopyMode('move');
          }}
        >
          ⇥
        </button>
        <button
          className="btn-text"
          title="Copy to page"
          onClick={(e) => {
            e.stopPropagation();
            setMoveCopyMode('copy');
          }}
        >
          ⎘
        </button>
        <button
          className="btn-text"
          title="Duplicate"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(block.block_id);
          }}
        >
          ⧉
        </button>
        <button
          className="btn-text"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(block.block_id);
          }}
        >
          ✕
        </button>
      </div>
      <div className="block-wrapper__content">
        <Editor
          block={block}
          assets={assets}
          onChange={onChange}
          courseId={courseId}
          onAddCourseAsset={onAddCourseAsset}
          onAddCourseAssets={onAddCourseAssets}
          onUpdateCourseAsset={onUpdateCourseAsset}
        />
      </div>
      {moveCopyMode && (
        <MoveCopyBlockModal
          mode={moveCopyMode}
          pages={pages}
          currentPageId={activePageId}
          onClose={() => setMoveCopyMode(null)}
          onConfirm={(targetPageId) => {
            if (moveCopyMode === 'move') onMoveBlockToPage(block.block_id, targetPageId);
            else onCopyBlockToPage(block.block_id, targetPageId);
            setMoveCopyMode(null);
          }}
        />
      )}
    </div>
  );
}

export default function BlockCanvas({
  page,
  pages,
  selectedBlockId,
  onSelectBlock,
  onChangeBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onAddBlock,
  onReorderBlocks,
  assets,
  courseId,
  onAddCourseAsset, onAddCourseAssets,
  onUpdateCourseAsset,
  onMoveBlockToPage,
  onCopyBlockToPage,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = page.blocks.findIndex((b) => b.block_id === active.id);
    const newIndex = page.blocks.findIndex((b) => b.block_id === over.id);
    onReorderBlocks(arrayMove(page.blocks, oldIndex, newIndex));
  }

  return (
    <div className="block-canvas" onClick={() => onSelectBlock(null)}>
      {page.blocks.length === 0 && <p className="block-canvas__empty">No blocks yet. Add your first one below.</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={page.blocks.map((b) => b.block_id)} strategy={verticalListSortingStrategy}>
          {page.blocks.map((block) => (
            <BlockWrapper
              key={block.block_id}
              block={block}
              pageBlocks={page.blocks}
              assets={assets}
              courseId={courseId}
              onAddCourseAsset={onAddCourseAsset}
              onAddCourseAssets={onAddCourseAssets}
              onUpdateCourseAsset={onUpdateCourseAsset}
              selected={block.block_id === selectedBlockId}
              onSelect={onSelectBlock}
              onChange={(updated, options) => onChangeBlock(block.block_id, updated, options)}
              onDuplicate={onDuplicateBlock}
              onDelete={onDeleteBlock}
              pages={pages}
              activePageId={page.page_id}
              onMoveBlockToPage={onMoveBlockToPage}
              onCopyBlockToPage={onCopyBlockToPage}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button
        className="btn btn-primary block-canvas__add"
        data-tour="add-block"
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker(true);
        }}
      >
        + Add Block
      </button>
      {showPicker && (
        <BlockPickerModal
          onClose={() => setShowPicker(false)}
          onPick={(type) => {
            onAddBlock(createBlock(type));
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}
