import { useEffect, useRef, useState } from 'react';
import { PUBLISH_MENU_ITEMS } from '../lib/publishMenu.js';

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function PublishSplitButton({ onPublish, onSelect, publishing, published }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="course-editor__publish-split" ref={containerRef}>
      <button type="button" className="btn btn-primary course-editor__publish-button" onClick={onPublish} disabled={publishing}>
        {publishing ? 'Publishing...' : 'Publish'}
      </button>
      <button
        type="button"
        className="btn btn-primary course-editor__publish-split-toggle"
        aria-label="More publish options"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        disabled={publishing}
      >
        <ChevronDownIcon />
      </button>
      {open && (
        <div className="course-editor__publish-menu" role="menu" aria-label="Publish options">
          {PUBLISH_MENU_ITEMS.map((item) => {
            const unavailable = item.requiresPublished && !published;
            return (
              <button
                type="button"
                role="menuitem"
                className="course-editor__publish-menu-item"
                key={item.id}
                disabled={unavailable}
                title={unavailable ? 'Publish first to enable this option' : undefined}
                onClick={() => {
                  setOpen(false);
                  onSelect(item.id);
                }}
              >
                <span>{item.label}</span>
                <span className="course-editor__publish-menu-description">
                  {unavailable ? 'Publish first to enable' : item.description}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
