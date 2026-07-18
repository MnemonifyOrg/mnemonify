import BlockRenderer from './BlockRenderer.jsx';

// Desktop: CSS Grid, columns sized by the author's split value (ARCHITECTURE.md
// 3.6). Below 768px the grid collapses to a single column and the left slot
// stacks above the right slot (player.css), matching print/PDF rendering,
// which uses the same single-column layout unconditionally.
export default function TwoColumnBlock({ block, assets, onTrigger, onOpenModal, blockVisibility }) {
  const split = block.layout?.split ?? 40;

  return (
    <div
      className="block block-two-column"
      style={{ '--two-column-split': `${split}%`, '--two-column-split-complement': `${100 - split}%` }}
    >
      <div className="block-two-column__slot block-two-column__slot--left">
        {block.left && (
          <BlockRenderer block={block.left} assets={assets} onTrigger={onTrigger} onOpenModal={onOpenModal} blockVisibility={blockVisibility} />
        )}
      </div>
      <div className="block-two-column__slot block-two-column__slot--right">
        {block.right && (
          <BlockRenderer block={block.right} assets={assets} onTrigger={onTrigger} onOpenModal={onOpenModal} blockVisibility={blockVisibility} />
        )}
      </div>
    </div>
  );
}
