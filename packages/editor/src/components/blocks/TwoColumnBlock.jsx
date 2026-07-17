import { useRef, useState } from 'react';
import { BLOCK_EDITORS } from './index.js';
import { BLOCK_LABELS, createInnerBlock } from '../../lib/blockDefaults.js';
import { ImageSizeAlignmentFields } from './ImageBlock.jsx';

const SNAP = 5;
const MIN_SPLIT = 25;
const MAX_SPLIT = 75;

// Mini-picker only offers these three, per spec -- "heading" remains a
// schema-valid slot type (so an imported/templated course with a heading
// slot still renders and edits correctly), it's just not offered as a
// fresh pick here to keep the picker small.
const SLOT_PICKER_TYPES = ['text', 'image', 'embed'];
const SLOT_PICKER_LABELS = { text: 'Add Text', image: 'Add Image', embed: 'Add Embed' };

function SlotContent({ slotBlock, onChangeSlot }) {
  const Editor = BLOCK_EDITORS[slotBlock.type];
  if (!Editor) return null;
  return (
    <>
      <Editor block={slotBlock} onChange={onChangeSlot} />
      {/* An image inside a slot has no separate Settings-panel entry of
          its own (slot blocks are only reachable through the two-column
          container), so its Size/Alignment controls live here inline
          instead. */}
      {slotBlock.type === 'image' && <ImageSizeAlignmentFields block={slotBlock} onChange={onChangeSlot} />}
    </>
  );
}

function Slot({ side, slotBlock, parentBlockId, onSetSlot, onClearSlot, onChangeSlot }) {
  if (!slotBlock) {
    return (
      <div className="two-column-block-editor__empty-slot">
        {SLOT_PICKER_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className="btn"
            onClick={() => onSetSlot(createInnerBlock(type, parentBlockId, side))}
          >
            {SLOT_PICKER_LABELS[type]}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="two-column-block-editor__slot-filled">
      <div className="two-column-block-editor__slot-header">
        <span className="two-column-block-editor__slot-label">{BLOCK_LABELS[slotBlock.type] || slotBlock.type}</span>
        <button type="button" className="btn-text" title="Remove from slot" onClick={onClearSlot}>
          ✕
        </button>
      </div>
      <SlotContent slotBlock={slotBlock} onChangeSlot={onChangeSlot} />
    </div>
  );
}

export default function TwoColumnBlockEditor({ block, onChange }) {
  const containerRef = useRef(null);
  const [dragSplit, setDragSplit] = useState(null);
  const split = dragSplit ?? block.layout?.split ?? 50;

  function commitSlot(side, newSlotBlock) {
    if (newSlotBlock) {
      onChange({ ...block, [side]: newSlotBlock }, { forceSnapshot: true });
    } else {
      const next = { ...block };
      delete next[side];
      onChange(next, { forceSnapshot: true });
    }
  }

  function changeSlotContent(side, updatedSlotBlock, options) {
    onChange({ ...block, [side]: updatedSlotBlock }, options);
  }

  // Live-drag the divider: mousemove updates local dragSplit for
  // immediate visual feedback without touching the document (and
  // therefore without spamming undo snapshots); mouseup commits the
  // final value as a single forced snapshot (ARCHITECTURE.md 3.9's
  // "column split drag: one snapshot on drag end, not during").
  function handleDividerMouseDown(e) {
    e.preventDefault();
    const container = containerRef.current;

    function handleMouseMove(moveEvent) {
      const rect = container.getBoundingClientRect();
      let pct = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      pct = Math.round(pct / SNAP) * SNAP;
      pct = Math.max(MIN_SPLIT, Math.min(MAX_SPLIT, pct));
      setDragSplit(pct);
    }

    function handleMouseUp() {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setDragSplit((current) => {
        if (current != null && current !== block.layout?.split) {
          onChange({ ...block, layout: { ...block.layout, split: current } }, { forceSnapshot: true });
        }
        return null;
      });
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  return (
    <div
      className="two-column-block-editor"
      ref={containerRef}
      style={{ '--two-column-split': `${split}%`, '--two-column-split-complement': `${100 - split}%` }}
    >
      <div className="two-column-block-editor__slot">
        <Slot
          side="left"
          slotBlock={block.left}
          parentBlockId={block.block_id}
          onSetSlot={(b) => commitSlot('left', b)}
          onClearSlot={() => commitSlot('left', null)}
          onChangeSlot={(updated, options) => changeSlotContent('left', updated, options)}
        />
      </div>
      <div
        className="two-column-block-editor__divider"
        onMouseDown={handleDividerMouseDown}
        title="Drag to resize columns"
      />
      <div className="two-column-block-editor__slot">
        <Slot
          side="right"
          slotBlock={block.right}
          parentBlockId={block.block_id}
          onSetSlot={(b) => commitSlot('right', b)}
          onClearSlot={() => commitSlot('right', null)}
          onChangeSlot={(updated, options) => changeSlotContent('right', updated, options)}
        />
      </div>
    </div>
  );
}

export function TwoColumnBlockSettings({ block, onChange }) {
  const split = block.layout?.split ?? 50;

  function setSplit(value) {
    if (Number.isNaN(value)) return;
    const clamped = Math.max(25, Math.min(75, Math.round(value)));
    onChange({ ...block, layout: { ...block.layout, split: clamped } }, { forceSnapshot: true });
  }

  function swapSides() {
    const next = { ...block };
    const { left, right } = block;
    if (right) next.left = right;
    else delete next.left;
    if (left) next.right = left;
    else delete next.right;
    onChange(next, { forceSnapshot: true });
  }

  return (
    <>
      <label>Split (left column %)</label>
      <input
        type="number"
        className="input"
        min={25}
        max={75}
        value={split}
        onChange={(e) => setSplit(Number(e.target.value))}
      />
      <button type="button" className="btn" onClick={swapSides} style={{ marginTop: 'var(--space-3)' }}>
        Swap left/right
      </button>
    </>
  );
}
