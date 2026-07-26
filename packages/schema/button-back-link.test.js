import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourse } from './index.js';

function baseCourse() {
  return {
    schema_version: 7,
    meta: {
      course_id: 'crs_buttonback',
      title: 'Button and back button',
      theme: { accent: '#0E7A8A' },
    },
    variables: [],
    assets: [],
    question_banks: [],
    linked_entities: [],
    pages: [
      { page_id: 'pg_first', title: 'First', blocks: [] },
      {
        page_id: 'pg_second',
        title: 'Second',
        blocks: [{
          block_id: 'blk_button',
          type: 'button',
          content: { text: 'Continue reading', target_page_id: 'pg_first' },
        }],
      },
    ],
  };
}

test('accepts the optional course back-button setting and generic button block', () => {
  const course = baseCourse();
  course.meta.back_button_enabled = true;
  const result = validateCourse(course);
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('keeps older courses valid when the back-button setting is absent', () => {
  const result = validateCourse(baseCourse());
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('keeps external rich-text links in the existing HTML segment shape', () => {
  const course = baseCourse();
  course.pages[0].blocks.push({
    block_id: 'blk_link',
    type: 'text',
    content: { rich_text: [{ t: 'html', v: '<a href="https://example.com">Read more</a>' }] },
  });
  const result = validateCourse(course);
  assert.equal(result.valid, true, result.errors.join('; '));
});
