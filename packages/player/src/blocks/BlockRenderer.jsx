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
import { evaluateCondition } from '../engine/triggerEngine.js';
import { BLOCK_TYPES, BLOCK_REGISTRY } from '@mnemonify/schema/block-registry.js';

// block-type -> player component. Component references can't live in the
// shared, framework-free packages/schema/block-registry.js (see that
// file's own comment), so this stays the environment-local half of the
// registry, keyed by the exact same type strings block-registry.js
// defines.
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

// Dev-time completeness check (Phase 4.5b) -- same purpose as the
// matching check in packages/editor/src/components/blocks/index.js: catch
// a registry type with no player component at build/dev time rather than
// a learner silently seeing nothing render.
if (import.meta.env?.DEV) {
  const missing = BLOCK_TYPES.filter((type) => !REGISTRY[type]);
  if (missing.length > 0) {
    console.warn(`[player] Registry type(s) with no player component: ${missing.join(', ')}`);
  }
}

export default function BlockRenderer({ block, assets, onTrigger, onTimeReached, isPreview, onOpenModal, blockVisibility, variables, printMode = false, worksheetMode = false }) {
  // block.faculty_notes is intentionally never passed to any block
  // component below, in any context (SCORM, standalone, preview, review).
  // It is editor/instructor-only content (ARCHITECTURE.md 3.8) -- the
  // player must not read this field at all, not just avoid displaying it.
  const Component = REGISTRY[block.type];
  if (!Component) {
    console.warn(`[player] Unknown block type "${block.type}" (block_id: ${block.block_id})`);
    return null;
  }
  // Runtime visibility, checked once here at the single choke point every
  // block (top-level or nested inside accordion/tabs/two_column) renders
  // through. Two independent mechanisms, with an explicit precedence rule
  // (P1-55, see DECISIONS.md): a self-owned `visibility_condition` (Step 1)
  // is AUTHORITATIVE the moment it's present -- it's evaluated fresh on
  // every render (i.e. reactively, since `variables` is a prop that changes
  // whenever any trigger anywhere sets/adjusts a variable) and a
  // SHOW_BLOCK/HIDE_BLOCK trigger targeting this same block no longer has
  // any effect once a condition is set. Only when no `visibility_condition`
  // exists does the older mechanism apply: the `blockVisibility` map (set
  // by SHOW_BLOCK/HIDE_BLOCK trigger effects, Part 2) if present, else the
  // block's own static default (`block.visibility.initial`, defaulting to
  // visible).
  let isVisible;
  if (block.visibility_condition) {
    isVisible = evaluateCondition(block.visibility_condition, variables || {});
  } else {
    const override = blockVisibility ? blockVisibility[block.block_id] : undefined;
    isVisible = override !== undefined ? override : block.visibility?.initial !== 'hidden';
  }
  if (!isVisible) return null;
  const includeInPdf = block.include_in_pdf ?? BLOCK_REGISTRY[block.type]?.includeInPdfDefault ?? true;
  if (printMode && !worksheetMode && !includeInPdf) return null;
  if (printMode && worksheetMode && ['embed', 'button'].includes(block.type)) return null;
  return (
    <Component
      block={block}
      assets={assets}
      onTrigger={onTrigger}
      onTimeReached={onTimeReached}
      isPreview={isPreview}
      onOpenModal={onOpenModal}
      blockVisibility={blockVisibility}
      variables={variables}
      printMode={printMode}
      worksheetMode={worksheetMode}
    />
  );
}
