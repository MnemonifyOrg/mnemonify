import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import coursesRouter from './routes/courses.js';
import assetsRouter from './routes/assets.js';
import usersRouter from './routes/users.js';
import wordRouter from './routes/word.js';
import pageTemplatesRouter from './routes/pageTemplates.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
app.use('/api', usersRouter);
app.use('/api', wordRouter);
app.use('/api', pageTemplatesRouter);
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/content/:courseId', (req, res) => {
  const coursePath = COURSES[req.params.courseId];
  if (!coursePath || !fs.existsSync(coursePath)) {
    res.status(404).json({ error: `Unknown courseId "${req.params.courseId}"` });
    return;
  }
  res.type('application/json').sendFile(coursePath);
});

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

app.listen(PORT, () => {
  console.log(`[server] Mnemonify content server listening on port ${PORT}`);
  console.log(`[server] CONTENT_BASE_URL=${CONTENT_BASE_URL}`);
});
