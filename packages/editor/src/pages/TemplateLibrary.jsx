import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api.js';
import '../styles/courseLibrary.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TemplateLibrary() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function refresh() {
    setTemplates(await api.listTemplates());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleUseTemplate(template) {
    const full = await api.getCourse(template.id);
    const course = await api.createCourse({ title: 'Untitled Course', course_json: full.course_json });
    navigate(`/courses/${course.id}/edit`);
  }

  async function confirmDelete() {
    await api.deleteCourse(deleteTarget);
    setDeleteTarget(null);
    refresh();
  }

  if (loading) return null;

  return (
    <div className="course-library">
      <header className="top-bar">
        <span className="wordmark">
          <img
            src="/brand/Mnemonify-Source-Logo.png"
            alt="Mnemonify"
            height="40"
            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
          />
        </span>
        <nav className="top-bar__nav">
          <Link to="/">Course Library</Link>
        </nav>
      </header>

      <main className="course-library__main">
        <h1>Templates</h1>
        {templates.length === 0 ? (
          <div className="empty-state">
            <p>No templates yet. Save a course as a template to see it here.</p>
          </div>
        ) : (
          <div className="course-grid">
            {templates.map((template) => (
              <div className="course-card" key={template.id}>
                <div className="course-card__body">
                  <h3>{template.title}</h3>
                  <span className={template.template_scope === 'org' ? 'badge badge-accent' : 'badge'}>
                    {template.template_scope === 'org' ? 'Organisation' : 'Personal'}
                  </span>
                  <p className="course-card__meta">Updated {formatDate(template.updated_at)}</p>
                </div>
                <div className="course-card__actions">
                  <button className="btn-text" onClick={() => handleUseTemplate(template)}>
                    Use Template
                  </button>
                  <a className="btn-text" href={api.exportTemplateWord(template.id)}>
                    Export Word
                  </a>
                  <button className="btn-text" onClick={() => setDeleteTarget(template.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Delete this template?</h2>
            <p>This can&rsquo;t be undone from here.</p>
            <div className="modal-actions">
              <button className="btn-text" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
