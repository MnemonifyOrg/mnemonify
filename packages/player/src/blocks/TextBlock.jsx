import RichText from './RichText.jsx';

export default function TextBlock({ block, assets, onOpenModal, variables }) {
  return (
    <div className="block block-text">
      <div className="block-text__body">
        <RichText value={block.content.rich_text} assets={assets} onOpenModal={onOpenModal} variables={variables} />
      </div>
    </div>
  );
}
