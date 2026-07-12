import { genBlockId, genCourseId, genPageId } from './idGen.js';

// Default content shapes per block type, matching the Phase 1 content
// model documented in DECISIONS.md (2026-07-11 entry). Used both by the
// starter templates and by the "Add Block" picker in the editor.
export const BLOCK_TYPES = ['text', 'heading', 'image', 'list', 'accordion', 'tabs', 'knowledge-check', 'carousel'];

export const BLOCK_LABELS = {
  text: 'Text',
  heading: 'Heading',
  image: 'Image',
  list: 'List',
  accordion: 'Accordion',
  tabs: 'Tabs',
  'knowledge-check': 'Knowledge Check',
  carousel: 'Image Carousel',
};

function defaultContent(type) {
  switch (type) {
    case 'text':
      return { rich_text: [{ t: 'text', v: '' }] };
    case 'heading':
      return { text: '', level: 2 };
    case 'image':
      return { asset_id: null };
    case 'list':
      return { style: 'bulleted', items: [''] };
    case 'accordion':
      return { items: [{ title: '', body_blocks: [] }] };
    case 'tabs':
      return { items: [{ label: 'Tab 1', body_blocks: [] }, { label: 'Tab 2', body_blocks: [] }] };
    case 'knowledge-check':
      return {
        question: '',
        options: [
          { id: 'opt_a', text: '', correct: true },
          { id: 'opt_b', text: '', correct: false },
        ],
      };
    case 'carousel':
      return { asset_ids: [] };
    default:
      return {};
  }
}

export function createBlock(type) {
  return { block_id: genBlockId(), type, content: defaultContent(type), triggers: [] };
}

// A schema-valid, empty course document. Blank-course creation and the
// onboarding tour both start from this rather than `{}` — CourseEditor
// assumes meta/pages/assets always exist (see course.schema.json).
export function createBlankCourseJson(title) {
  return {
    schema_version: 1,
    meta: {
      course_id: genCourseId(),
      title: title || 'Untitled Course',
      theme: { accent: '#0891B2' },
      completion_rule: 'viewed_all_pages',
    },
    variables: [],
    assets: [],
    pages: [{ page_id: genPageId(), title: 'Page 1', blocks: [] }],
  };
}
