import { useEffect, useState } from 'react';
import api from '../lib/api.js';

export default function PageTemplateGalleryModal({ onInsert, onClose }) {
  const [templates, setTemplates] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listPageTemplates().then(setTemplates).catch(() => setError('Could not load page templates.'));
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Insert from template</h2>
        {error && <p className="image-block-editor__error">{error}</p>}
        {!error && !templates && <p className="settings-panel__empty">Loading...</p>}
        {templates && templates.length === 0 && <p className="settings-panel__empty">No page templates saved yet.</p>}
        {templates && templates.length > 0 && (
          <ul className="move-copy-modal__list">
            {templates.map((t) => (
              <li key={t.id}>
                <button className="btn move-copy-modal__page" onClick={() => onInsert(t)}>
                  {t.name}
                  <span className="page-template-gallery__scope">{t.scope === 'org' ? 'Organisation' : 'Personal'}</span>
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
