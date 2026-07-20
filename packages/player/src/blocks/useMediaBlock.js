import { useEffect, useRef, useState } from 'react';
import * as mediaManager from '../engine/mediaManager.js';
import { track } from '../engine/analytics.js';

// Shared by VideoBlock.jsx and AudioBlock.jsx -- registration, container-
// aware position save/restore, one-active-media notifications, and the
// onComplete trigger are identical for both; only the scroll-pause
// behavior (AudioBlock only, ARCHITECTURE.md 6) and markup differ.
export function useMediaBlock(block, onTrigger, onTimeReached) {
  const mediaRef = useRef(null);
  const [muted, setMuted] = useState(!!block.content.autoplay);

  function currentTimestamp() {
    const value = mediaRef.current?.currentTime;
    return Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
  }

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    mediaManager.register(block.block_id, el, {
      timelineTriggers: block.type === 'video' ? block.timeline_triggers || [] : [],
      // mediaManager reports (trigger, timestamp); App's timeline handler
      // also needs the owning video block to run its triggers and resolve
      // timestamp actions. Keep that adaptation at the media-block boundary
      // so the manager stays reusable and block-agnostic.
      onTimeReached:
        block.type === 'video' && onTimeReached
          ? (trigger, timestamp) => onTimeReached(block, trigger, timestamp)
          : undefined,
    });

    const savedTime = mediaManager.getSavedPosition(block.block_id);
    if (savedTime > 0) {
      const applySavedTime = () => {
        el.currentTime = savedTime;
      };
      // readyState >= 1 (HAVE_METADATA) means duration/seekable range are
      // already known and currentTime can be set immediately; otherwise
      // wait for the element to reach that point itself.
      if (el.readyState >= 1) applySavedTime();
      else el.addEventListener('loadedmetadata', applySavedTime, { once: true });
    }

    // Cleanup runs with the DOM node still valid (React removes it only
    // after effect cleanups complete), so el.currentTime is still readable
    // here -- this is what makes container-close position memory (Step 5)
    // work at all, since accordion/tabs unmount their closed content
    // rather than hiding it (see mediaManager.js header comment).
    return () => {
      if (el.currentTime > 0 && !el.ended) {
        track('media_dropoff', { blockId: block.block_id, payload: { timestamp: Number(el.currentTime.toFixed(3)) } });
      }
      if (!el.paused) el.pause();
      mediaManager.savePosition(block.block_id, el.currentTime);
      mediaManager.unregister(block.block_id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePlay() {
    mediaManager.notifyPlaying(block.block_id);
    track('media_play', { blockId: block.block_id, payload: { timestamp: currentTimestamp() } });
  }
  function handlePause() {
    mediaManager.notifyStopped(block.block_id);
    track('media_pause', { blockId: block.block_id, payload: { timestamp: currentTimestamp() } });
  }
  function handleSeeked() {
    track('media_scrub', { blockId: block.block_id, payload: { timestamp: currentTimestamp() } });
  }
  function handleEnded() {
    mediaManager.notifyStopped(block.block_id);
    track('media_complete', { blockId: block.block_id, payload: { timestamp: currentTimestamp() } });
    onTrigger?.(block, 'onComplete');
  }
  function unmute() {
    setMuted(false);
    if (mediaRef.current) mediaRef.current.muted = false;
  }

  return { mediaRef, muted, handlePlay, handlePause, handleSeeked, handleEnded, unmute };
}
