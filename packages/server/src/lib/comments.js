import { ROLES } from './auth.js';

export const COMMENT_STATUSES = Object.freeze(['open', 'resolved']);
export const MAX_COMMENT_BODY_LENGTH = 5000;
export const MAX_COMMENT_LABEL_LENGTH = 240;

export function validateCommentBody(value) {
  if (typeof value !== 'string') throw new Error('Comment body is required.');
  const body = value.trim();
  if (!body) throw new Error('Comment body is required.');
  if (body.length > MAX_COMMENT_BODY_LENGTH) throw new Error(`Comment body must be ${MAX_COMMENT_BODY_LENGTH} characters or fewer.`);
  return body;
}

function textSnippet(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function blockFallbackLabel(block) {
  if (block?.label?.trim()) return block.label.trim().slice(0, MAX_COMMENT_LABEL_LENGTH);
  const content = block?.content || {};
  const candidates = [
    content.question,
    content.text,
    content.prompt,
    content.rich_text?.map((segment) => segment?.v || '').join(' '),
  ];
  const snippet = candidates.map(textSnippet).find(Boolean);
  return snippet ? snippet.slice(0, MAX_COMMENT_LABEL_LENGTH) : `${block?.type || 'Block'} block`;
}

function walkBlocks(blocks, callback) {
  for (const block of blocks || []) {
    if (!block || typeof block !== 'object') continue;
    const result = callback(block);
    if (result) return result;
    if (block.left) {
      const left = walkBlocks([block.left], callback);
      if (left) return left;
    }
    if (block.right) {
      const right = walkBlocks([block.right], callback);
      if (right) return right;
    }
    for (const item of block.content?.items || []) {
      const nested = walkBlocks(item?.body_blocks, callback);
      if (nested) return nested;
    }
  }
  return null;
}

export function resolveCommentAnchor(courseJson, { blockId, pageId } = {}) {
  const normalizedBlockId = typeof blockId === 'string' && blockId.trim() ? blockId.trim() : null;
  const normalizedPageId = typeof pageId === 'string' && pageId.trim() ? pageId.trim() : null;
  if ((normalizedBlockId && normalizedPageId) || (!normalizedBlockId && !normalizedPageId)) {
    throw new Error('Comment must target exactly one block or page.');
  }

  const pages = courseJson?.pages || [];
  if (normalizedPageId) {
    const page = pages.find((candidate) => candidate.page_id === normalizedPageId);
    if (!page) throw new Error('The selected page no longer exists.');
    return { blockId: null, pageId: page.page_id, fallbackLabel: (page.title || 'Untitled page').trim().slice(0, MAX_COMMENT_LABEL_LENGTH) || 'Untitled page' };
  }

  const found = walkBlocks(pages.flatMap((page) => page.blocks || []), (block) => block.block_id === normalizedBlockId ? block : null);
  if (!found) throw new Error('The selected block no longer exists.');
  const page = pages.find((candidate) => Boolean(walkBlocks(candidate.blocks, (block) => block.block_id === normalizedBlockId ? block : null)));
  return {
    blockId: normalizedBlockId,
    pageId: page?.page_id || null,
    fallbackLabel: blockFallbackLabel(found),
  };
}

export function canEditComment(comment, userId) {
  return comment?.author_id === userId;
}

export function canDeleteComment(comment, userId, role) {
  return role === ROLES.OWNER || canEditComment(comment, userId);
}

export function buildCommentThreads(rows) {
  const threads = [];
  const byId = new Map();
  for (const row of rows) {
    const item = {
      comment_id: row.comment_id,
      course_id: row.course_id,
      author_id: row.author_id,
      author_name: row.author_name,
      author_email: row.author_email,
      parent_comment_id: row.parent_comment_id,
      block_id: row.block_id,
      page_id: row.page_id,
      fallback_label: row.fallback_label,
      body: row.body,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      replies: [],
    };
    byId.set(item.comment_id, item);
    if (!item.parent_comment_id) threads.push(item);
  }
  for (const item of byId.values()) {
    if (item.parent_comment_id) byId.get(item.parent_comment_id)?.replies.push(item);
  }
  return threads;
}
