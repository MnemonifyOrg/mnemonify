import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCourse } from './index.js';

function courseWithMedia(assetPatch = {}, blockPatch = {}) {
  return {
    schema_version: 2,
    meta: { title: 'Test', theme: {}, nav_mode: 'free', utility_bar: { custom: [] } },
    variables: [],
    assets: [{ asset_id: 'ast_video', kind: 'video', src: 'uploads/video.mp4', alt: 'Video', ...assetPatch }],
    pages: [{ page_id: 'pg_one', title: 'One', blocks: [{ block_id: 'blk_video', type: 'video', content: { asset_id: 'ast_video', autoplay: false, loop: false }, ...blockPatch }] }],
  };
}

test('flags a video without ready captions and clears after review metadata is present', () => {
  const missing = analyzeCourse(courseWithMedia());
  assert.ok(missing.some((finding) => finding.ruleId === 'a11y.video_captions_missing'));

  const reviewed = analyzeCourse(courseWithMedia({ caption_status: 'ready', caption_review_status: 'reviewed' }));
  assert.equal(reviewed.some((finding) => finding.ruleId.startsWith('a11y.video_captions')), false);
});

test('flags generated captions that remain draft', () => {
  const findings = analyzeCourse(courseWithMedia({ caption_status: 'ready', caption_review_status: 'draft' }));
  assert.ok(findings.some((finding) => finding.ruleId === 'a11y.video_captions_unreviewed'));
});
