import assert from 'node:assert/strict';
import test from 'node:test';
import { ROLES } from './auth.js';
import {
  buildCommentThreads,
  canDeleteComment,
  canEditComment,
  resolveCommentAnchor,
  validateCommentBody,
} from './comments.js';

const course = {
  pages: [{
    page_id: 'pg_one',
    title: 'Welcome',
    blocks: [{ block_id: 'blk_one', type: 'text', content: { rich_text: [{ t: 'text', v: 'A useful introduction.' }] } }],
  }],
};

test('comment anchors resolve to stable page/block ids and fallback labels', () => {
  assert.deepEqual(resolveCommentAnchor(course, { pageId: 'pg_one' }), {
    blockId: null,
    pageId: 'pg_one',
    fallbackLabel: 'Welcome',
  });
  assert.deepEqual(resolveCommentAnchor(course, { blockId: 'blk_one' }), {
    blockId: 'blk_one',
    pageId: 'pg_one',
    fallbackLabel: 'A useful introduction.',
  });
  assert.throws(() => resolveCommentAnchor(course, { blockId: 'missing' }), /no longer exists/);
});

test('comment bodies are plain text, trimmed, and bounded', () => {
  assert.equal(validateCommentBody('  Please revise this.  '), 'Please revise this.');
  assert.throws(() => validateCommentBody('   '), /required/);
  assert.throws(() => validateCommentBody('x'.repeat(5001)), /5000/);
});

test('threads keep flat replies under one top-level comment', () => {
  const threads = buildCommentThreads([
    { comment_id: 'one', course_id: 'course', author_id: 'a', author_name: 'A', parent_comment_id: null, status: 'open', body: 'Root', fallback_label: 'Welcome' },
    { comment_id: 'two', course_id: 'course', author_id: 'b', author_name: 'B', parent_comment_id: 'one', status: 'open', body: 'Reply', fallback_label: 'Welcome' },
  ]);
  assert.equal(threads.length, 1);
  assert.equal(threads[0].replies[0].body, 'Reply');
});

test('comment edit/delete permissions match Phase 6b roles', () => {
  const own = { author_id: 'reviewer' };
  const other = { author_id: 'editor' };
  assert.equal(canEditComment(own, 'reviewer'), true);
  assert.equal(canEditComment(other, 'reviewer'), false);
  assert.equal(canDeleteComment(own, 'reviewer', ROLES.REVIEWER), true);
  assert.equal(canDeleteComment(other, 'reviewer', ROLES.EDITOR), false);
  assert.equal(canDeleteComment(other, 'owner', ROLES.OWNER), true);
});
