import { useEffect, useState } from 'react';
import api from '../lib/api.js';

export default function ImportWordModal({ onClose, onImported }) {
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(null);

  useEffect(() => {
    api.listTemplates().then((list) => {
      setTemplates(list);
      if (list.length > 0) setTemplateId(list[0].id);
    });
  }, []);

  async function handleUpload() {
    if (!file || !templateId) return;
    setBusy(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('template_id', templateId);
    const result = await api.importWordReview(formData);
    setBusy(false);
    setReview(result);
  }

  async function handleConfirm() {
    setBusy(true);
    const course = await api.importWordConfirm({ proposed_course_json: review.proposed_course_json, title: 'Imported Course' });
    setBusy(false);
    onImported(course.id);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Import Word</h2>

        {!review ? (
          <>
            <label htmlFor="import-template">Which template was this generated from?</label>
            <select id="import-template" className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.length === 0 && <option value="">No templates available</option>}
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>

            <label htmlFor="import-file">Word document (.docx)</label>
            <input id="import-file" type="file" accept=".docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />

            <button className="btn btn-primary" disabled={!file || !templateId || busy} onClick={handleUpload} style={{ marginTop: 'var(--space-4)' }}>
              {busy ? 'Reading document...' : 'Review Import'}
            </button>
          </>
        ) : (
          <>
            <div className="import-review__section">
              <h3>Ready to import ({review.mapped.length})</h3>
              <p className="settings-panel__empty">Fields that were found and will be applied.</p>
            </div>
            {review.flagged.length > 0 && (
              <div className="import-review__section">
                <h3>Needs attention ({review.flagged.length})</h3>
                <ul>
                  {review.flagged.map((f, i) => (
                    <li key={i}>
                      <strong>{f.row}</strong> &mdash; {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {review.skipped.length > 0 && (
              <div className="import-review__section">
                <h3>Skipped ({review.skipped.length})</h3>
                <ul>
                  {review.skipped.map((s, i) => (
                    <li key={i}>{s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            <button className="btn btn-primary" disabled={busy} onClick={handleConfirm} style={{ marginTop: 'var(--space-4)' }}>
              Create Draft Course
            </button>
          </>
        )}

        <button className="btn-text modal-close" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
