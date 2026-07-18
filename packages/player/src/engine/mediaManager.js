// Media manager (ARCHITECTURE.md Section 6, Phase 4 Part 3): one active
// media item at a time, across the whole page, across block types. A plain
// module-level singleton rather than a React context -- the player only
// ever runs one instance at a time (no multi-player-per-page case exists
// anywhere in this codebase), so module scope is sufficient and avoids
// threading a context provider through every block for a concern this
// simple. VideoBlock/AudioBlock are the only callers.
//
// Position memory (Step 5, container-aware pause/resume) is keyed by
// block_id and lives here rather than in component state specifically
// because it must survive the component's own unmount: accordion/tabs
// (Phase 3.5) render their body_blocks conditionally -- closing an
// accordion item or switching away from a tab actually UNMOUNTS the nested
// VideoBlock/AudioBlock instance (verified by reading AccordionBlock.jsx/
// TabsBlock.jsx: `{isOpen && (...)}` / `if (activeIndex !== index) return
// null`), which is what stops playback (removing a playing media element
// from the DOM halts it) -- so "hook into onOpen/onClose" is satisfied by
// hooking into the exact same mount/unmount lifecycle that onOpen/onClose
// already drive, rather than adding a second, parallel notification path
// into a system that doesn't carry per-nested-block granularity anyway
// (the accordion's onOpen/onClose triggers fire on the accordion block as
// a whole, not "this specific item's video"). See DECISIONS.md.

const registry = new Map(); // block_id -> HTMLMediaElement
const savedPositions = new Map(); // block_id -> seconds
let activeBlockId = null;

export function register(blockId, element) {
  registry.set(blockId, element);
}

export function unregister(blockId) {
  registry.delete(blockId);
  if (activeBlockId === blockId) activeBlockId = null;
}

// Called from a media element's own 'play' event (Step 4: one active item
// at a time, across block types). Pauses whichever other registered
// element was playing; does nothing if that element already stopped on
// its own (e.g. reached the end) between events.
export function notifyPlaying(blockId) {
  if (activeBlockId && activeBlockId !== blockId) {
    const other = registry.get(activeBlockId);
    if (other && !other.paused) other.pause();
  }
  activeBlockId = blockId;
}

// Called from a media element's own 'pause'/'ended' event, and from
// unregister() defensively (a container closing while its media was mid-
// play may remove the element before a 'pause' event has a chance to
// fire in every browser).
export function notifyStopped(blockId) {
  if (activeBlockId === blockId) activeBlockId = null;
}

export function savePosition(blockId, time) {
  savedPositions.set(blockId, time);
}

export function getSavedPosition(blockId) {
  return savedPositions.get(blockId) || 0;
}
