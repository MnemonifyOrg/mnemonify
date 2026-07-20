import { useEffect, useRef, useState } from 'react';

// Phase 4.6 Step 4: the top bar's overflow menu for less-frequent actions
// (Media Library, Save as Template, Export Word) that don't need to be
// always-visible buttons. A small, self-contained dropdown rather than a
// new dependency -- this codebase has no menu/dropdown component yet
// (confirmed by grep before building this), and the interaction is simple
// enough not to need one: a button that reveals a list, closes on an
// outside click or Escape, keyboard-operable via native button semantics.
export default function MoreToolsMenu({ items, dataTour }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const visibleItems = items.filter(Boolean);
  if (visibleItems.length === 0) return null;

  return (
    <div className="more-tools-menu" ref={containerRef}>
      <button
        type="button"
        className="btn"
        data-tour={dataTour}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        More tools ▾
      </button>
      {open && (
        <ul className="more-tools-menu__list" role="menu">
          {visibleItems.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className="more-tools-menu__item"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
