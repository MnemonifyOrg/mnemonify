import { useEffect, useMemo, useRef, useState } from 'react';
import { getBlockTypesByCategory } from '@mnemonify/schema/block-registry.js';
import { BLOCK_ICON_PATHS, filterBlockDefinitions, firstMatchingBlockType } from '../lib/blockPicker.js';

function BlockTypeIcon({ type }) {
  const paths = BLOCK_ICON_PATHS[type] || ['M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z'];
  return (
    <svg className="block-picker-grid__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((path, index) => <path key={`${type}-${index}`} d={path} />)}
    </svg>
  );
}

// Grouped by category (Phase 4.5b) -- reads packages/schema/block-registry.js
// directly rather than a flat hardcoded list, so a new block type appearing
// in the registry shows up here, correctly grouped, with no picker-specific
// edit required. See DECISIONS.md.
export default function BlockPickerModal({ onPick, onClose }) {
  const grouped = useMemo(() => getBlockTypesByCategory(), []);
  const searchRef = useRef(null);
  const [query, setQuery] = useState('');
  const filteredGrouped = useMemo(() => filterBlockDefinitions(grouped, query), [grouped, query]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  function handleSearchKeyDown(event) {
    if (event.key !== 'Enter') return;
    const firstMatch = firstMatchingBlockType(grouped, query);
    if (!firstMatch) return;
    event.preventDefault();
    onPick(firstMatch);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Add a block</h2>
        <div className="block-picker-search">
          <label className="sr-only" htmlFor="block-picker-search-input">Search block types</label>
          <input
            ref={searchRef}
            id="block-picker-search-input"
            className="block-picker-search__input"
            type="search"
            value={query}
            placeholder="Search block types…"
            autoComplete="off"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        {Object.entries(filteredGrouped).map(([category, defs]) => (
          <div className="block-picker-category" key={category}>
            <h3 className="block-picker-category__title">{category}</h3>
            <div className="block-picker-grid">
              {defs.map((def) => (
                <button type="button" key={def.type} className="block-picker-grid__item card" onClick={() => onPick(def.type)}>
                  <BlockTypeIcon type={def.type} />
                  <span>{def.displayName}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(filteredGrouped).length === 0 && <p className="block-picker-empty">No block types match your search.</p>}
        <button className="btn-text modal-close" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
