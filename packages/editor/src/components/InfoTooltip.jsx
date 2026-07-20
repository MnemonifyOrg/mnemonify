import { useId, useLayoutEffect, useRef, useState } from 'react';

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
//
// Hotfix (post-Phase-4.6 QA): positioning is measured and clamped, not a
// hardcoded direction. An earlier fix anchored the bubble `right: 0`
// (extending leftward) to solve triggers overflowing the viewport's right
// edge -- but that's directional, not positional, so a trigger sitting
// near the LEFT side of the settings panel (e.g. "Variables") then
// overflowed the other way. A first pass at a binary left/right flip
// still wasn't enough: the settings panel is ~280px wide, narrower than
// the 240px bubble, so depending on exactly where a trigger sits neither
// pure "flush left" nor "flush right" placement fully fits -- confirmed
// live (getBoundingClientRect showed the bubble's text visibly clipped by
// the panel's own edge either way). Fixed with a small clamp: the bubble
// prefers sitting flush with the trigger's own edge (its natural spot),
// but gets shifted back only as far as needed to stay fully inside
// whichever container actually clips it -- the same "flip, then shift to
// fit" idea a full positioning library implements, sized down to what one
// small tooltip needs. Measured against the nearest actually-scrollable
// ancestor, not the raw viewport: `.settings-panel` sets `overflow-y:
// auto` without an explicit overflow-x, which per the CSS Overflow spec
// forces overflow-x to compute as `auto` too (confirmed live via
// getComputedStyle) -- so a bubble that fits the *viewport* can still get
// clipped/scrolled-away by the panel's own scroll box first. No
// positioning library is used: none of Popper/Floating UI/Tippy are
// present anywhere in this project's dependencies, and the measurement
// needed here is small enough that adding one would be more machinery
// than the problem calls for.
const EDGE_MARGIN = 16;
const VERTICAL_GAP = 6;

function getScrollParent(node) {
  if (!node || node === document.body || node === document.documentElement) return document.documentElement;
  const style = getComputedStyle(node);
  if (/(auto|scroll)/.test(style.overflowX) || /(auto|scroll)/.test(style.overflowY)) return node;
  return getScrollParent(node.parentElement);
}

function getBounds(node) {
  if (node === document.documentElement) {
    return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  }
  return node.getBoundingClientRect();
}

// Clamps an ideal start coordinate (the bubble's natural, trigger-flush
// position) so [start, start + size] stays within [boundsStart, boundsEnd]
// with a margin. If the bounds are narrower than the bubble itself, pins
// to the near edge as a best effort -- the CSS max-width safety net
// handles the rest.
function clamp(idealStart, size, boundsStart, boundsEnd) {
  const minStart = boundsStart + EDGE_MARGIN;
  const maxStart = boundsEnd - EDGE_MARGIN - size;
  if (maxStart < minStart) return minStart;
  return Math.min(Math.max(idealStart, minStart), maxStart);
}

export default function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState({ left: 0, top: VERTICAL_GAP });
  const wrapperRef = useRef(null);
  const bubbleRef = useRef(null);
  const id = useId();

  // Runs after the bubble is in the DOM but before the browser paints, so
  // the very first frame the author sees already has the corrected
  // position -- no flash of the wrong placement, no resize/scroll
  // listeners needed for a tooltip that's only open for a few seconds.
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current || !bubbleRef.current) return;
    const trigger = wrapperRef.current.getBoundingClientRect();
    const bubble = bubbleRef.current.getBoundingClientRect();
    const bounds = getBounds(getScrollParent(wrapperRef.current.parentElement));

    const clampedLeft = clamp(trigger.left, bubble.width, bounds.left, bounds.right);

    const idealTop = trigger.bottom + VERTICAL_GAP;
    const fitsBelow = idealTop + bubble.height <= bounds.bottom - EDGE_MARGIN;
    const top = fitsBelow ? idealTop : trigger.top - VERTICAL_GAP - bubble.height;

    setOffset({ left: clampedLeft - trigger.left, top: top - trigger.top });
  }, [open, text]);

  return (
    <span className="info-tooltip" ref={wrapperRef}>
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
        <span
          ref={bubbleRef}
          role="tooltip"
          id={id}
          className="info-tooltip__bubble"
          style={{ left: `${offset.left}px`, top: `${offset.top}px` }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
