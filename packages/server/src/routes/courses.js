import express from 'express';
import pool from '../db.js';
import { DEV_ORG_ID, DEV_USER_ID } from '../lib/devUser.js';
import { templatizeCourse } from '../lib/templatize.js';

const router = express.Router();

router.get('/courses', async (req, res) => {
  const result = await pool.query(
    `SELECT id, title, status, updated_at, is_template
     FROM courses
     WHERE organisation_id = $1 AND is_template = false AND status != 'deleted'
     ORDER BY updated_at DESC`,
    [DEV_ORG_ID]
  );
  res.json(result.rows);
});

router.get('/templates', async (req, res) => {
  const result = await pool.query(
    `SELECT id, title, template_scope, updated_at
     FROM courses
     WHERE organisation_id = $1 AND is_template = true AND status != 'deleted'
     ORDER BY updated_at DESC`,
    [DEV_ORG_ID]
  );
  res.json(result.rows);
});

router.get('/courses/:id', async (req, res) => {
  const result = await pool.query(`SELECT * FROM courses WHERE id = $1 AND organisation_id = $2`, [
    req.params.id,
    DEV_ORG_ID,
  ]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }
  res.json(result.rows[0]);
});

router.post('/courses', async (req, res) => {
  const { title, course_json } = req.body;
  const result = await pool.query(
    `INSERT INTO courses (organisation_id, title, course_json, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [DEV_ORG_ID, title || 'Untitled Course', course_json || {}, DEV_USER_ID]
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/courses/:id', async (req, res) => {
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
  res.json(result.rows[0]);
});

router.delete('/courses/:id', async (req, res) => {
  await pool.query(`UPDATE courses SET status = 'deleted', updated_at = now() WHERE id = $1 AND organisation_id = $2`, [
    req.params.id,
    DEV_ORG_ID,
  ]);
  res.status(204).end();
});

router.post('/courses/:id/duplicate', async (req, res) => {
  const original = await pool.query(`SELECT * FROM courses WHERE id = $1 AND organisation_id = $2`, [
    req.params.id,
    DEV_ORG_ID,
  ]);
  if (original.rows.length === 0) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }
  const source = original.rows[0];
  const result = await pool.query(
    `INSERT INTO courses (organisation_id, title, course_json, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [DEV_ORG_ID, `${source.title} (Copy)`, source.course_json, DEV_USER_ID]
  );
  res.status(201).json(result.rows[0]);
});

router.post('/courses/:id/save-as-template', async (req, res) => {
  const { template_scope, title } = req.body;
  const original = await pool.query(`SELECT * FROM courses WHERE id = $1 AND organisation_id = $2`, [
    req.params.id,
    DEV_ORG_ID,
  ]);
  if (original.rows.length === 0) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }
  const source = original.rows[0];
  const templatizedJson = templatizeCourse(source.course_json);
  const templateTitle = title || `${source.title} Template`;

  const result = await pool.query(
    `INSERT INTO courses (organisation_id, title, is_template, template_scope, course_json, created_by)
     VALUES ($1, $2, true, $3, $4, $5)
     RETURNING *`,
    [DEV_ORG_ID, templateTitle, template_scope || 'personal', templatizedJson, DEV_USER_ID]
  );
  res.status(201).json(result.rows[0]);
});

export default router;
