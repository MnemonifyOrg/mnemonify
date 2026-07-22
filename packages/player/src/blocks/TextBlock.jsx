import RichText from './RichText.jsx';

export default function TextBlock({ block, assets, onOpenModal, variables }) {
  return (
    <div className="block block-text">
      <p>
        <RichText value={block.content.rich_text} assets={assets} onOpenModal={onOpenModal} variables={variables} />
      </p>
    </div>
  );
}
