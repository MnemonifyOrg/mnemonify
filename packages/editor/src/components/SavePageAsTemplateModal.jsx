import { useState } from 'react';
import api from '../lib/api.js';

export default function SavePageAsTemplateModal({ page, onClose }) {
  const [name, setName] = useState(page.title || 'Untitled Page');
  const [scope, setScope] = useState('personal');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      // page_id is stripped -- a template stores a page's shape, not a
      // specific instance. "Insert from template" always mints a fresh
      // page_id (and fresh block_ids) on insert, so the original id would
      // just be misleading dead weight in storage.
      const { page_id, ...pageShape } = page;
      await api.createPageTemplate({ name, scope, page_json: pageShape });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save template. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Save as Page Template</h2>
        {done ? (
          <>
            <p>Page template saved.</p>
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <label htmlFor="page-template-name">Template name</label>
            <input
              id="page-template-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            <label htmlFor="page-template-scope">Scope</label>
            <select id="page-template-scope" className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="personal">Personal</option>
              <option value="org">Organisation</option>
            </select>

            {error && <p className="image-block-editor__error">{error}</p>}
            <button className="btn btn-primary" disabled={busy} onClick={handleSave} style={{ marginTop: 'var(--space-4)' }}>
              {busy ? 'Saving...' : 'Save Template'}
            </button>
          </>
        )}
        <button className="btn-text modal-close" onClick={onClose}>
          {done ? 'Close' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
