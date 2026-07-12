import { BLOCK_TYPES, BLOCK_LABELS } from '../lib/blockDefaults.js';

export default function BlockPickerModal({ onPick, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Add a block</h2>
        <div className="block-picker-grid">
          {BLOCK_TYPES.map((type) => (
            <button key={type} className="block-picker-grid__item card" onClick={() => onPick(type)}>
              {BLOCK_LABELS[type]}
            </button>
          ))}
        </div>
        <button className="btn-text modal-close" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
