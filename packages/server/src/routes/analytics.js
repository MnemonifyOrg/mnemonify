import express from 'express';
import pool from '../db.js';
import { DEV_ORG_ID } from '../lib/devUser.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validateAnalyticsEvent } from '../lib/analytics.js';

const router = express.Router();

router.post('/events', asyncHandler(async (req, res) => {
  const error = validateAnalyticsEvent(req.body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const event = req.body;
  const result = await pool.query(
    `INSERT INTO analytics_events
      (organisation_id, event_version, event_type, course_id, course_version,
       page_id, block_id, session_id, actor_hash, payload, occurred_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING event_id, received_at`,
    [
      DEV_ORG_ID, event.event_version, event.event_type, event.course_id,
      event.course_version || null, event.page_id || null, event.block_id || null,
      event.session_id || null, event.actor_hash || null, event.payload || {},
      event.occurred_at || new Date().toISOString(),
    ]
  );
  res.status(202).json(result.rows[0]);
}));

export default router;
