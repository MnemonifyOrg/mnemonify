import { useEffect, useRef } from 'react';
import { sanitizeRichHtml, RICH_TEXT_TAGS } from '../../lib/richText.js';

// Shared contentEditable field for every block editor that stores
// inline-formatted content (bold/italic/underline/superscript/subscript,
// line breaks). Captures and re-renders sanitized HTML rather than plain
// textContent -- textContent silently destroys formatting AND collapses
// line breaks (it concatenates text nodes with no separator, not even for
// <div>/<br> boundaries). See packages/editor/src/lib/richText.js and
// DECISIONS.md.
//
// Resyncs the DOM from `value` in a `useEffect` keyed on the *sanitized
// value itself* (not on a block/row identity), not just on mount. Since
// nothing else re-renders this field's content on every keystroke (commits
// only happen on blur), this only actually re-fires when the stored value
// changes for a real external reason -- an undo/redo, a page switch, or
// this field's own blur-commit landing back through props -- and in every
// one of those cases the field is guaranteed not focused, so resetting
// innerHTML is safe and never disrupts an active cursor. This also fixes
// the separate "contentEditable doesn't visually refresh after Undo/Redo"
// gap flagged as pre-existing in the Phase 3.5 Part 2 report (DECISIONS.md
// 2026-07-16): that gap existed specifically because the old sync effect
// was keyed on `block.block_id` only, so it never re-ran when undo/redo
// changed a field's value without changing which block it belonged to.
export default function EditableRichField({
  value,
  onCommit,
  className,
  placeholder,
  fieldRef,
  onBlur,
  onFocus,
  Tag = 'div',
  allowedTags = RICH_TEXT_TAGS,
  ...rest
}) {
  const localRef = useRef(null);
  const initialHtml = sanitizeRichHtml(value || '', allowedTags);

  useEffect(() => {
    if (localRef.current) localRef.current.innerHTML = initialHtml;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml]);

  function setRef(el) {
    localRef.current = el;
    if (typeof fieldRef === 'function') fieldRef(el);
    else if (fieldRef) fieldRef.current = el;
  }

  function handleBlur(e) {
    const html = sanitizeRichHtml(e.currentTarget.innerHTML, allowedTags);
    if (html !== initialHtml) onCommit(html);
    onBlur?.(e);
  }

  return (
    <Tag
      ref={setRef}
      className={className}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={handleBlur}
      onFocus={onFocus}
      {...rest}
    />
  );
}
