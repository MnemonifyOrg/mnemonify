import { useState } from 'react';
import BlockRenderer from './BlockRenderer.jsx';
import RichText from './RichText.jsx';

export default function TabsBlock({ block, assets, onTrigger, onOpenModal, blockVisibility }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const items = block.content.items;

  // onOpen/onClose (ARCHITECTURE.md 4; Phase 4 Part 2 Step 3: "tabs: onOpen
  // (per tab), onClose") -- fires onClose for the tab being left and onOpen
  // for the tab being switched to, same pair-per-switch shape as accordion's
  // toggle. Not fired on initial mount (tab 0 starts active with no author
  // action having opened it, matching accordion's all-closed initial state).
  function switchTo(index) {
    if (index === activeIndex) return;
    onTrigger(block, 'onClose');
    setActiveIndex(index);
    onTrigger(block, 'onOpen');
  }

  function handleKeyDown(e, index) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      switchTo((index + 1) % items.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      switchTo((index - 1 + items.length) % items.length);
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
              onClick={() => switchTo(index)}
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
              <BlockRenderer
                key={childBlock.block_id}
                block={childBlock}
                assets={assets}
                onTrigger={onTrigger}
                onOpenModal={onOpenModal}
                blockVisibility={blockVisibility}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
