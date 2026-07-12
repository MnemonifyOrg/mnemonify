import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MediaLibraryPanel from '../MediaLibraryPanel.jsx';

function CarouselThumb({ assetId, asset, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: assetId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div className="carousel-block-editor__thumb" ref={setNodeRef} style={style}>
      <span className="carousel-block-editor__thumb-handle" title="Drag to reorder" {...attributes} {...listeners}>
        ⠿
      </span>
      {asset ? <img src={`/${asset.src}`} alt={asset.alt || ''} /> : <div className="carousel-block-editor__thumb-missing">Missing</div>}
      <button className="btn-text" onClick={() => onRemove(assetId)}>
        ✕
      </button>
    </div>
  );
}

export default function CarouselBlockEditor({ block, assets, onChange, courseId, onAddCourseAssets }) {
  const [showLibrary, setShowLibrary] = useState(false);
  const assetIds = block.content.asset_ids || [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function setAssetIds(newIds) {
    onChange({ ...block, content: { ...block.content, asset_ids: newIds } });
  }

  function handleAddSelected(selectedIds) {
    const merged = [...assetIds, ...selectedIds.filter((id) => !assetIds.includes(id))];
    setAssetIds(merged);
    setShowLibrary(false);
  }

  function handleRemove(assetId) {
    setAssetIds(assetIds.filter((id) => id !== assetId));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = assetIds.indexOf(active.id);
    const newIndex = assetIds.indexOf(over.id);
    setAssetIds(arrayMove(assetIds, oldIndex, newIndex));
  }

  return (
    <div className="carousel-block-editor">
      {assetIds.length === 0 ? (
        <p className="settings-panel__empty">No images yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={assetIds} strategy={horizontalListSortingStrategy}>
            <div className="carousel-block-editor__thumbs">
              {assetIds.map((assetId) => (
                <CarouselThumb
                  key={assetId}
                  assetId={assetId}
                  asset={(assets || []).find((a) => a.asset_id === assetId)}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <button className="btn" onClick={() => setShowLibrary(true)}>
        Add Images from Library
      </button>

      {showLibrary && (
        <MediaLibraryPanel
          courseId={courseId}
          courseAssets={assets}
          onAddCourseAssets={onAddCourseAssets}
          onUpdateCourseAsset={() => {}}
          onClose={() => setShowLibrary(false)}
          selectionMode
          onAddSelected={handleAddSelected}
        />
      )}
    </div>
  );
}
