import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api.js';
import { STARTER_TEMPLATES } from '../lib/starterTemplates.js';
import { createBlankCourseJson } from '../lib/blockDefaults.js';
import { getCourseAccent, getCourseCoverImage, getCourseInitial } from '../lib/courseCard.js';
import ImportWordModal from '../components/ImportWordModal.jsx';
import OrganizationMembersPanel from '../components/OrganizationMembersPanel.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import '../styles/courseLibrary.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function KebabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

export function CourseCard({ course, onOpen, onDuplicate, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const coverImage = getCourseCoverImage(course);
  const accent = getCourseAccent(course);
  const title = course.title || 'Untitled Course';

  function openCourse() {
    setMenuOpen(false);
    onOpen(course.id);
  }

  function handleCardKeyDown(event) {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    openCourse();
  }

  return (
    <article
      className="course-card"
      onClick={openCourse}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className={coverImage ? 'course-card__cover' : 'course-card__cover course-card__cover--fallback'} style={{ '--course-accent': accent }}>
        {coverImage ? (
          <img className="course-card__cover-image" src={coverImage} alt="" />
        ) : (
          <span className="course-card__cover-initial" aria-hidden="true">{getCourseInitial(title)}</span>
        )}
      </div>
      <div className="course-card__body">
        <h3 title={title}>{title}</h3>
        <div className="course-card__details">
          <span className={`badge ${course.status === 'draft' ? '' : 'badge-accent'}`}>{course.status === 'published' ? 'Published' : 'Draft'}</span>
          <p className="course-card__meta">Updated {formatDate(course.updated_at)}</p>
        </div>
      </div>
      {(onDuplicate || onDelete) && <div className="course-card__menu" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="course-card__menu-toggle"
          aria-label={`Actions for ${title}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <KebabIcon />
        </button>
        {menuOpen && (
          <div className="course-card__menu-popover" role="menu">
            {onDuplicate && <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDuplicate(course.id); }}>Duplicate</button>}
            {onDelete && <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDelete(course.id); }}>Delete</button>}
          </div>
        )}
      </div>}
    </article>
  );
}

export function filterCoursesByTitle(courses, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return courses;
  return courses.filter((course) => (course.title || 'Untitled Course').toLowerCase().includes(normalizedQuery));
}

export function CourseResults({ courses, query, onOpen, onDuplicate, onDelete }) {
  const visibleCourses = filterCoursesByTitle(courses, query);

  if (visibleCourses.length === 0) {
    return (
      <div className="empty-state course-library__search-empty" role="status">
        <p>No courses match your search.</p>
      </div>
    );
  }

  return (
    <div className="course-grid">
      {visibleCourses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onOpen={onOpen}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}
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
  const { user, canEdit, canManageMembership, logout, refresh: refreshAuth } = useAuth();
  const [courses, setCourses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMembers, setShowMembers] = useState(false);

  async function refresh() {
    const [c, t] = await Promise.all([api.listCourses(), api.listTemplates()]);
    setCourses(c);
    setTemplates(t);
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
    await refreshAuth();
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
        {canEdit && <button className="btn" onClick={() => setShowImportModal(true)}>Import Word</button>}
        {canManageMembership && <button className="btn" onClick={() => setShowMembers(true)}>Team</button>}
        {canEdit && <button className="btn btn-primary top-bar__new" onClick={() => setShowNewModal(true)}>New Course</button>}
        <button className="btn-text" onClick={logout} title={`Sign out ${user?.email || ''}`}>Sign out</button>
      </header>

      <main className="course-library__main">
        {user && !user.onboarding_completed && (
          <div className="onboarding-banner card">
            <div>
              <strong>Welcome to Mnemonify.</strong> Let&rsquo;s build your first course.
            </div>
            <div className="onboarding-banner__actions">
              {canEdit && <button className="btn btn-primary" onClick={startTour}>
                Start guided tour
              </button>}
              {canEdit && <button className="btn-text" onClick={skipOnboarding}>
                Skip
              </button>}
            </div>
          </div>
        )}

        {courses.length > 0 && (
          <div className="course-library__search">
            <label className="sr-only" htmlFor="course-library-search">Search courses</label>
            <input
              id="course-library-search"
              className="course-library__search-input"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search courses…"
              autoComplete="off"
            />
          </div>
        )}

        {courses.length === 0 ? (
          <div className="empty-state">
            <p>No courses yet. Let&rsquo;s change that.</p>
            {canEdit && <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
              Create your first course
            </button>}
          </div>
        ) : (
          <CourseResults
            courses={courses}
            query={searchQuery}
            onOpen={(id) => navigate(`/courses/${id}/edit`)}
            onDuplicate={canEdit ? handleDuplicate : undefined}
            onDelete={canEdit ? setDeleteTarget : undefined}
          />
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

      {showMembers && <OrganizationMembersPanel onClose={() => setShowMembers(false)} />}

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
