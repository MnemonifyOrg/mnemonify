import { genBlockId, genPageId } from './idGen.js';
import { DEFAULT_NAV_MODE } from '@mnemonify/schema/navigation.js';

// Hardcoded starter templates shown on first login when no real templates
// exist yet (GET /api/templates returns an empty array). These are not
// stored in the database -- picking one just POSTs a real course using
// this JSON as the starting course_json.
function block(type, content) {
  return { block_id: genBlockId(), type, content, triggers: [] };
}

function baseCourse(title, blocks) {
  return {
    schema_version: 1,
    meta: {
      course_id: `crs_${Math.random().toString(36).slice(2, 8)}`,
      title,
      theme: { accent: '#0891B2', font_pair: 'default' },
      nav_mode: DEFAULT_NAV_MODE,
      completion_rule: 'viewed_all_pages',
    },
    variables: [],
    assets: [],
    pages: [{ page_id: genPageId(), title: 'Page 1', blocks }],
  };
}

export const STARTER_TEMPLATES = [
  {
    id: 'starter_blank',
    name: 'Blank Course',
    description: 'Start from a single empty text block.',
    course_json: baseCourse('Untitled Course', [block('text', { rich_text: [{ t: 'text', v: '' }] })]),
  },
  {
    id: 'starter_case_based',
    name: 'Case-Based Learning',
    description: 'A case narrative, a revealed diagnosis, and a knowledge check.',
    course_json: baseCourse('Untitled Case-Based Course', [
      block('heading', { text: '[Case title here]', level: 1 }),
      block('text', { rich_text: [{ t: 'text', v: '[Case narrative here]' }] }),
      block('accordion', { items: [{ title: '[Reveal diagnosis]', body_blocks: [] }] }),
      block('knowledge-check', {
        question: '[Question text here]',
        options: [
          { id: 'opt_a', text: '[Answer option here]', correct: true },
          { id: 'opt_b', text: '[Answer option here]', correct: false },
        ],
      }),
    ]),
  },
  {
    id: 'starter_video_lesson',
    name: 'Video Lesson',
    description: 'Heading, body text, a supporting image, and a knowledge check.',
    course_json: baseCourse('Untitled Video Lesson', [
      block('heading', { text: '[Lesson title here]', level: 1 }),
      block('text', { rich_text: [{ t: 'text', v: '[Lesson body text here]' }] }),
      block('image', { asset_id: null }),
      block('knowledge-check', {
        question: '[Question text here]',
        options: [
          { id: 'opt_a', text: '[Answer option here]', correct: true },
          { id: 'opt_b', text: '[Answer option here]', correct: false },
        ],
      }),
    ]),
  },
  {
    id: 'starter_pathology_case',
    name: 'Pathology Case',
    description: 'Image carousel, case history, differential accordion, and a knowledge check.',
    course_json: baseCourse('Untitled Pathology Case', [
      block('heading', { text: '[Case title here]', level: 1 }),
      block('carousel', { asset_ids: [] }),
      block('text', { rich_text: [{ t: 'text', v: '[Case history here]' }] }),
      block('accordion', { items: [{ title: '[Differential diagnosis]', body_blocks: [] }] }),
      block('knowledge-check', {
        question: '[Question text here]',
        options: [
          { id: 'opt_a', text: '[Answer option here]', correct: true },
          { id: 'opt_b', text: '[Answer option here]', correct: false },
        ],
      }),
    ]),
  },
];
