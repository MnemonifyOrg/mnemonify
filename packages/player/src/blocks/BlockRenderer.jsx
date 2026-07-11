import HeadingBlock from './HeadingBlock.jsx';
import TextBlock from './TextBlock.jsx';
import ImageBlock from './ImageBlock.jsx';
import ListBlock from './ListBlock.jsx';
import AccordionBlock from './AccordionBlock.jsx';
import TabsBlock from './TabsBlock.jsx';
import KnowledgeCheckBlock from './KnowledgeCheckBlock.jsx';

const REGISTRY = {
  heading: HeadingBlock,
  text: TextBlock,
  image: ImageBlock,
  list: ListBlock,
  accordion: AccordionBlock,
  tabs: TabsBlock,
  'knowledge-check': KnowledgeCheckBlock,
};

export default function BlockRenderer({ block, assets, onTrigger }) {
  const Component = REGISTRY[block.type];
  if (!Component) {
    console.warn(`[player] Unknown block type "${block.type}" (block_id: ${block.block_id})`);
    return null;
  }
  return <Component block={block} assets={assets} onTrigger={onTrigger} />;
}
