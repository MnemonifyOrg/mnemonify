import { useEffect, useRef, useState } from 'react';
import { useImageZoom, computeMaxZoom, MIN_ZOOM, DEFAULT_MAX_ZOOM } from '../../lib/imageZoom.js';

// payload: { type: 'image', asset, images?: [asset...], index?: number }
// `images`/`index` are only present when opened from a carousel; a
// standalone image block passes just `asset`.
export default function ImagePayload({ payload }) {
  const images = payload.images && payload.images.length ? payload.images : [payload.asset];
  const [index, setIndex] = useState(payload.index ?? 0);
  const asset = images[index];
  const isCarousel = images.length > 1;

  const [maxZoom, setMaxZoom] = useState(DEFAULT_MAX_ZOOM);
  const zoom = useImageZoom({ maxZoom });

  // Navigating to a different image (or reopening the lightbox fresh)
  // always resets zoom/pan to 100% -- required behavior, not just a
  // side effect of remounting, since `index` changes without unmounting.
  useEffect(() => {
    zoom.reset();
    setMaxZoom(DEFAULT_MAX_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.asset_id]);

  function handleImgLoad(e) {
    const displayedWidth = e.currentTarget.getBoundingClientRect().width;
    setMaxZoom(computeMaxZoom(e.currentTarget.naturalWidth, displayedWidth));
  }

  function goTo(newIndex) {
    setIndex(((newIndex % images.length) + images.length) % images.length);
  }

  function handleKeyDown(e) {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoom.zoomIn();
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      zoom.zoomOut();
    } else if (isCarousel && e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    } else if (isCarousel && e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    }
  }

  if (!asset) return null;
  const resolvedSrc = asset.src.startsWith('/') || asset.src.startsWith('http') ? asset.src : `/${asset.src}`;
  const zoomPct = Math.round(zoom.scale * 100);

  return (
    <div className="lightbox">
      <div className="lightbox__stage">
        {isCarousel && (
          <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => goTo(index - 1)} aria-label="Previous image">
            ‹
          </button>
        )}

        <div
          className="lightbox__viewport"
          ref={zoom.containerRef}
          onWheel={zoom.handleWheel}
          onPointerDown={zoom.handlePointerDown}
          onPointerMove={zoom.handlePointerMove}
          onPointerUp={zoom.handlePointerUp}
          onPointerCancel={zoom.handlePointerCancel}
          onDoubleClick={zoom.reset}
          data-zoomed={zoom.scale > MIN_ZOOM ? 'true' : 'false'}
          data-panning={zoom.isPanning ? 'true' : 'false'}
        >
          <img
            src={resolvedSrc}
            alt={asset.alt}
            className="lightbox__image"
            tabIndex={0}
            onLoad={handleImgLoad}
            onKeyDown={handleKeyDown}
            style={{ transform: `translate(${zoom.pan.x}px, ${zoom.pan.y}px) scale(${zoom.scale})` }}
            draggable={false}
          />
        </div>

        {isCarousel && (
          <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => goTo(index + 1)} aria-label="Next image">
            ›
          </button>
        )}
      </div>

      <div className="lightbox__toolbar">
        <button type="button" className="lightbox__zoom-btn" onClick={zoom.zoomOut} disabled={zoom.scale <= MIN_ZOOM} aria-label="Zoom out">
          −
        </button>
        <span className="lightbox__zoom-level" aria-live="polite">
          {zoomPct}%
        </span>
        <button type="button" className="lightbox__zoom-btn" onClick={zoom.zoomIn} disabled={zoom.scale >= maxZoom} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="lightbox__reset" onClick={zoom.reset} disabled={zoom.scale === MIN_ZOOM && zoom.pan.x === 0 && zoom.pan.y === 0}>
          Reset zoom
        </button>
      </div>

      {asset.caption && <p className="lightbox__caption">{asset.caption}</p>}
      {isCarousel && (
        <p className="lightbox__counter" aria-live="polite">
          Image {index + 1} of {images.length}
        </p>
      )}
    </div>
  );
}
