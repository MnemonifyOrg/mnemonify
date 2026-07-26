import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../lib/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = express.Router();
router.use(requireAuth);

router.get('/users/me', asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT id, email, name, onboarding_completed, email_verified_at FROM users WHERE id = $1`, [
    req.auth.userId,
  ]);
  res.json({ ...result.rows[0], role: req.auth.role, organisation_id: req.auth.organisationId, email_verified: Boolean(result.rows[0]?.email_verified_at) });
}));

router.patch('/users/me', asyncHandler(async (req, res) => {
  const { onboarding_completed } = req.body;
  const fields = [];
  const values = [];
  let i = 1;
  if (onboarding_completed !== undefined) {
    fields.push(`onboarding_completed = $${i++}`);
    values.push(onboarding_completed);
  }
  if (fields.length === 0) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  values.push(req.auth.userId);
  const result = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, email, name, onboarding_completed`,
    values
  );
  res.json({ ...result.rows[0], role: req.auth.role, organisation_id: req.auth.organisationId });
}));

export default router;
