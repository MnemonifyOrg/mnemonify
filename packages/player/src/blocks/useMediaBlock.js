import { useEffect, useRef, useState } from 'react';
import * as mediaManager from '../engine/mediaManager.js';

// Shared by VideoBlock.jsx and AudioBlock.jsx -- registration, container-
// aware position save/restore, one-active-media notifications, and the
// onComplete trigger are identical for both; only the scroll-pause
// behavior (AudioBlock only, ARCHITECTURE.md 6) and markup differ.
export function useMediaBlock(block, onTrigger) {
  const mediaRef = useRef(null);
  const [muted, setMuted] = useState(!!block.content.autoplay);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    mediaManager.register(block.block_id, el);

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
      if (!el.paused) el.pause();
      mediaManager.savePosition(block.block_id, el.currentTime);
      mediaManager.unregister(block.block_id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePlay() {
    mediaManager.notifyPlaying(block.block_id);
  }
  function handlePause() {
    mediaManager.notifyStopped(block.block_id);
  }
  function handleEnded() {
    mediaManager.notifyStopped(block.block_id);
    onTrigger?.(block, 'onComplete');
  }
  function unmute() {
    setMuted(false);
    if (mediaRef.current) mediaRef.current.muted = false;
  }

  return { mediaRef, muted, handlePlay, handlePause, handleEnded, unmute };
}
