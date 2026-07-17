// Shared by both "Move to page" and "Copy to page" (BlockCanvas.jsx) --
// same page list, only the confirm action differs.
export default function MoveCopyBlockModal({ mode, pages, currentPageId, onConfirm, onClose }) {
  const otherPages = pages.filter((p) => p.page_id !== currentPageId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === 'move' ? 'Move block to page' : 'Copy block to page'}</h2>
        {otherPages.length === 0 ? (
          <p className="settings-panel__empty">There are no other pages yet.</p>
        ) : (
          <ul className="move-copy-modal__list">
            {otherPages.map((p) => (
              <li key={p.page_id}>
                <button className="btn move-copy-modal__page" onClick={() => onConfirm(p.page_id)}>
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="btn-text modal-close" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
