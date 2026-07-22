import { HeadingBlockSettings } from './HeadingBlock.jsx';
import { ListBlockSettings } from './ListBlock.jsx';
import { ImageBlockSettings } from './ImageBlock.jsx';
import { KnowledgeCheckBlockSettings } from './KnowledgeCheckBlock.jsx';
import { TwoColumnBlockSettings } from './TwoColumnBlock.jsx';
import { TableBlockSettings } from './TableBlock.jsx';
import { VideoBlockSettings } from './VideoBlock.jsx';
import { AudioBlockSettings } from './AudioBlock.jsx';
import { MatchingBlockSettings } from './MatchingBlock.jsx';
import { HotspotBlockSettings } from './HotspotBlock.jsx';
import { QuestionBankDrawBlockSettings } from './QuestionBankDrawBlock.jsx';

// block-type -> settings-panel component (right panel, shown when that
// block is selected). Types without extra settings simply have no entry.
export const BLOCK_SETTINGS = {
  heading: HeadingBlockSettings,
  list: ListBlockSettings,
  image: ImageBlockSettings,
  'knowledge-check': KnowledgeCheckBlockSettings,
  two_column: TwoColumnBlockSettings,
  table: TableBlockSettings,
  video: VideoBlockSettings,
  audio: AudioBlockSettings,
  matching: MatchingBlockSettings,
  hotspot: HotspotBlockSettings,
  question_bank_draw: QuestionBankDrawBlockSettings,
};
