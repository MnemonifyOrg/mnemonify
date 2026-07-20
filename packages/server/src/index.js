import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import coursesRouter, { loadAndMigrateCourseRow } from './routes/courses.js';
import assetsRouter from './routes/assets.js';
import resourcesRouter from './routes/resources.js';
import usersRouter from './routes/users.js';
import wordRouter from './routes/word.js';
import pageTemplatesRouter from './routes/pageTemplates.js';
import analyticsRouter from './routes/analytics.js';
import pool from './db.js';
import { DEV_ORG_ID } from './lib/devUser.js';
import { asyncHandler } from './lib/asyncHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// See db.js for why this must be an explicit path rather than relying on
// process.cwd() -- same bug, same fix, kept consistent between the two
// files that each call dotenv.config() independently.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const PORT = process.env.PORT || 3001;
const CONTENT_BASE_URL = process.env.CONTENT_BASE_URL || 'http://localhost:3001';

const PLAYER_DIST_DIR = path.resolve(__dirname, '../../player/dist');
const PLAYER_ASSETS_DIR = path.resolve(__dirname, '../../player/public/assets');
const SAMPLES_DIR = path.resolve(__dirname, '../../../samples');
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const COURSES = {
  sample: path.join(SAMPLES_DIR, 'sample-course.json'),
};

const app = express();

// Allow this content to be framed by any LMS (SCORM Cloud, Ethos, or a
// self-hoster's own LMS) launcher, on every route. Note: X-Frame-Options
// has no standard "allow all" value -- only DENY, SAMEORIGIN, and the
// deprecated/unsupported ALLOW-FROM. The standards-compliant way to allow
// framing from any origin is to omit X-Frame-Options and set
// Content-Security-Policy: frame-ancestors, which modern browsers (Safari
// included) treat as authoritative over X-Frame-Options when both are
// present. TODO(Phase 6 security hardening): tighten frame-ancestors to
// specific known LMS domains instead of *.
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  next();
});

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', coursesRouter);
app.use('/api', assetsRouter);
app.use('/api', resourcesRouter);
app.use('/api', usersRouter);
app.use('/api', wordRouter);
app.use('/api', pageTemplatesRouter);
app.use('/api', analyticsRouter);
app.use('/uploads', express.static(UPLOADS_DIR));

// Serves course content to the SCORM launcher and the player's own
// standalone (non-preview) fetch (packages/player/src/App.jsx). Two
// sources: the hardcoded COURSES map below (today just the Phase 2
// "sample" fixture, unchanged from its original behavior) for a known
// static-file courseId, and -- for anything else -- a real authored
// course looked up from the same `courses` table the editor reads,
// pushed through the identical load-and-migrate path GET /api/courses/:id
// uses (loadAndMigrateCourseRow, courses.js) rather than a second,
// divergent implementation. A course served here for SCORM testing must
// be migrated the same way the editor opens it -- serving a raw,
// unmigrated document would let a learner-facing session see a shape the
// editor itself would never show an author.
app.get('/content/:courseId', asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const staticPath = COURSES[courseId];
  if (staticPath) {
    if (!fs.existsSync(staticPath)) {
      res.status(404).json({ error: `Unknown courseId "${courseId}"` });
      return;
    }
    res.type('application/json').sendFile(staticPath);
    return;
  }

  const result = await pool.query(`SELECT * FROM courses WHERE id = $1 AND organisation_id = $2`, [
    courseId,
    DEV_ORG_ID,
  ]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: `No course found with id "${courseId}".` });
    return;
  }
  const row = await loadAndMigrateCourseRow(result.rows[0]);
  res.json(row.course_json);
}));

app.use('/assets', express.static(PLAYER_ASSETS_DIR));

app.get('/player', (req, res) => {
  const indexPath = path.join(PLAYER_DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    res.status(503).send('Player bundle not built yet. Run "npm run build" in packages/player.');
    return;
  }
  res.sendFile(indexPath);
});

app.use(express.static(PLAYER_DIST_DIR));

// Global error handler (must be registered last). Route handlers that
// throw or reject are individually responsible for their own try/catch
// (Express 4 does not auto-catch async rejections), but this is the
// safety net for middleware-level errors -- e.g. multer's file-size
// limit -- that call next(err) before a route handler ever runs. Without
// this, such requests would hang instead of returning an error response.
app.use((err, req, res, next) => {
  console.error('[server] unhandled error:', err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Process-level safety nets (Step 0 root-cause fix, see DECISIONS.md).
// Every route handler is now wrapped in asyncHandler (forwards rejections
// to the error middleware above), and db.js's pool has its own 'error'
// listener, so in normal operation neither of these should ever fire --
// they exist as a last-resort net against whatever wasn't anticipated,
// logging instead of letting Node's default behavior (silently or
// fatally terminating the process) hide the actual cause next time.
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection (process continues):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception (process continues):', err);
});

const server = app.listen(PORT, () => {
  console.log(`[server] Mnemonify content server listening on port ${PORT}`);
  console.log(`[server] CONTENT_BASE_URL=${CONTENT_BASE_URL}`);
});

// Without this, a port conflict (a stale process from a previous session
// still holding PORT -- confirmed to happen repeatedly in this environment,
// see DECISIONS.md) throws an unhandled 'error' event on the server object,
// which crashes the process with a stack trace that's easy to miss in
// scrollback and easy to misread as "the server started, then died" rather
// than "the server never actually bound the port at all."
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] Port ${PORT} is already in use by another process. This server did NOT start. Find and stop the other process (e.g. "lsof -i :${PORT}") before retrying.`);
    process.exit(1);
  } else {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
});
