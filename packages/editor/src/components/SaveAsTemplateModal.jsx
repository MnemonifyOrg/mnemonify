import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';

export default function SaveAsTemplateModal({ courseTitle, courseId, onClose }) {
  const [name, setName] = useState(`${courseTitle} Template`);
  const [scope, setScope] = useState('personal');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSave() {
    setBusy(true);
    await api.saveAsTemplate(courseId, { title: name, template_scope: scope });
    setBusy(false);
    setDone(true);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Save as Template</h2>
        {done ? (
          <>
            <p>Template saved. Content fields have been replaced with placeholders.</p>
            <Link to="/templates" className="btn btn-primary">
              Go to Templates
            </Link>
          </>
        ) : (
          <>
            <label htmlFor="template-name">Template name</label>
            <input id="template-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />

            <label htmlFor="template-scope">Scope</label>
            <select id="template-scope" className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="personal">Personal</option>
              <option value="org">Organisation</option>
            </select>

            <button className="btn btn-primary" disabled={busy} onClick={handleSave} style={{ marginTop: 'var(--space-4)' }}>
              Save Template
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
