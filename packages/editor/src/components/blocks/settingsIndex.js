import { HeadingBlockSettings } from './HeadingBlock.jsx';
import { ListBlockSettings } from './ListBlock.jsx';
import { ImageBlockSettings } from './ImageBlock.jsx';
import { KnowledgeCheckBlockSettings } from './KnowledgeCheckBlock.jsx';
import { TwoColumnBlockSettings } from './TwoColumnBlock.jsx';
import { TableBlockSettings } from './TableBlock.jsx';

// block-type -> settings-panel component (right panel, shown when that
// block is selected). Types without extra settings simply have no entry.
export const BLOCK_SETTINGS = {
  heading: HeadingBlockSettings,
  list: ListBlockSettings,
  image: ImageBlockSettings,
  'knowledge-check': KnowledgeCheckBlockSettings,
  two_column: TwoColumnBlockSettings,
  table: TableBlockSettings,
};
