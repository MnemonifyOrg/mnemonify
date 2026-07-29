import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CommentsPanel from './CommentsPanel.jsx';

globalThis.React = React;

const comments = [
  {
    comment_id: 'cmt_open',
    author_id: 'user_one',
    author_name: 'Reviewer',
    body: 'Please clarify this block.',
    status: 'open',
    block_id: 'blk_one',
    page_id: 'pg_one',
    fallback_label: 'Clinical Information',
    created_at: '2026-07-29T12:00:00.000Z',
    replies: [{
      comment_id: 'cmt_reply',
      author_id: 'user_two',
      author_name: 'Owner',
      body: 'I will update it.',
      status: 'open',
      fallback_label: 'Clinical Information',
      created_at: '2026-07-29T12:05:00.000Z',
    }],
  },
  {
    comment_id: 'cmt_resolved',
    author_id: 'user_two',
    author_name: 'Owner',
    body: 'Resolved note.',
    status: 'resolved',
    page_id: 'pg_one',
    fallback_label: 'Welcome',
    created_at: '2026-07-29T12:10:00.000Z',
    replies: [],
  },
];

const props = {
  comments,
  commentAnchor: { blockId: 'blk_one', pageId: 'pg_one', fallbackLabel: 'Clinical Information' },
  currentUserId: 'user_one',
  currentRole: 'reviewer',
  onCreateComment: () => Promise.resolve(),
  onReply: () => Promise.resolve(),
  onStatus: () => Promise.resolve(),
  onEdit: () => Promise.resolve(),
  onDelete: () => Promise.resolve(),
  onNavigate: () => {},
};

describe('CommentsPanel', () => {
  it('renders the current anchor, open thread, reply, and resolved filter controls', () => {
    const html = renderToStaticMarkup(<CommentsPanel {...props} initialFilter="all" />);
    expect(html).toContain('Comment on: Clinical Information');
    expect(html).toContain('Please clarify this block.');
    expect(html).toContain('I will update it.');
    expect(html).toContain('Open 1');
    expect(html).toContain('Resolved 1');
    expect(html).toContain('Resolved thread');
  });

  it('renders navigation controls for block and page anchors', () => {
    const html = renderToStaticMarkup(<CommentsPanel {...props} initialFilter="all" />);
    expect(html).toContain('Go to block · Clinical Information');
    expect(html).toContain('data-comment-id="cmt_resolved"');
  });
});
