import { useEffect, useRef, useState } from 'react';
import { captureRichTextSelection, normalizeExternalHref } from '../lib/richText.js';

export default function LinkPicker({ fieldRef, selectionRef, value = '', onApply, onRemove }) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(value || '');

  useEffect(() => {
    if (open) setUrl(value || '');
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutside(event) {
      if (!rootRef.current?.contains(event.target)) close();
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function commitField() {
    const field = fieldRef?.current;
    if (!field) return;
    field.focus();
    field.blur();
  }

  function close() {
    commitField();
    setOpen(false);
  }

  function preserveSelection(event) {
    event.preventDefault();
    captureRichTextSelection(fieldRef?.current, selectionRef);
  }

  function openPicker() {
    captureRichTextSelection(fieldRef?.current, selectionRef);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function apply() {
    const normalized = normalizeExternalHref(url);
    if (!normalized) return;
    onApply(normalized);
    close();
  }

  function remove() {
    onRemove?.();
    close();
  }

  return (
    <div ref={rootRef} className="rich-text-link-picker">
      <button
        type="button"
        className={value ? 'btn-text rich-text-toolbar__button is-active' : 'btn-text rich-text-toolbar__button'}
        aria-label={value ? 'Edit link' : 'Insert link'}
        aria-expanded={open}
        title={value ? 'Edit link' : 'Insert link'}
        onMouseDown={preserveSelection}
        onClick={openPicker}
      >
        ↗
      </button>
      {open && (
        <div className="rich-text-link-picker__popover" role="dialog" aria-label="Link settings">
          <label htmlFor="rich-text-link-url">External URL</label>
          <input
            ref={inputRef}
            id="rich-text-link-url"
            className="input"
            type="url"
            value={url}
            placeholder="https://example.com"
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); apply(); } }}
          />
          <div className="rich-text-link-picker__actions">
            <button type="button" className="btn btn-primary" disabled={!normalizeExternalHref(url)} onClick={apply}>Apply</button>
            {value && <button type="button" className="btn-text settings-panel__danger-action" onClick={remove}>Remove</button>}
          </div>
        </div>
      )}
    </div>
  );
}
