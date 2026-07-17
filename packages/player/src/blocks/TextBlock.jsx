import RichText from './RichText.jsx';

function RichTextSegment({ segment, assets, onOpenModal }) {
  if (segment.t === 'asset_link') {
    const asset = assets.find((a) => a.asset_id === segment.asset_id);
    return (
      <button
        type="button"
        className="block-text__asset-link"
        tabIndex={0}
        onClick={() => asset && onOpenModal?.({ type: 'image', asset, ariaLabel: asset.alt || asset.caption || 'Image' })}
      >
        {segment.v}
      </button>
    );
  }
  if (segment.t === 'html') {
    return <RichText value={segment.v} />;
  }
  // Legacy plain-text segment saved before the rich-text fix -- no
  // formatting to interpret, rendered as-is.
  return <>{segment.v}</>;
}

export default function TextBlock({ block, assets, onOpenModal }) {
  return (
    <div className="block block-text">
      <p>
        {block.content.rich_text.map((segment, i) => (
          <RichTextSegment key={i} segment={segment} assets={assets} onOpenModal={onOpenModal} />
        ))}
      </p>
    </div>
  );
}
