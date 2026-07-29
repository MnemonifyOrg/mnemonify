import express from 'express';
import pool from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../lib/auth.js';
import {
  buildCommentThreads,
  canDeleteComment,
  canEditComment,
  COMMENT_STATUSES,
  resolveCommentAnchor,
  validateCommentBody,
} from '../lib/comments.js';

const router = express.Router();

async function courseForRequest(courseId, organisationId) {
  const result = await pool.query(
    'SELECT id, organisation_id, course_json FROM courses WHERE id = $1 AND organisation_id = $2',
    [courseId, organisationId],
  );
  return result.rows[0] || null;
}

async function commentForRequest(commentId, courseId, organisationId) {
  const result = await pool.query(
    `SELECT c.*, u.name AS author_name, u.email AS author_email
       FROM course_comments c JOIN users u ON u.id = c.author_id
      WHERE c.comment_id = $1 AND c.course_id = $2 AND c.organisation_id = $3`,
    [commentId, courseId, organisationId],
  );
  return result.rows[0] || null;
}

async function commentsForCourse(courseId, organisationId) {
  const result = await pool.query(
    `SELECT c.*, u.name AS author_name, u.email AS author_email
       FROM course_comments c JOIN users u ON u.id = c.author_id
      WHERE c.course_id = $1 AND c.organisation_id = $2
      ORDER BY c.created_at ASC`,
    [courseId, organisationId],
  );
  return buildCommentThreads(result.rows);
}

function publicComment(row) {
  if (!row) return null;
  return {
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
}

router.get('/courses/:courseId/comments', requireAuth, asyncHandler(async (req, res) => {
  const course = await courseForRequest(req.params.courseId, req.auth.organisationId);
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }
  res.json({ comments: await commentsForCourse(course.id, req.auth.organisationId) });
}));

router.post('/courses/:courseId/comments', requireAuth, asyncHandler(async (req, res) => {
  const course = await courseForRequest(req.params.courseId, req.auth.organisationId);
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }
  try {
    const body = validateCommentBody(req.body?.body);
    const anchor = resolveCommentAnchor(course.course_json, req.body || {});
    const result = await pool.query(
      `INSERT INTO course_comments
         (course_id, organisation_id, author_id, block_id, page_id, fallback_label, body)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [course.id, req.auth.organisationId, req.auth.userId, anchor.blockId, anchor.pageId, anchor.fallbackLabel, body],
    );
    const row = await commentForRequest(result.rows[0].comment_id, course.id, req.auth.organisationId);
    res.status(201).json({ comment: publicComment(row) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}));

router.post('/courses/:courseId/comments/:commentId/replies', requireAuth, asyncHandler(async (req, res) => {
  const course = await courseForRequest(req.params.courseId, req.auth.organisationId);
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }
  const parent = await commentForRequest(req.params.commentId, course.id, req.auth.organisationId);
  if (!parent) {
    res.status(404).json({ error: 'Comment thread not found.' });
    return;
  }
  if (parent.parent_comment_id) {
    res.status(400).json({ error: 'Replies must belong directly to the top-level comment.' });
    return;
  }
  try {
    const body = validateCommentBody(req.body?.body);
    const result = await pool.query(
      `INSERT INTO course_comments
         (course_id, organisation_id, author_id, parent_comment_id, block_id, page_id, fallback_label, body, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [course.id, req.auth.organisationId, req.auth.userId, parent.comment_id, parent.block_id, parent.page_id, parent.fallback_label, body, parent.status],
    );
    const row = await commentForRequest(result.rows[0].comment_id, course.id, req.auth.organisationId);
    res.status(201).json({ comment: publicComment(row) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}));

router.patch('/courses/:courseId/comments/:commentId', requireAuth, asyncHandler(async (req, res) => {
  const comment = await commentForRequest(req.params.commentId, req.params.courseId, req.auth.organisationId);
  if (!comment) {
    res.status(404).json({ error: 'Comment not found.' });
    return;
  }
  if (!canEditComment(comment, req.auth.userId)) {
    res.status(403).json({ error: 'You can only edit your own comments.' });
    return;
  }
  try {
    const body = validateCommentBody(req.body?.body);
    const result = await pool.query(
      `UPDATE course_comments SET body = $1, updated_at = now()
        WHERE comment_id = $2 RETURNING *`,
      [body, comment.comment_id],
    );
    const row = await commentForRequest(result.rows[0].comment_id, req.params.courseId, req.auth.organisationId);
    res.json({ comment: publicComment(row) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}));

router.patch('/courses/:courseId/comments/:commentId/status', requireAuth, asyncHandler(async (req, res) => {
  const comment = await commentForRequest(req.params.commentId, req.params.courseId, req.auth.organisationId);
  if (!comment) {
    res.status(404).json({ error: 'Comment thread not found.' });
    return;
  }
  const status = req.body?.status;
  if (!COMMENT_STATUSES.includes(status)) {
    res.status(400).json({ error: 'Status must be open or resolved.' });
    return;
  }
  const rootId = comment.parent_comment_id || comment.comment_id;
  await pool.query(
    `UPDATE course_comments SET status = $1, updated_at = now()
      WHERE (comment_id = $2 OR parent_comment_id = $2)
        AND course_id = $3 AND organisation_id = $4`,
    [status, rootId, req.params.courseId, req.auth.organisationId],
  );
  res.json({ thread_id: rootId, status });
}));

router.delete('/courses/:courseId/comments/:commentId', requireAuth, asyncHandler(async (req, res) => {
  const comment = await commentForRequest(req.params.commentId, req.params.courseId, req.auth.organisationId);
  if (!comment) {
    res.status(404).json({ error: 'Comment not found.' });
    return;
  }
  if (!canDeleteComment(comment, req.auth.userId, req.auth.role)) {
    res.status(403).json({ error: 'You can only delete your own comments.' });
    return;
  }
  await pool.query(
    'DELETE FROM course_comments WHERE comment_id = $1 AND course_id = $2 AND organisation_id = $3',
    [comment.comment_id, req.params.courseId, req.auth.organisationId],
  );
  res.status(204).end();
}));

export default router;
