import { useState } from 'react';

export default function PageList({ pages, activePageId, onSelectPage, onAddPage, onRenamePage, onDeletePage }) {
  const [renamingId, setRenamingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');

  function startRename(page) {
    setRenamingId(page.page_id);
    setDraftTitle(page.title);
  }

  function commitRename(pageId) {
    if (draftTitle.trim()) {
      onRenamePage(pageId, draftTitle.trim());
    }
    setRenamingId(null);
  }

  return (
    <div className="page-list">
      <ul>
        {pages.map((page) => (
          <li
            key={page.page_id}
            className={page.page_id === activePageId ? 'page-list__item page-list__item--active' : 'page-list__item'}
          >
            {renamingId === page.page_id ? (
              <input
                className="input"
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={() => commitRename(page.page_id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(page.page_id);
                  if (e.key === 'Escape') setRenamingId(null);
                }}
              />
            ) : (
              <button className="page-list__title" onClick={() => onSelectPage(page.page_id)} onDoubleClick={() => startRename(page)}>
                {page.title}
              </button>
            )}
            <div className="page-list__actions">
              <button className="btn-text" title="Rename" onClick={() => startRename(page)}>
                ✎
              </button>
              {pages.length > 1 && (
                <button className="btn-text" title="Delete page" onClick={() => onDeletePage(page.page_id)}>
                  ✕
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <button className="btn page-list__add" onClick={onAddPage}>
        + Add Page
      </button>
    </div>
  );
}
