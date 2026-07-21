import { useEffect, useRef } from 'react';
import { useMediaBlock } from './useMediaBlock.js';
import { TranscriptPanel, useCaptions } from './useCaptions.jsx';

// Native HTML5 controls plus the Phase 5 transcript panel. Existing media
// manager behavior remains shared with VideoBlock.
export default function AudioBlock({ block, assets, onTrigger, printMode }) {
  const asset = (assets || []).find((a) => a.asset_id === block.content.asset_id);
  const { transcript } = useCaptions(asset?.asset_id);
  const { mediaRef, muted, handlePlay, handlePause, handleSeeked, handleEnded, unmute } = useMediaBlock(block, onTrigger);
  const containerRef = useRef(null);

  // Audio-only scroll-pause (ARCHITECTURE.md 6, Step 6): pause the instant
  // the block is fully out of view (threshold 0). Deliberately does not
  // resume on scroll-back -- position is preserved and the learner presses
  // play again themselves, same pattern as the container-close case in
  // useMediaBlock.js. Video blocks do NOT get this: a learner may
  // reasonably keep a video playing while scrolling past it, and
  // ARCHITECTURE.md 6 is explicit this behavior is audio-only.
  useEffect(() => {
    const container = containerRef.current;
    const el = mediaRef.current;
    if (!container || !el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !el.paused) el.pause();
      },
      { threshold: 0 }
    );
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!asset) {
    return (
      <div className="block block-audio block-audio--missing" ref={containerRef}>
        <div className="block-audio__placeholder">Audio unavailable</div>
      </div>
    );
  }

  const resolvedSrc = asset.src.startsWith('/') || asset.src.startsWith('http') ? asset.src : `/${asset.src}`;
  const autoplay = !!block.content.autoplay;

  return (
    <div className="block block-audio" ref={containerRef}>
      <audio
        ref={mediaRef}
        className="block-audio__player"
        src={resolvedSrc}
        controls
        autoPlay={autoplay}
        // iOS-safe autoplay -- see VideoBlock.jsx / DECISIONS.md for the
        // same always-muted-with-unmute-button rationale.
        muted={autoplay ? muted : undefined}
        loop={!!block.content.loop}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeked={handleSeeked}
        onEnded={handleEnded}
      />
      {autoplay && muted && (
        <button type="button" className="block-audio__unmute" onClick={unmute}>
          🔇 Unmute
        </button>
      )}
      {printMode && transcript?.content?.trim() && <div className="media-transcript media-transcript--print"><strong>Audio transcript:</strong><div className="media-transcript__content">{transcript.content}</div></div>}
      {!printMode && <TranscriptPanel transcript={transcript} />}
    </div>
  );
}
