import HeadingBlock from './HeadingBlock.jsx';
import TextBlock from './TextBlock.jsx';
import ImageBlock from './ImageBlock.jsx';
import ListBlock from './ListBlock.jsx';
import AccordionBlock from './AccordionBlock.jsx';
import TabsBlock from './TabsBlock.jsx';
import KnowledgeCheckBlock from './KnowledgeCheckBlock.jsx';
import ReflectionBlock from './ReflectionBlock.jsx';
import TwoColumnBlock from './TwoColumnBlock.jsx';
import TableBlock from './TableBlock.jsx';
import EmbedBlock from './EmbedBlock.jsx';
import CarouselBlock from './CarouselBlock.jsx';
import VideoBlock from './VideoBlock.jsx';
import AudioBlock from './AudioBlock.jsx';

const REGISTRY = {
  heading: HeadingBlock,
  text: TextBlock,
  image: ImageBlock,
  list: ListBlock,
  accordion: AccordionBlock,
  tabs: TabsBlock,
  'knowledge-check': KnowledgeCheckBlock,
  reflection: ReflectionBlock,
  two_column: TwoColumnBlock,
  table: TableBlock,
  embed: EmbedBlock,
  carousel: CarouselBlock,
  video: VideoBlock,
  audio: AudioBlock,
};

export default function BlockRenderer({ block, assets, onTrigger, isPreview, onOpenModal, blockVisibility }) {
  // block.faculty_notes is intentionally never passed to any block
  // component below, in any context (SCORM, standalone, preview, review).
  // It is editor/instructor-only content (ARCHITECTURE.md 3.8) -- the
  // player must not read this field at all, not just avoid displaying it.
  const Component = REGISTRY[block.type];
  if (!Component) {
    console.warn(`[player] Unknown block type "${block.type}" (block_id: ${block.block_id})`);
    return null;
  }
  // Runtime visibility (Phase 4 Part 2): a SHOW_BLOCK/HIDE_BLOCK trigger
  // effect overrides the block's own default (block.visibility.initial,
  // ARCHITECTURE.md/course.schema.json), which itself defaults to visible.
  // Checked once here, at the single choke point every block (top-level or
  // nested inside accordion/tabs/two_column) renders through, rather than
  // in each container component individually.
  const override = blockVisibility ? blockVisibility[block.block_id] : undefined;
  const isVisible = override !== undefined ? override : block.visibility?.initial !== 'hidden';
  if (!isVisible) return null;
  return (
    <Component
      block={block}
      assets={assets}
      onTrigger={onTrigger}
      isPreview={isPreview}
      onOpenModal={onOpenModal}
      blockVisibility={blockVisibility}
    />
  );
}
