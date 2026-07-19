import UtilityBar from './UtilityBar.jsx';

// ARCHITECTURE.md 5.1: hamburger left, course title center, utility items
// right (desktop only -- UtilityBar's own CSS hides the inline layout
// below 1280px, where the same items reappear in the fixed bottom bar
// App.jsx renders separately).
export default function TopBar({ courseTitle, onToggleDrawer, drawerOpen, utilityBar, resources, onOpenModal, onJumpToPage }) {
  return (
    <header className="top-bar">
      <button
        type="button"
        className="top-bar__hamburger"
        onClick={onToggleDrawer}
        aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={drawerOpen}
      >
        <span className="top-bar__hamburger-bar" />
        <span className="top-bar__hamburger-bar" />
        <span className="top-bar__hamburger-bar" />
      </button>
      {/* Truncates rather than wraps, same fix pattern as the editor's own
          top bar title overflow bug (courseEditor.css .course-editor__title):
          min-width: 0 lets this flex item shrink below its text's
          intrinsic width, which text-overflow: ellipsis requires. */}
      <h1 className="top-bar__title" title={courseTitle}>
        {courseTitle}
      </h1>
      <div className="top-bar__utility-slot">
        <UtilityBar
          utilityBar={utilityBar}
          resources={resources}
          courseTitle={courseTitle}
          onOpenModal={onOpenModal}
          onJumpToPage={onJumpToPage}
          layout="inline"
        />
      </div>
    </header>
  );
}
