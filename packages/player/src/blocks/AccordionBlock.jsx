import { useState } from 'react';
import BlockRenderer from './BlockRenderer.jsx';
import RichText from './RichText.jsx';

export default function AccordionBlock({ block, assets, onTrigger, onOpenModal, blockVisibility, variables }) {
  const [openIndex, setOpenIndex] = useState(null);

  function toggle(index) {
    const isOpening = openIndex !== index;
    setOpenIndex(isOpening ? index : null);
    if (isOpening) {
      onTrigger(block, 'onOpen');
    } else {
      onTrigger(block, 'onClose');
    }
  }

  return (
    <div className="block block-accordion">
      {block.content.items.map((item, index) => {
        const panelId = `${block.block_id}-panel-${index}`;
        const triggerId = `${block.block_id}-trigger-${index}`;
        const isOpen = openIndex === index;
        return (
          <div className="accordion-item" key={index}>
            <h3 style={{ margin: 0 }}>
              <button
                type="button"
                id={triggerId}
                className="accordion-item__trigger"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
              >
                <span><RichText value={item.title} /></span>
                <span className="accordion-item__icon" aria-hidden="true">▾</span>
              </button>
            </h3>
            {isOpen && (
              <div className="accordion-item__panel" id={panelId} role="region" aria-labelledby={triggerId}>
                {(item.body_blocks || []).map((childBlock) => (
                  <BlockRenderer
                    key={childBlock.block_id}
                    block={childBlock}
                    assets={assets}
                    onTrigger={onTrigger}
                    onOpenModal={onOpenModal}
                    blockVisibility={blockVisibility}
                    variables={variables}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
