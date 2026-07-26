import express from 'express';
import pool from '../db.js';
import { requireAuth, requireRole, ROLES } from '../lib/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = express.Router();
router.use(requireAuth);

// Personal + org-shared templates for this org -- Phase 3 has no per-user
// scoping beyond DEV_USER_ID, so "personal" and "org" templates are both
// just filtered by organisation_id (see DECISIONS.md).
router.get('/page-templates', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM page_templates WHERE organisation_id = $1 ORDER BY created_at DESC`,
    [req.auth.organisationId]
  );
  res.json(result.rows);
}));

router.post('/page-templates', requireRole(ROLES.OWNER, ROLES.EDITOR), asyncHandler(async (req, res) => {
  const { name, scope, page_json } = req.body;
  if (!name || !page_json) {
    res.status(400).json({ error: 'name and page_json are required' });
    return;
  }
  const result = await pool.query(
    `INSERT INTO page_templates (organisation_id, name, scope, created_by, page_json)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [req.auth.organisationId, name, scope || 'personal', req.auth.userId, page_json]
  );
  res.status(201).json(result.rows[0]);
}));

export default router;
