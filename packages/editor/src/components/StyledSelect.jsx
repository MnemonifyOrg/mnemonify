import { useEffect, useId, useRef, useState } from 'react';
import { getNextOptionIndex, getOptionIndex } from '../lib/styledControls.js';

export default function StyledSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select…',
  ariaLabel,
  className = '',
  disabled = false,
  title,
  onClick,
}) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() => getOptionIndex(options, value));
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (open) setHighlightedIndex(getOptionIndex(options, value));
  }, [open, value, options]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function choose(option) {
    onChange?.(option.value);
    close();
  }

  function handleTriggerKeyDown(event) {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (!open) {
        setOpen(true);
        setHighlightedIndex(getOptionIndex(options, value));
      } else {
        setHighlightedIndex((current) => getNextOptionIndex(options.length, current, direction));
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (options[highlightedIndex]) {
        choose(options[highlightedIndex]);
      }
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  }

  return (
    <div ref={rootRef} className={`styled-select ${className}`.trim()} onClick={onClick}>
      <button
        ref={triggerRef}
        type="button"
        className="styled-select__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        title={title}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="styled-select__value">{selectedOption?.label || placeholder}</span>
        <span className="styled-select__chevron" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div id={listboxId} className="styled-select__popover" role="listbox" aria-label={ariaLabel || 'Options'}>
          {options.length === 0 ? (
            <span className="styled-select__empty">No options available</span>
          ) : options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={index === highlightedIndex ? 'styled-select__option styled-select__option--highlighted' : 'styled-select__option'}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
