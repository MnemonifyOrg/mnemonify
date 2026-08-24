import { useEffect, useRef, useState } from 'react';
import { FEATURE_FLAGS } from '@mnemonify/schema/featureFlags.js';
import { visibleToolGroups } from '../lib/editorDrawer.js';

export default function ToolsMenu({ featureFlags = FEATURE_FLAGS, canEdit = true, onSelect }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const groups = visibleToolGroups(featureFlags, { canEdit });

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
    <div className="editor-tools-menu" ref={containerRef}>
      <button
        type="button"
        className="btn editor-tools-menu__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Tools <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="editor-tools-menu__list" role="menu" aria-label="Editor tools">
          {groups.map((group) => (
            <section className="editor-tools-menu__group" key={group.id}>
              <h3>{group.label}</h3>
              {group.items.map((item) => (
                <button
                  type="button"
                  role="menuitem"
                  className="editor-tools-menu__item"
                  key={item.id}
                  onClick={() => {
                    setOpen(false);
                    onSelect(item.id);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
