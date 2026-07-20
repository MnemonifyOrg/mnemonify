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

const TIMELINE_TOLERANCE_SECONDS = 0.25;
const registry = new Map(); // block_id -> { element, timelineTriggers, onTimeReached, ... }
const savedPositions = new Map(); // block_id -> seconds
let activeBlockId = null;

function resetFiredMarkers(entry, currentTime) {
  entry.firedMarkers = new Set(
    [...entry.firedMarkers].filter((triggerId) => {
      const marker = entry.timelineTriggers.find((trigger) => trigger.trigger_id === triggerId);
      return marker && marker.at_seconds <= currentTime + TIMELINE_TOLERANCE_SECONDS;
    })
  );
}

function handleTimeUpdate(blockId) {
  const entry = registry.get(blockId);
  if (!entry || entry.timelineTriggers.length === 0) return;

  const currentTime = Number(entry.element.currentTime) || 0;
  const previousTime = entry.lastTime;
  if (currentTime + TIMELINE_TOLERANCE_SECONDS < previousTime) {
    // A backward seek is a new opportunity to encounter markers that lie
    // after the new position. Forward branches remain consumed until the
    // learner seeks back before them.
    resetFiredMarkers(entry, currentTime);
  }
  entry.lastTime = currentTime;
  if (entry.element.paused || !entry.onTimeReached) return;

  const trigger = entry.timelineTriggers.find(
    (candidate) =>
      !entry.firedMarkers.has(candidate.trigger_id) &&
      previousTime < candidate.at_seconds &&
      currentTime + TIMELINE_TOLERANCE_SECONDS >= candidate.at_seconds
  );
  if (!trigger) return;

  entry.firedMarkers.add(trigger.trigger_id);
  entry.element.pause();
  entry.onTimeReached(trigger, currentTime);
}

export function register(blockId, element, { timelineTriggers = [], onTimeReached } = {}) {
  const entry = {
    element,
    timelineTriggers: [...timelineTriggers].sort((a, b) => a.at_seconds - b.at_seconds),
    onTimeReached,
    firedMarkers: new Set(),
    lastTime: Number(element.currentTime) || 0,
  };
  entry.handleTimeUpdate = () => handleTimeUpdate(blockId);
  element.addEventListener('timeupdate', entry.handleTimeUpdate);
  registry.set(blockId, entry);
}

export function unregister(blockId) {
  const entry = registry.get(blockId);
  if (entry) entry.element.removeEventListener('timeupdate', entry.handleTimeUpdate);
  registry.delete(blockId);
  if (activeBlockId === blockId) activeBlockId = null;
}

// Called from a media element's own 'play' event (Step 4: one active item
// at a time, across block types). Pauses whichever other registered
// element was playing; does nothing if that element already stopped on
// its own (e.g. reached the end) between events.
export function notifyPlaying(blockId) {
  if (activeBlockId && activeBlockId !== blockId) {
    const other = registry.get(activeBlockId)?.element;
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

export function getCurrentTime(blockId) {
  return Number(registry.get(blockId)?.element.currentTime) || 0;
}

export function seek(blockId, seconds) {
  const entry = registry.get(blockId);
  if (!entry) return;
  const nextTime = Math.max(0, Number(seconds) || 0);
  entry.element.currentTime = nextTime;
  entry.lastTime = nextTime;
  resetFiredMarkers(entry, nextTime);
}

export function play(blockId) {
  const element = registry.get(blockId)?.element;
  if (!element) return;
  const result = element.play();
  result?.catch?.(() => {});
}

export { TIMELINE_TOLERANCE_SECONDS };
