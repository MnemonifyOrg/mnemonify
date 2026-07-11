export default function ImageBlock({ block, assets }) {
  const asset = assets.find((a) => a.asset_id === block.content.asset_id);
  if (!asset) return null;
  const resolvedSrc = asset.src.startsWith('/') || asset.src.startsWith('http') ? asset.src : `/${asset.src}`;
  return (
    <figure className="block block-image">
      <img src={resolvedSrc} alt={asset.alt} />
      {asset.caption && <figcaption>{asset.caption}</figcaption>}
    </figure>
  );
}
