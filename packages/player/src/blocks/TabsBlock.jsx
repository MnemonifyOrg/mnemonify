import { useState } from 'react';
import BlockRenderer from './BlockRenderer.jsx';
import RichText from './RichText.jsx';

export default function TabsBlock({ block, assets, onTrigger }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const items = block.content.items;

  function handleKeyDown(e, index) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveIndex((index + 1) % items.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIndex((index - 1 + items.length) % items.length);
    }
  }

  return (
    <div className="block block-tabs">
      <div className="tabs__list" role="tablist">
        {items.map((item, index) => {
          const tabId = `${block.block_id}-tab-${index}`;
          const panelId = `${block.block_id}-tabpanel-${index}`;
          return (
            <button
              key={index}
              type="button"
              id={tabId}
              role="tab"
              className="tabs__tab"
              aria-selected={activeIndex === index}
              aria-controls={panelId}
              tabIndex={activeIndex === index ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <RichText value={item.label} />
            </button>
          );
        })}
      </div>
      {items.map((item, index) => {
        const tabId = `${block.block_id}-tab-${index}`;
        const panelId = `${block.block_id}-tabpanel-${index}`;
        if (activeIndex !== index) return null;
        return (
          <div key={index} className="tabs__panel" id={panelId} role="tabpanel" aria-labelledby={tabId}>
            {(item.body_blocks || []).map((childBlock) => (
              <BlockRenderer key={childBlock.block_id} block={childBlock} assets={assets} onTrigger={onTrigger} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
