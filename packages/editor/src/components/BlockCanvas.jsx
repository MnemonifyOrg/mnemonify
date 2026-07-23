import { Fragment, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BLOCK_EDITORS } from './blocks/index.js';
import { createBlock } from '../lib/blockDefaults.js';
import { blockLabel } from '../lib/triggerUtils.js';
import GenericBlockPreview from './GenericBlockPreview.jsx';
import BlockPickerModal from './BlockPickerModal.jsx';
import MoveCopyBlockModal from './MoveCopyBlockModal.jsx';
import LinkToBankModal from './LinkToBankModal.jsx';

// Phase 4.6 Step 3: a between-block "+" insertion point. Always present in
// the DOM (not conditionally rendered only on hover) so it's a real button
// in the natural tab order -- keyboard reachability comes for free from
// that, rather than needing a separate keyboard-only path. Visually
// subtle until hover or keyboard focus via CSS (.block-canvas__insert,
// same reveal-on-hover/focus pattern as .page-list__actions).
function InsertionPoint({ index, onInsert }) {
  return (
    <div className="block-canvas__insert">
      <button
        type="button"
        className="block-canvas__insert-btn"
        aria-label="Insert a block here"
        onClick={(e) => {
          e.stopPropagation();
          onInsert(index);
        }}
      >
        +
      </button>
    </div>
  );
}

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
  variables,
  activePageId,
  onMoveBlockToPage,
  onCopyBlockToPage,
  questionBanks,
  onLinkBlockToBank,
}) {
  const Editor = BLOCK_EDITORS[block.type] || GenericBlockPreview;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.block_id });
  const [moveCopyMode, setMoveCopyMode] = useState(null); // 'move' | 'copy' | null
  const [linkBankOpen, setLinkBankOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-id={block.block_id}
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
        {!block.linked_entity_id && (
          <span
            className="block-wrapper__bank-drag"
            draggable
            title="Drag this question to the Question Banks panel"
            onDragStart={(event) => {
              event.stopPropagation();
              event.dataTransfer.effectAllowed = 'link';
              event.dataTransfer.setData('application/x-mnemonify-block', JSON.stringify({ pageId: activePageId, blockId: block.block_id }));
            }}
          >
            ⇢
          </span>
        )}
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
        {!block.linked_entity_id && questionBanks?.length > 0 && (
          <button
            className="btn-text"
            title="Add to bank"
            onClick={(e) => {
              e.stopPropagation();
              setLinkBankOpen(true);
            }}
          >
            +↗
          </button>
        )}
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
          className="btn-text block-wrapper__delete-btn"
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
          variables={variables}
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
      {linkBankOpen && (
        <LinkToBankModal
          questionBanks={questionBanks}
          onClose={() => setLinkBankOpen(false)}
          onConfirm={(bankId) => {
            onLinkBlockToBank(activePageId, block.block_id, bankId);
            setLinkBankOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function BlockCanvas({
  page,
  pages,
  variables,
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
  questionBanks,
  onLinkBlockToBank,
}) {
  // null = closed; a number = open, inserting at that block index.
  const [pickerInsertIndex, setPickerInsertIndex] = useState(null);
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
          <InsertionPoint index={0} onInsert={setPickerInsertIndex} />
          {page.blocks.map((block, index) => (
            <Fragment key={block.block_id}>
              <BlockWrapper
                block={block}
                pageBlocks={page.blocks}
                assets={assets}
                courseId={courseId}
                onAddCourseAsset={onAddCourseAsset}
                onAddCourseAssets={onAddCourseAssets}
                onUpdateCourseAsset={onUpdateCourseAsset}
                variables={variables}
                selected={block.block_id === selectedBlockId}
                onSelect={onSelectBlock}
                onChange={(updated, options) => onChangeBlock(block.block_id, updated, options)}
                onDuplicate={onDuplicateBlock}
                onDelete={onDeleteBlock}
                pages={pages}
                activePageId={page.page_id}
                onMoveBlockToPage={onMoveBlockToPage}
                onCopyBlockToPage={onCopyBlockToPage}
                questionBanks={questionBanks}
                onLinkBlockToBank={onLinkBlockToBank}
              />
              <InsertionPoint index={index + 1} onInsert={setPickerInsertIndex} />
            </Fragment>
          ))}
        </SortableContext>
      </DndContext>
      <button
        className="btn btn-primary block-canvas__add"
        data-tour="add-block"
        onClick={(e) => {
          e.stopPropagation();
          setPickerInsertIndex(page.blocks.length);
        }}
      >
        + Add Block
      </button>
      {pickerInsertIndex !== null && (
        <BlockPickerModal
          onClose={() => setPickerInsertIndex(null)}
          onPick={(type) => {
            onAddBlock(createBlock(type), pickerInsertIndex);
            setPickerInsertIndex(null);
          }}
        />
      )}
    </div>
  );
}
