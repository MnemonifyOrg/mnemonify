import TextBlockEditor from './TextBlock.jsx';
import HeadingBlockEditor from './HeadingBlock.jsx';
import ImageBlockEditor from './ImageBlock.jsx';
import ListBlockEditor from './ListBlock.jsx';
import AccordionBlockEditor from './AccordionBlock.jsx';
import TabsBlockEditor from './TabsBlock.jsx';
import KnowledgeCheckBlockEditor from './KnowledgeCheckBlock.jsx';
import CarouselBlockEditor from './CarouselBlock.jsx';
import ReflectionBlockEditor from './ReflectionBlock.jsx';

// block-type -> editor component. Any type not listed here falls back to a
// generic read-only preview in BlockCanvas.
export const BLOCK_EDITORS = {
  text: TextBlockEditor,
  heading: HeadingBlockEditor,
  image: ImageBlockEditor,
  list: ListBlockEditor,
  accordion: AccordionBlockEditor,
  tabs: TabsBlockEditor,
  'knowledge-check': KnowledgeCheckBlockEditor,
  carousel: CarouselBlockEditor,
  reflection: ReflectionBlockEditor,
};
