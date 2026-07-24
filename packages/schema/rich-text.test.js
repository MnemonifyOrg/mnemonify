import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourse } from './index.js';

function courseWithUtility(custom) {
  return {
    schema_version: 5,
    meta: {
      course_id: 'crs_richtext',
      title: 'Rich text',
      theme: { accent: '#0E7A8A' },
      utility_bar: { custom },
    },
    variables: [],
    assets: [],
    question_banks: [],
    linked_entities: [],
    pages: [{ page_id: 'pg_one', title: 'One', blocks: [] }],
  };
}

test('accepts optional rich text custom utility messages', () => {
  const result = validateCourse(courseWithUtility([{
    id: 'utility_bio',
    label: 'Author bios',
    action: 'modal',
    target: 'Legacy plain text remains here.',
    target_rich_text: [
      { t: 'html', v: '<strong>Author</strong> biography.' },
      { t: 'variable', var_name: 'ScorePercent' },
    ],
  }]));
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('old plain-text custom utility messages remain valid unchanged', () => {
  const result = validateCourse(courseWithUtility([{
    id: 'utility_legacy',
    label: 'About',
    action: 'modal',
    target: 'A legacy message.',
  }]));
  assert.equal(result.valid, true, result.errors.join('; '));
});
