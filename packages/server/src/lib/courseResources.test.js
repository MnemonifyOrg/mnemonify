import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeCourseResources } from './courseResources.js';

const generatedPdf = {
  resource_id: 'res_pdf',
  filename: 'case-course.pdf',
  file_path: 'course-1/resources/case-course.pdf',
  label: 'Course PDF',
  size_bytes: '1234',
  uploaded_at: '2026-07-26T12:00:00.000Z',
  source: 'generated',
  resource_kind: 'combined_pdf',
};

test('merges generated database resources into the real player course shape', () => {
  const course = {
    meta: { pdf_settings: { resources_page: true }, resources: [] },
    pages: [],
  };

  const merged = mergeCourseResources(course, [generatedPdf]);

  assert.deepEqual(merged.meta.resources, [{
    resource_id: 'res_pdf',
    filename: 'case-course.pdf',
    file_path: 'course-1/resources/case-course.pdf',
    label: 'Course PDF',
    size_bytes: 1234,
    uploaded_at: '2026-07-26T12:00:00.000Z',
  }]);
  assert.deepEqual(course.meta.resources, []);
});

test('does not duplicate a resource already mirrored in course JSON', () => {
  const course = {
    meta: {
      resources: [{
        resource_id: 'res_pdf',
        filename: 'case-course.pdf',
        file_path: 'course-1/resources/case-course.pdf',
        size_bytes: 1234,
        uploaded_at: '2026-07-26T12:00:00.000Z',
      }],
    },
  };

  const merged = mergeCourseResources(course, [generatedPdf]);

  assert.equal(merged, course);
});

test('keeps generated resources hidden when the resources page is disabled', () => {
  const course = { meta: { pdf_settings: { resources_page: false }, resources: [] } };

  assert.equal(mergeCourseResources(course, [generatedPdf]), course);
});
