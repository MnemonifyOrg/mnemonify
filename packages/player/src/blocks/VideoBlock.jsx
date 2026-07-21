import { useMediaBlock } from './useMediaBlock.js';
import { TranscriptPanel, useCaptions } from './useCaptions.jsx';

// Minimal video block (Phase 4 Part 3 -- ARCHITECTURE.md Section 6). Native
// Native HTML5 controls and native caption track; captions/transcripts are
// fetched by asset_id so the player does not duplicate course JSON data.
export default function VideoBlock({ block, assets, onTrigger, onTimeReached }) {
  const asset = (assets || []).find((a) => a.asset_id === block.content.asset_id);
  const { caption, transcript } = useCaptions(asset?.asset_id);
  const { mediaRef, muted, handlePlay, handlePause, handleSeeked, handleEnded, unmute } = useMediaBlock(block, onTrigger, onTimeReached);

  if (!asset) {
    return (
      <div className="block block-video block-video--missing">
        <div className="block-video__placeholder">Video unavailable</div>
      </div>
    );
  }

  const resolvedSrc = asset.src.startsWith('/') || asset.src.startsWith('http') ? asset.src : `/${asset.src}`;
  const autoplay = !!block.content.autoplay;

  return (
    <div className="block block-video">
      <video
        ref={mediaRef}
        className="block-video__player"
        src={resolvedSrc}
        controls
        autoPlay={autoplay}
        // iOS-safe autoplay (ARCHITECTURE.md 6): always start muted when
        // autoplay is on, with a visible unmute button -- see DECISIONS.md
        // for why this simplified, platform-agnostic approach was chosen
        // over detecting iOS Safari specifically.
        muted={autoplay ? muted : undefined}
        loop={!!block.content.loop}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeked={handleSeeked}
        onEnded={handleEnded}
      >
        {caption && <track kind="captions" src={`/api/assets/${asset.asset_id}/captions/caption.vtt`} srcLang="en" label="English" />}
      </video>
      {autoplay && muted && (
        <button type="button" className="block-video__unmute" onClick={unmute}>
          🔇 Unmute
        </button>
      )}
      <TranscriptPanel transcript={transcript} />
    </div>
  );
}
