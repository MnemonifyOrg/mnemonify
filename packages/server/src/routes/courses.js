import express from 'express';
import pool from '../db.js';
import { DEV_ORG_ID, DEV_USER_ID } from '../lib/devUser.js';
import { templatizeCourse } from '../lib/templatize.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { migrateCourse, MigrationError } from '@mnemonify/schema/migrations/index.js';
import { queueCoursePdfs } from '../lib/pdfPipeline.js';

const router = express.Router();

// Phase 4.5a: this handler is the content server's one real course-serving
// path (ARCHITECTURE-AUDIT.md 4.3's "load -> inspect version -> migrate ->
// validate -> normalize -> open" flow) -- both the editor
// (packages/editor/src/lib/api.js's getCourse) and the player's own
// preview-mode fetch (packages/player/src/App.jsx) call this exact
// endpoint, so wiring migration here covers both named load paths at
// once. Pulled out of the route handler so /courses/:id and the
// /duplicate endpoint (which also reads a stored row and should never
// hand a caller pre-migration data either) share one implementation.
//
// The original DB row is never overwritten until the migrated document
// has both (a) passed schema validation and (b) been written back
// successfully -- if the UPDATE fails, this throws and the request fails
// loudly (asyncHandler's error middleware returns 500) rather than
// silently serving data that looks migrated but isn't actually saved.
//
// Exported so index.js's /content/:courseId (the SCORM/launcher-facing
// load path for a real authored course) can call this exact function
// rather than reimplementing it -- one migration-on-load implementation,
// not two that could quietly drift apart.
export async function loadAndMigrateCourseRow(row) {
  let migrationResult;
  try {
    migrationResult = migrateCourse(row.course_json, { courseId: row.id });
  } catch (err) {
    if (err instanceof MigrationError) {
      console.error(`[courses] course ${row.id} failed to migrate:`, err.message);
    }
    throw err;
  }
  if (!migrationResult.migrated) return row;

  const updateResult = await pool.query(
    `UPDATE courses SET course_json = $1, updated_at = now() WHERE id = $2 AND organisation_id = $3 RETURNING *`,
    [migrationResult.document, row.id, DEV_ORG_ID]
  );
  if (updateResult.rows.length === 0) {
    throw new MigrationError(`Migrated course ${row.id} could not be saved (no matching row).`, { courseId: row.id });
  }
  return updateResult.rows[0];
}

router.get('/courses', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, title, status, updated_at, is_template
     FROM courses
     WHERE organisation_id = $1 AND is_template = false AND status != 'deleted'
     ORDER BY updated_at DESC`,
    [DEV_ORG_ID]
  );
  res.json(result.rows);
}));

router.get('/templates', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, title, template_scope, updated_at
     FROM courses
     WHERE organisation_id = $1 AND is_template = true AND status != 'deleted'
     ORDER BY updated_at DESC`,
    [DEV_ORG_ID]
  );
  res.json(result.rows);
}));

router.get('/courses/:id', asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM courses WHERE id = $1 AND organisation_id = $2`, [
    req.params.id,
    DEV_ORG_ID,
  ]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }
  const row = await loadAndMigrateCourseRow(result.rows[0]);
  res.json(row);
}));

router.post('/courses', asyncHandler(async (req, res) => {
  const { title, course_json } = req.body;
  const result = await pool.query(
    `INSERT INTO courses (organisation_id, title, course_json, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [DEV_ORG_ID, title || 'Untitled Course', course_json || {}, DEV_USER_ID]
  );
  res.status(201).json(result.rows[0]);
}));

// PATCH /courses/:id is the autosave endpoint -- hit every 5 seconds during
// active editing (CourseEditor.jsx's debounced save). The single highest-
// traffic, highest-risk-of-a-transient-failure handler in the whole API,
// and the one most likely to have been the actual crash source before this
// file had any error handling at all (see DECISIONS.md, Step 0).
router.patch('/courses/:id', asyncHandler(async (req, res) => {
  const { title, course_json, status } = req.body;
  const fields = [];
  const values = [];
  let i = 1;

  if (title !== undefined) {
    fields.push(`title = $${i++}`);
    values.push(title);
  }
  if (course_json !== undefined) {
    fields.push(`course_json = $${i++}`);
    values.push(course_json);
  }
  if (status !== undefined) {
    fields.push(`status = $${i++}`);
    values.push(status);
  }
  fields.push(`updated_at = now()`);

  values.push(req.params.id, DEV_ORG_ID);
  const result = await pool.query(
    `UPDATE courses SET ${fields.join(', ')} WHERE id = $${i++} AND organisation_id = $${i} RETURNING *`,
    values
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }
  if (status === 'published') queueCoursePdfs(req.params.id);
  res.json(result.rows[0]);
}));

router.post('/courses/:id/publish-artifacts', asyncHandler(async (req, res) => {
  const course = await pool.query(`SELECT id FROM courses WHERE id = $1 AND organisation_id = $2`, [req.params.id, DEV_ORG_ID]);
  if (!course.rows.length) { res.status(404).json({ error: 'Course not found' }); return; }
  const queued = queueCoursePdfs(req.params.id);
  res.status(202).json({ queued });
}));

// The current editor has no separate review-publish endpoint yet; keep the
// same queue available for the review-link flow when that UI is introduced.
router.post('/courses/:id/review-publish-artifacts', asyncHandler(async (req, res) => {
  const course = await pool.query(`SELECT id FROM courses WHERE id = $1 AND organisation_id = $2`, [req.params.id, DEV_ORG_ID]);
  if (!course.rows.length) { res.status(404).json({ error: 'Course not found' }); return; }
  res.status(202).json({ queued: queueCoursePdfs(req.params.id) });
}));

router.post('/courses/:id/worksheet-export', asyncHandler(async (req, res) => {
  const course = await pool.query(`SELECT id FROM courses WHERE id = $1 AND organisation_id = $2`, [req.params.id, DEV_ORG_ID]);
  if (!course.rows.length) { res.status(404).json({ error: 'Course not found' }); return; }
  const queued = queueCoursePdfs(req.params.id, { worksheet: true });
  res.status(202).json({ queued });
}));

router.delete('/courses/:id', asyncHandler(async (req, res) => {
  await pool.query(`UPDATE courses SET status = 'deleted', updated_at = now() WHERE id = $1 AND organisation_id = $2`, [
    req.params.id,
    DEV_ORG_ID,
  ]);
  res.status(204).end();
}));

router.post('/courses/:id/duplicate', asyncHandler(async (req, res) => {
  const original = await pool.query(`SELECT * FROM courses WHERE id = $1 AND organisation_id = $2`, [
    req.params.id,
    DEV_ORG_ID,
  ]);
  if (original.rows.length === 0) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }
  const source = await loadAndMigrateCourseRow(original.rows[0]);
  const result = await pool.query(
    `INSERT INTO courses (organisation_id, title, course_json, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [DEV_ORG_ID, `${source.title} (Copy)`, source.course_json, DEV_USER_ID]
  );
  res.status(201).json(result.rows[0]);
}));

router.post('/courses/:id/save-as-template', asyncHandler(async (req, res) => {
  const { template_scope, title } = req.body;
  const original = await pool.query(`SELECT * FROM courses WHERE id = $1 AND organisation_id = $2`, [
    req.params.id,
    DEV_ORG_ID,
  ]);
  if (original.rows.length === 0) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }
  const source = await loadAndMigrateCourseRow(original.rows[0]);
  const templatizedJson = templatizeCourse(source.course_json);
  const templateTitle = title || `${source.title} Template`;

  const result = await pool.query(
    `INSERT INTO courses (organisation_id, title, is_template, template_scope, course_json, created_by)
     VALUES ($1, $2, true, $3, $4, $5)
     RETURNING *`,
    [DEV_ORG_ID, templateTitle, template_scope || 'personal', templatizedJson, DEV_USER_ID]
  );
  res.status(201).json(result.rows[0]);
}));

export default router;
