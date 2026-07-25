export default function ButtonBlock({ block, onNavigate }) {
  const text = block.content?.text || 'Button';
  const targetPageId = block.content?.target_page_id;

  return (
    <div className="block block-button">
      <button
        type="button"
        className="player-button-block"
        disabled={!targetPageId || !onNavigate}
        onClick={() => targetPageId && onNavigate?.(targetPageId)}
      >
        {text}
      </button>
    </div>
  );
}

export function getButtonTarget(block) {
  return block?.content?.target_page_id || '';
}
