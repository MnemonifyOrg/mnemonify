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

export default function BlockRenderer({ block, assets, onTrigger, isPreview }) {
  const Component = REGISTRY[block.type];
  if (!Component) {
    // Carousel rendering is Phase 5 scope (not implemented yet). In editor
    // preview, tell the author explicitly rather than silently dropping
    // the block, so it doesn't look broken/missing. Outside preview
    // (real learner/SCORM context) that reassurance would be false today,
    // so fall through to the generic silent-skip used for any other
    // not-yet-implemented block type. See DECISIONS.md.
    if (block.type === 'carousel' && isPreview) {
      return (
        <div className="block block-unavailable-preview">
          Carousel preview not available — renders correctly in published course
        </div>
      );
    }
    console.warn(`[player] Unknown block type "${block.type}" (block_id: ${block.block_id})`);
    return null;
  }
  return <Component block={block} assets={assets} onTrigger={onTrigger} />;
}
