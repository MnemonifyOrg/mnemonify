function RichTextSegment({ segment, assets, onOpenLightbox }) {
  if (segment.t === 'asset_link') {
    const asset = assets.find((a) => a.asset_id === segment.asset_id);
    return (
      <button
        type="button"
        className="block-text__asset-link"
        onClick={() => onOpenLightbox && onOpenLightbox(asset)}
      >
        {segment.v}
      </button>
    );
  }
  return <>{segment.v}</>;
}

export default function TextBlock({ block, assets }) {
  return (
    <div className="block block-text">
      <p>
        {block.content.rich_text.map((segment, i) => (
          <RichTextSegment key={i} segment={segment} assets={assets} />
        ))}
      </p>
    </div>
  );
}
