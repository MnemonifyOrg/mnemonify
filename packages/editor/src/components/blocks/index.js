import TextBlockEditor from './TextBlock.jsx';
import HeadingBlockEditor from './HeadingBlock.jsx';
import ImageBlockEditor from './ImageBlock.jsx';
import ListBlockEditor from './ListBlock.jsx';
import AccordionBlockEditor from './AccordionBlock.jsx';
import TabsBlockEditor from './TabsBlock.jsx';
import KnowledgeCheckBlockEditor from './KnowledgeCheckBlock.jsx';
import CarouselBlockEditor from './CarouselBlock.jsx';
import ReflectionBlockEditor from './ReflectionBlock.jsx';
import ButtonBlockEditor from './ButtonBlock.jsx';
import TwoColumnBlockEditor from './TwoColumnBlock.jsx';
import TableBlockEditor from './TableBlock.jsx';
import EmbedBlockEditor from './EmbedBlock.jsx';
import VideoBlockEditor from './VideoBlock.jsx';
import AudioBlockEditor from './AudioBlock.jsx';
import FlashcardsBlockEditor from './FlashcardsBlock.jsx';
import MatchingBlockEditor from './MatchingBlock.jsx';
import OrderingBlockEditor from './OrderingBlock.jsx';
import HotspotBlockEditor from './HotspotBlock.jsx';
import QuestionBankDrawBlockEditor from './QuestionBankDrawBlock.jsx';
import { BLOCK_REGISTRY, BLOCK_TYPES } from '@mnemonify/schema/block-registry.js';

// block-type -> editor component. Component references can't live in the
// shared, framework-free packages/schema/block-registry.js (that would
// pull React into the Node server's dependency graph -- see that file's
// own comment), so this stays the environment-local half of the registry,
// keyed by the exact same type strings block-registry.js defines. Any
// type not listed here falls back to a generic read-only preview in
// BlockCanvas.
const EDITOR_COMPONENTS = {
  TextBlockEditor,
  HeadingBlockEditor,
  ImageBlockEditor,
  ListBlockEditor,
  AccordionBlockEditor,
  TabsBlockEditor,
  KnowledgeCheckBlockEditor,
  CarouselBlockEditor,
  ReflectionBlockEditor,
  ButtonBlockEditor,
  TwoColumnBlockEditor,
  TableBlockEditor,
  EmbedBlockEditor,
  VideoBlockEditor,
  AudioBlockEditor,
  FlashcardsBlockEditor,
  MatchingBlockEditor,
  OrderingBlockEditor,
  HotspotBlockEditor,
  QuestionBankDrawBlockEditor,
};

export const BLOCK_EDITORS = Object.fromEntries(
  BLOCK_TYPES.map((type) => [type, EDITOR_COMPONENTS[BLOCK_REGISTRY[type].editorComponent]])
);

// Dev-time completeness check (Phase 4.5b): the exact bug class this
// registry exists to prevent is a block type present in the registry (so
// it appears in the Add Block picker) but silently missing its editor
// component, which previously meant "type is pickable but produces a
// blank/JSON-dump block once added" with no signal anywhere it happened.
if (import.meta.env?.DEV) {
  const missing = BLOCK_TYPES.filter((type) => !BLOCK_EDITORS[type]);
  if (missing.length > 0) {
    console.warn(`[blocks/index] Registry type(s) with no editor component: ${missing.join(', ')}`);
  }
}
