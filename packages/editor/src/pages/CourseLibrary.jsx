import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api.js';
import { STARTER_TEMPLATES } from '../lib/starterTemplates.js';
import { createBlankCourseJson } from '../lib/blockDefaults.js';
import ImportWordModal from '../components/ImportWordModal.jsx';
import '../styles/courseLibrary.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function CourseCard({ course, onOpen, onDuplicate, onDelete }) {
  return (
    <div className="course-card card" onClick={() => onOpen(course.id)} role="button" tabIndex={0}>
      <div className="course-card__body">
        <h3>{course.title}</h3>
        <span className={`badge ${course.status === 'draft' ? '' : 'badge-accent'}`}>{course.status}</span>
        <p className="course-card__meta">Updated {formatDate(course.updated_at)}</p>
      </div>
      <div className="course-card__actions" onClick={(e) => e.stopPropagation()}>
        <button className="btn-text" onClick={() => onDuplicate(course.id)}>
          Duplicate
        </button>
        <button className="btn-text" onClick={() => onDelete(course.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

function NewCourseModal({ templates, onClose, onCreated }) {
  const [tab, setTab] = useState('blank');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const showStarters = templates.length === 0;
  const templateOptions = showStarters ? STARTER_TEMPLATES : templates;

  async function createBlank() {
    setBusy(true);
    const courseTitle = title || 'Untitled Course';
    const course = await api.createCourse({ title: courseTitle, course_json: createBlankCourseJson(courseTitle) });
    setBusy(false);
    onCreated(course.id);
  }

  async function createFromTemplate(template) {
    setBusy(true);
    const courseJson = showStarters ? template.course_json : (await api.getCourse(template.id)).course_json;
    const course = await api.createCourse({ title: 'Untitled Course', course_json: courseJson });
    setBusy(false);
    onCreated(course.id);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>New Course</h2>
        <div className="tab-strip">
          <button className={tab === 'blank' ? 'tab-strip__tab tab-strip__tab--active' : 'tab-strip__tab'} onClick={() => setTab('blank')}>
            Blank course
          </button>
          <button className={tab === 'template' ? 'tab-strip__tab tab-strip__tab--active' : 'tab-strip__tab'} onClick={() => setTab('template')}>
            From template
          </button>
        </div>

        {tab === 'blank' && (
          <div className="new-course-blank">
            <label htmlFor="new-course-title">Course title</label>
            <input
              id="new-course-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Course"
              autoFocus
            />
            <button className="btn btn-primary" disabled={busy} onClick={createBlank}>
              Create
            </button>
          </div>
        )}

        {tab === 'template' && (
          <div className="template-grid">
            {templateOptions.map((t) => (
              <button
                key={t.id}
                className="template-grid__item card"
                disabled={busy}
                onClick={() => createFromTemplate(t)}
              >
                <strong>{t.name || t.title}</strong>
                {t.description && <p>{t.description}</p>}
              </button>
            ))}
          </div>
        )}

        <button className="btn-text modal-close" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function CourseLibrary() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function refresh() {
    const [c, t, u] = await Promise.all([api.listCourses(), api.listTemplates(), api.getMe()]);
    setCourses(c);
    setTemplates(t);
    setUser(u);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleCreated(courseId) {
    setShowNewModal(false);
    navigate(`/courses/${courseId}/edit`);
  }

  async function handleDuplicate(id) {
    await api.duplicateCourse(id);
    refresh();
  }

  async function confirmDelete() {
    await api.deleteCourse(deleteTarget);
    setDeleteTarget(null);
    refresh();
  }

  async function startTour() {
    const course = await api.createCourse({ title: 'Untitled Course', course_json: createBlankCourseJson('Untitled Course') });
    navigate(`/courses/${course.id}/edit?tour=1`);
  }

  async function skipOnboarding() {
    await api.updateMe({ onboarding_completed: true });
    setUser((u) => ({ ...u, onboarding_completed: true }));
  }

  if (loading) return null;

  return (
    <div className="course-library">
      <header className="top-bar">
        <span className="wordmark">
          <img
            src="/brand/logos/svg/mnemonify-primary-horizontal-reversed.svg"
            alt="Mnemonify, Learning creation for everyone"
            className="mnemonify-logo"
          />
        </span>
        <Link to="/templates" className="top-bar__templates-link">
          Templates
        </Link>
        <div className="top-bar__nav" />
        <button className="btn" onClick={() => setShowImportModal(true)}>
          Import Word
        </button>
        <button className="btn btn-primary top-bar__new" onClick={() => setShowNewModal(true)}>
          New Course
        </button>
      </header>

      <main className="course-library__main">
        {user && !user.onboarding_completed && (
          <div className="onboarding-banner card">
            <div>
              <strong>Welcome to Mnemonify.</strong> Let&rsquo;s build your first course.
            </div>
            <div className="onboarding-banner__actions">
              <button className="btn btn-primary" onClick={startTour}>
                Start guided tour
              </button>
              <button className="btn-text" onClick={skipOnboarding}>
                Skip
              </button>
            </div>
          </div>
        )}

        {courses.length === 0 ? (
          <div className="empty-state">
            <p>No courses yet. Let&rsquo;s change that.</p>
            <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
              Create your first course
            </button>
          </div>
        ) : (
          <div className="course-grid">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onOpen={(id) => navigate(`/courses/${id}/edit`)}
                onDuplicate={handleDuplicate}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </main>

      {showNewModal && (
        <NewCourseModal templates={templates} onClose={() => setShowNewModal(false)} onCreated={handleCreated} />
      )}

      {showImportModal && (
        <ImportWordModal
          onClose={() => setShowImportModal(false)}
          onImported={(courseId) => {
            setShowImportModal(false);
            navigate(`/courses/${courseId}/edit`);
          }}
        />
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Delete this course?</h2>
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
