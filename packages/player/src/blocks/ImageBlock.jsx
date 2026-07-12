export default function ImageBlock({ block, assets }) {
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
  return (
    <figure className="block block-image">
      <img src={resolvedSrc} alt={asset.alt} />
      {asset.caption && <figcaption>{asset.caption}</figcaption>}
    </figure>
  );
}
