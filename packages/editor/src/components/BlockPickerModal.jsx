import { getBlockTypesByCategory } from '@mnemonify/schema/block-registry.js';

// Grouped by category (Phase 4.5b) -- reads packages/schema/block-registry.js
// directly rather than a flat hardcoded list, so a new block type appearing
// in the registry shows up here, correctly grouped, with no picker-specific
// edit required. See DECISIONS.md.
export default function BlockPickerModal({ onPick, onClose }) {
  const grouped = getBlockTypesByCategory();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Add a block</h2>
        {Object.entries(grouped).map(([category, defs]) => (
          <div className="block-picker-category" key={category}>
            <h3 className="block-picker-category__title">{category}</h3>
            <div className="block-picker-grid">
              {defs.map((def) => (
                <button key={def.type} className="block-picker-grid__item card" onClick={() => onPick(def.type)}>
                  {def.displayName}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button className="btn-text modal-close" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
