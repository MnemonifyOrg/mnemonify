import express from 'express';
import pool from '../db.js';
import { DEV_USER_ID } from '../lib/devUser.js';

const router = express.Router();

router.get('/users/me', async (req, res) => {
  const result = await pool.query(`SELECT id, email, name, role, onboarding_completed FROM users WHERE id = $1`, [
    DEV_USER_ID,
  ]);
  res.json(result.rows[0]);
});

router.patch('/users/me', async (req, res) => {
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
  values.push(DEV_USER_ID);
  const result = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, email, name, role, onboarding_completed`,
    values
  );
  res.json(result.rows[0]);
});

export default router;
