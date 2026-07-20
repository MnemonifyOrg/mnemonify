import { useId, useState } from 'react';

// Phase 4.6 Step 7: the audit's "circle i" pattern -- a small, accessible
// info icon placed next to a domain-specific or advanced label, never
// next to a universally-understood control (Undo, Save, Preview get none
// -- see each call site). Deliberately does NOT rename the label it sits
// beside; the visible label text is untouched everywhere this is used.
//
// Accessibility (non-negotiable per this task's own requirements):
// - the trigger is a real <button>, so it's in the natural tab order and
//   Enter/Space activate it via native button semantics, no custom
//   keydown handling needed for that part;
// - onFocus/onBlur show and hide the tooltip for keyboard users exactly
//   the same way onMouseEnter/onMouseLeave do for pointer users, rather
//   than being a hover-only affordance;
// - the tooltip content has role="tooltip" and the trigger points at it
//   via aria-describedby, so a screen reader announces the explanation
//   when the trigger receives focus;
// - it's a small inline bubble positioned near the trigger, not a modal --
//   it never traps focus, and Escape (or simply moving focus/pointer
//   away) closes it without needing to "escape" anything blocking.
export default function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="info-tooltip">
      <button
        type="button"
        className="info-tooltip__trigger"
        aria-describedby={open ? id : undefined}
        aria-label="More information"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        ⓘ
      </button>
      {open && (
        <span role="tooltip" id={id} className="info-tooltip__bubble">
          {text}
        </span>
      )}
    </span>
  );
}
