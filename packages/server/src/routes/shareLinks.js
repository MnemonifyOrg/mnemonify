import express from 'express';
import pool from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireRole, ROLES } from '../lib/auth.js';
import { listCourseResources } from './resources.js';
import { mergeCourseResources } from '../lib/courseResources.js';
import {
  SHARE_LINK_NOT_PUBLISHED_MESSAGE,
  SHARE_LINK_UNAVAILABLE_MESSAGE,
  createShareLinkToken,
  decryptShareLinkToken,
  encryptShareLinkToken,
  hashShareLinkToken,
  isShareLinkAvailable,
  shareLinkForResponse,
  stripEditorOnlyCourseData,
  validateShareLinkExpiration,
} from '../lib/shareLinks.js';

const router = express.Router();

function shareBaseUrl(req) {
  return (process.env.CONTENT_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function shareUrl(req, token) {
  return `${shareBaseUrl(req)}/share/${encodeURIComponent(token)}`;
}

async function linkForCourse(shareLinkId, courseId, organisationId) {
  const result = await pool.query(
    `SELECT share_link_id, course_id, organisation_id, token_hash, token_ciphertext,
            created_by, created_at, expires_at, revoked, revoked_at
       FROM course_share_links
      WHERE share_link_id = $1 AND course_id = $2 AND organisation_id = $3`,
    [shareLinkId, courseId, organisationId],
  );
  return result.rows[0] || null;
}

// Public by design. This endpoint returns only the current published course
// document associated with the bearer token; it never returns a course row,
// comments, editor metadata, or organization data.
router.get('/share-links/:token', asyncHandler(async (req, res) => {
  const token = String(req.params.token || '');
  const result = await pool.query(
    `SELECT l.share_link_id, l.course_id, l.organisation_id, l.expires_at,
            l.revoked, v.course_json, v.version_id
       FROM course_share_links l
       JOIN LATERAL (
         SELECT version_id, course_json
           FROM course_versions
          WHERE course_id = l.course_id AND organisation_id = l.organisation_id
            AND kind = 'published'
          ORDER BY published_at DESC, version_number DESC, created_at DESC
          LIMIT 1
       ) v ON true
      WHERE l.token_hash = $1`,
    [hashShareLinkToken(token)],
  );
  const row = result.rows[0];
  if (!row || !isShareLinkAvailable(row)) {
    res.status(410).json({ error: SHARE_LINK_UNAVAILABLE_MESSAGE });
    return;
  }
  if (!row.course_json) {
    res.status(409).json({ error: SHARE_LINK_NOT_PUBLISHED_MESSAGE });
    return;
  }
  const resources = await listCourseResources(row.course_id, row.organisation_id);
  res.json(mergeCourseResources(stripEditorOnlyCourseData(row.course_json), resources));
}));

router.get('/courses/:courseId/share-links', requireRole(ROLES.OWNER, ROLES.EDITOR), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT share_link_id, course_id, created_by, created_at, expires_at, revoked, revoked_at,
            token_ciphertext
       FROM course_share_links
      WHERE course_id = $1 AND organisation_id = $2
      ORDER BY created_at DESC`,
    [req.params.courseId, req.auth.organisationId],
  );
  res.json({
    share_links: result.rows.map((row) => {
      let url = null;
      try {
        url = shareUrl(req, decryptShareLinkToken(row.token_ciphertext));
      } catch {
        // A rotated encryption secret should not make the management panel
        // crash; the link remains revocable even if its URL cannot be copied.
      }
      return shareLinkForResponse(row, url);
    }),
  });
}));

router.post('/courses/:courseId/share-links', requireRole(ROLES.OWNER, ROLES.EDITOR), asyncHandler(async (req, res) => {
  let expiresAt;
  try {
    expiresAt = validateShareLinkExpiration(req.body?.expires_at);
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const courseResult = await client.query(
      `SELECT id
         FROM courses
        WHERE id = $1 AND organisation_id = $2 AND status != 'deleted'
        FOR SHARE`,
      [req.params.courseId, req.auth.organisationId],
    );
    if (!courseResult.rows.length) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Course not found.' });
      return;
    }
    const publishedResult = await client.query(
      `SELECT version_id
         FROM course_versions
        WHERE course_id = $1 AND organisation_id = $2 AND kind = 'published'
        ORDER BY published_at DESC, version_number DESC, created_at DESC
        LIMIT 1`,
      [req.params.courseId, req.auth.organisationId],
    );
    if (!publishedResult.rows.length) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: SHARE_LINK_NOT_PUBLISHED_MESSAGE });
      return;
    }

    const token = createShareLinkToken();
    const result = await client.query(
      `INSERT INTO course_share_links
         (course_id, organisation_id, token_hash, token_ciphertext, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING share_link_id, course_id, created_by, created_at, expires_at, revoked, revoked_at`,
      [
        req.params.courseId,
        req.auth.organisationId,
        hashShareLinkToken(token),
        encryptShareLinkToken(token),
        req.auth.userId,
        expiresAt,
      ],
    );
    await client.query('COMMIT');
    res.status(201).json({ share_link: shareLinkForResponse(result.rows[0], shareUrl(req, token)) });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

router.patch('/courses/:courseId/share-links/:shareLinkId', requireRole(ROLES.OWNER, ROLES.EDITOR), asyncHandler(async (req, res) => {
  let expiresAt;
  try {
    expiresAt = validateShareLinkExpiration(req.body?.expires_at);
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  const link = await linkForCourse(req.params.shareLinkId, req.params.courseId, req.auth.organisationId);
  if (!link) {
    res.status(404).json({ error: 'Share link not found.' });
    return;
  }
  const result = await pool.query(
    `UPDATE course_share_links
        SET expires_at = $1
      WHERE share_link_id = $2 AND course_id = $3 AND organisation_id = $4
      RETURNING share_link_id, course_id, created_by, created_at, expires_at, revoked, revoked_at, token_ciphertext`,
    [expiresAt, req.params.shareLinkId, req.params.courseId, req.auth.organisationId],
  );
  let token = null;
  try { token = decryptShareLinkToken(result.rows[0].token_ciphertext); } catch { /* see list route */ }
  res.json({ share_link: shareLinkForResponse(result.rows[0], token ? shareUrl(req, token) : null) });
}));

router.delete('/courses/:courseId/share-links/:shareLinkId', requireRole(ROLES.OWNER, ROLES.EDITOR), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `UPDATE course_share_links
        SET revoked = true, revoked_at = COALESCE(revoked_at, now())
      WHERE share_link_id = $1 AND course_id = $2 AND organisation_id = $3
      RETURNING share_link_id`,
    [req.params.shareLinkId, req.params.courseId, req.auth.organisationId],
  );
  if (!result.rows.length) {
    res.status(404).json({ error: 'Share link not found.' });
    return;
  }
  res.status(204).end();
}));

export default router;
