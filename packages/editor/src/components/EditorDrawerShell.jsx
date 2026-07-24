import { useEffect } from 'react';
import { FEATURE_FLAGS } from '@mnemonify/schema/featureFlags.js';
import { RAIL_ITEMS, visibleRailItems } from '../lib/editorDrawer.js';

function RailIcon({ itemId }) {
  const paths = {
    course: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    player: <><path d="M5 5h14v14H5z" /><path d="m10 8 5 4-5 4z" /></>,
    variables: <><path d="M8 4 4 12l4 8M16 4l4 8-4 8M14 4l-4 16" /></>,
    'question-banks': <><path d="M5 5h14v14H5z" /><path d="M8 9h8M8 13h6M8 17h4" /></>,
    objectives: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
    'course-health': <><path d="M12 3 20 7v5c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V7z" /><path d="m9 12 2 2 4-4" /></>,
    glossary: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M8 4v13a3 3 0 0 0 3 3" /></>,
    'version-history': <><path d="M4 12a8 8 0 1 0 2-5.3" /><path d="M4 4v5h5M12 8v4l3 2" /></>,
  };
  return (
    <svg className="editor-icon-rail__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[itemId]}
    </svg>
  );
}

function DrawerPlaceholder({ title, description }) {
  return (
    <div className="editor-drawer__placeholder">
      <div className="editor-drawer__placeholder-icon" aria-hidden="true">✦</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <p className="editor-drawer__hint">The existing settings panel remains available while this drawer is being wired up.</p>
    </div>
  );
}

function DrawerContent({ activeRailItem, contextualDrawer }) {
  if (activeRailItem) {
    const item = RAIL_ITEMS.find((candidate) => candidate.id === activeRailItem);
    return <DrawerPlaceholder title={item?.label || 'Editor tools'} description={`${item?.label || 'Editor'} drawer shell`} />;
  }

  if (contextualDrawer?.kind === 'block') {
    return <DrawerPlaceholder title="Block Settings" description="Block settings placeholder" />;
  }
  if (contextualDrawer?.kind === 'module') {
    return <DrawerPlaceholder title="Module Settings" description="Module settings placeholder" />;
  }
  return <DrawerPlaceholder title="Page Settings" description="Page settings placeholder" />;
}

export default function EditorDrawerShell({
  activeRailItem = null,
  contextualDrawer = null,
  featureFlags = FEATURE_FLAGS,
  onRailItemClick,
  onCloseDrawer,
  drawerContent = null,
}) {
  const drawerOpen = !!activeRailItem || !!contextualDrawer;

  useEffect(() => {
    if (!drawerOpen) return undefined;
    function handleEscape(event) {
      if (event.key === 'Escape') onCloseDrawer();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [drawerOpen, onCloseDrawer]);

  const activeLabel = activeRailItem
    ? RAIL_ITEMS.find((item) => item.id === activeRailItem)?.label
    : contextualDrawer?.kind === 'block'
      ? 'Block Settings'
      : contextualDrawer?.kind === 'module'
        ? 'Module Settings'
        : 'Page Settings';

  return (
    <>
      <aside className="editor-icon-rail" aria-label="Editor tools">
        {visibleRailItems(featureFlags).map((item) => (
          <button
            type="button"
            key={item.id}
            className="editor-icon-rail__item"
            aria-label={item.label}
            aria-pressed={activeRailItem === item.id}
            title={item.label}
            onClick={() => onRailItemClick(item.id)}
          >
            <RailIcon itemId={item.id} />
            <span className="editor-icon-rail__label">{item.label}</span>
          </button>
        ))}
      </aside>

      {drawerOpen && (
        <>
          <button type="button" className="editor-drawer__backdrop" aria-label="Close drawer" onClick={onCloseDrawer} />
          <aside className="editor-drawer" role="dialog" aria-modal="false" aria-label={activeLabel}>
            <header className="editor-drawer__header">
              <h2>{activeLabel}</h2>
              <button type="button" className="btn-text editor-drawer__close" aria-label="Close drawer" onClick={onCloseDrawer}>×</button>
            </header>
            <div className="editor-drawer__body">
              {drawerContent || <DrawerContent activeRailItem={activeRailItem} contextualDrawer={contextualDrawer} />}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
