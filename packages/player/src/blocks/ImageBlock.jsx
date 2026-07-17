// Percentage of the block's available container width, not pixels and
// not freeform drag-resize -- keeps images responsive and stacking
// correctly with the no-freeform-canvas rule. See DECISIONS.md.
const WIDTH_PRESET_PCT = { small: 25, medium: 50, large: 75, full: 100 };
const ALIGN_ITEMS = { left: 'flex-start', center: 'center', right: 'flex-end' };

export default function ImageBlock({ block, assets, onOpenModal }) {
  const asset = assets.find((a) => a.asset_id === block.content.asset_id);
  // Renders a placeholder rather than nothing (or crashing) when
  // asset_id is null/missing/unresolved -- e.g. an image block whose
  // upload never completed. See DECISIONS.md.
  if (!asset) {
    return (
      <figure className="block block-image block-image--missing">
        <div className="block-image__placeholder">Image unavailable</div>
      </figure>
    );
  }
  const resolvedSrc = asset.src.startsWith('/') || asset.src.startsWith('http') ? asset.src : `/${asset.src}`;
  const widthPreset = block.content.width_preset || 'medium';
  const isFull = widthPreset === 'full';
  const alignment = isFull ? 'center' : block.content.alignment || 'center';
  const pct = WIDTH_PRESET_PCT[widthPreset] ?? WIDTH_PRESET_PCT.medium;

  function openLightbox() {
    onOpenModal?.({ type: 'image', asset, ariaLabel: asset.alt || asset.caption || 'Image' });
  }

  return (
    <figure className="block block-image" style={{ alignItems: ALIGN_ITEMS[alignment], '--image-width-pct': `${pct}%` }}>
      <button type="button" className="block-image__open-button" onClick={openLightbox} aria-label={`Open ${asset.alt || 'image'} enlarged`}>
        <img src={resolvedSrc} alt={asset.alt} />
      </button>
      {asset.caption && <figcaption>{asset.caption}</figcaption>}
    </figure>
  );
}
