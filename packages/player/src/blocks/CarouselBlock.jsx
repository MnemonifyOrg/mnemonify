import { useState } from 'react';

// Player rendering for the carousel block (P1-8) -- previously
// unimplemented (see DECISIONS.md 2026-07-12: "Carousel player rendering
// is Phase 5 scope"), built now because the lightbox pan/zoom work needs
// something in the player to open a lightbox from. Content shape matches
// the editor's CarouselBlockEditor exactly: `{ asset_ids: [...] }`,
// resolved against the course's shared `assets` array (captions live on
// the asset itself, same as a standalone image block).
export default function CarouselBlock({ block, assets, onOpenModal, onTrigger }) {
  const assetIds = block.content.asset_ids || [];
  const images = assetIds.map((id) => assets.find((a) => a.asset_id === id)).filter(Boolean);
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="block block-carousel block-carousel--empty">
        <div className="block-carousel__placeholder">No images in this carousel yet.</div>
      </div>
    );
  }

  const current = images[index];
  const resolvedSrc = current.src.startsWith('/') || current.src.startsWith('http') ? current.src : `/${current.src}`;
  const hasMultiple = images.length > 1;

  function goTo(newIndex) {
    setIndex(((newIndex % images.length) + images.length) % images.length);
  }

  function openLightbox() {
    onOpenModal?.({
      type: 'image',
      images,
      index,
      ariaLabel: current.alt || current.caption || 'Image',
    });
    // onClick (Phase 4 Part 2 Step 3) -- same rationale as ImageBlock's
    // onClick: exposes the moment the lightbox opens as a trigger hook.
    onTrigger?.(block, 'onClick');
  }

  return (
    <div className="block block-carousel">
      <div className="block-carousel__viewport">
        {hasMultiple && (
          <button type="button" className="block-carousel__nav block-carousel__nav--prev" onClick={() => goTo(index - 1)} aria-label="Previous image">
            ‹
          </button>
        )}
        <button
          type="button"
          className="block-carousel__image-button"
          onClick={openLightbox}
          aria-label={`Open ${current.alt || 'image'} enlarged`}
        >
          <img src={resolvedSrc} alt={current.alt} />
        </button>
        {hasMultiple && (
          <button type="button" className="block-carousel__nav block-carousel__nav--next" onClick={() => goTo(index + 1)} aria-label="Next image">
            ›
          </button>
        )}
      </div>

      {current.caption && <p className="block-carousel__caption">{current.caption}</p>}

      {hasMultiple && (
        <div className="block-carousel__dots" role="tablist" aria-label="Carousel image selector">
          {images.map((img, i) => (
            <button
              key={img.asset_id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to image ${i + 1} of ${images.length}`}
              className="block-carousel__dot"
              data-active={i === index ? 'true' : 'false'}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
