import { useEffect, useRef, useState } from 'react';
import UtilityBar from './UtilityBar.jsx';

const STATUS_LABELS = {
  'not-visited': 'Not visited',
  'in-progress': 'In progress',
  completed: 'Completed',
  locked: 'Locked',
};

function StatusIcon({ status }) {
  const className = `nav-drawer__status-icon nav-drawer__status-icon--${status}`;
  if (status === 'completed') {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={className}>
        <circle cx="8" cy="8" r="7" />
        <path d="M4.5 8.3l2.2 2.2 4.6-4.8" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'in-progress') {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={className}>
        <circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 1.7a6.3 6.3 0 010 12.6z" />
      </svg>
    );
  }
  if (status === 'locked') {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={className}>
        <rect x="3.5" y="7" width="9" height="6.5" rx="1.1" />
        <path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function PageItem({ page, status, isCurrent, onNavigate }) {
  const locked = status === 'locked';
  return (
    <li className="nav-drawer__item">
      <button
        type="button"
        className={isCurrent ? 'nav-drawer__page nav-drawer__page--current' : 'nav-drawer__page'}
        disabled={locked}
        onClick={() => onNavigate(page.page_id)}
        aria-current={isCurrent ? 'page' : undefined}
        aria-label={`${page.title}, ${STATUS_LABELS[status]}`}
      >
        <StatusIcon status={status} />
        <span className="nav-drawer__page-title">{page.title}</span>
      </button>
    </li>
  );
}

export function getGroupPagesInCourseOrder(group, pages) {
  const memberIds = new Set(group.page_ids || []);
  return pages.filter((page) => memberIds.has(page.page_id));
}

function GroupSection({ group, pages, getStatus, currentPageId, onNavigate }) {
  const [expanded, setExpanded] = useState(true);
  const groupPages = getGroupPagesInCourseOrder(group, pages);

  return (
    <li className="nav-drawer__group">
      <button
        type="button"
        className="nav-drawer__group-header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <span className={expanded ? 'nav-drawer__group-chevron nav-drawer__group-chevron--expanded' : 'nav-drawer__group-chevron'}>
          ▸
        </span>
        {group.title}
      </button>
      {expanded && (
        <ul className="nav-drawer__group-list">
          {groupPages.map((page) => (
            <PageItem
              key={page.page_id}
              page={page}
              status={getStatus(page.page_id)}
              isCurrent={page.page_id === currentPageId}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ARCHITECTURE.md 5.1: persistent left sidebar at 1280px+ (collapsible via
// the top bar's hamburger), full-height slide-in overlay below that
// (closed by default, opened via hamburger, closes on page click/outside
// click/Escape). `open` is a single boolean controlled by App.jsx; CSS
// alone gives it the two different visual treatments per breakpoint --
// see chrome.css.
export default function NavDrawer({
  pages,
  pageDisplay,
  pageGroups,
  currentPageId,
  getStatus,
  onNavigate,
  open,
  onClose,
  utilityBar,
  resources,
  courseTitle,
  onOpenModal,
  onJumpToPage,
}) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    function handleClickOutside(e) {
      // Only relevant as an overlay (mobile/tablet) -- on desktop the
      // drawer is a persistent sidebar with no backdrop to click outside
      // of, so this is harmless there too since the hamburger is the only
      // other interactive element and clicking it already toggles `open`
      // through its own handler, not this one.
      if (drawerRef.current && !drawerRef.current.contains(e.target) && !e.target.closest('.top-bar__hamburger')) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [open, onClose]);

  const groupedPageIds = new Set((pageGroups || []).flatMap((g) => g.page_ids));
  const ungroupedPages = pages.filter((p) => !groupedPageIds.has(p.page_id));

  return (
    <>
      {open && <div className="nav-drawer__backdrop" aria-hidden="true" />}
      <nav
        className={open ? 'nav-drawer nav-drawer--open' : 'nav-drawer'}
        aria-label="Course pages"
        ref={drawerRef}
      >
        <ul className="nav-drawer__list">
          {pageDisplay === 'grouped' && pageGroups?.length > 0
            ? pageGroups.map((group) => (
                <GroupSection
                  key={group.group_id}
                  group={group}
                  pages={pages}
                  getStatus={getStatus}
                  currentPageId={currentPageId}
                  onNavigate={onNavigate}
                />
              ))
            : null}
          {(pageDisplay !== 'grouped' ? pages : ungroupedPages).map((page) => (
            <PageItem
              key={page.page_id}
              page={page}
              status={getStatus(page.page_id)}
              isCurrent={page.page_id === currentPageId}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
        {/* Utility bar reachable from mobile (P1-57, Phase 4 usability-fix
            session): the hamburger drawer is the only chrome surface visible
            below 1280px alongside the bottom utility bar, but nothing put
            Contact/Resources/custom items INSIDE it -- a real user on mobile
            had no reason to expect them at the very bottom of the screen
            rather than in the menu they'd already opened. Reuses UtilityBar
            as-is (same click handlers, same item list) with a "drawer"
            layout for vertical-list styling; UtilityBar itself already
            returns null when no items are enabled, so no extra guard is
            needed here. */}
        <UtilityBar
          utilityBar={utilityBar}
          resources={resources}
          courseTitle={courseTitle}
          onOpenModal={onOpenModal}
          onJumpToPage={onJumpToPage}
          layout="drawer"
        />
      </nav>
    </>
  );
}
