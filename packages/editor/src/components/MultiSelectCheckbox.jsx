import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { filterMultiSelectOptions, selectedCountLabel, toggleSelectedValue } from '../lib/styledControls.js';

export default function MultiSelectCheckbox({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select options…',
  ariaLabel,
  className = '',
  disabled = false,
}) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxId = useId();
  const searchId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const selected = new Set(value || []);
  const filteredOptions = useMemo(() => filterMultiSelectOptions(options, query), [options, query]);
  const summary = selected.size === 0 ? placeholder : selectedCountLabel(selected.size);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    setHighlightedIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) setHighlightedIndex(Math.max(filteredOptions.length - 1, 0));
  }, [filteredOptions.length, highlightedIndex]);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function toggle(optionValue) {
    onChange?.(toggleSelectedValue(value, optionValue));
  }

  function handleTriggerKeyDown(event) {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedIndex(0);
        return;
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setHighlightedIndex((current) => {
        if (filteredOptions.length === 0) return 0;
        const next = current + direction;
        if (next < 0) return filteredOptions.length - 1;
        if (next >= filteredOptions.length) return 0;
        return next;
      });
      return;
    }
    if ((event.key === ' ' || event.key === 'Enter') && !open) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if ((event.key === ' ' || event.key === 'Enter') && open) {
      event.preventDefault();
      if (filteredOptions[highlightedIndex]) toggle(filteredOptions[highlightedIndex].value);
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  }

  return (
    <div ref={rootRef} className={`multi-select-checkbox ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className="multi-select-checkbox__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="multi-select-checkbox__value">{summary}</span>
        <span className="multi-select-checkbox__chevron" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div
          id={listboxId}
          className="multi-select-checkbox__popover"
          role="listbox"
          aria-label={ariaLabel || 'Options'}
          aria-multiselectable="true"
        >
          {options.length > 8 && (
            <div className="multi-select-checkbox__search">
              <label htmlFor={searchId}>Filter options</label>
              <input
                id={searchId}
                className="input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    close();
                  }
                }}
                placeholder="Search options…"
              />
            </div>
          )}
          <div className="multi-select-checkbox__options">
            {filteredOptions.length === 0 ? (
              <span className="multi-select-checkbox__empty">No matching options</span>
            ) : filteredOptions.map((option, index) => {
              const isSelected = selected.has(option.value);
              return (
                <label
                  key={option.value}
                  className={index === highlightedIndex ? 'multi-select-checkbox__option multi-select-checkbox__option--highlighted' : 'multi-select-checkbox__option'}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(option.value)}
                    aria-label={option.label}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
