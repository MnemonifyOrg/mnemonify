import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3001;
const CONTENT_BASE_URL = process.env.CONTENT_BASE_URL || 'http://localhost:3001';

const PLAYER_DIST_DIR = path.resolve(__dirname, '../../player/dist');
const PLAYER_ASSETS_DIR = path.resolve(__dirname, '../../player/public/assets');
const SAMPLES_DIR = path.resolve(__dirname, '../../../samples');

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
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: '*',
  })
);

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

app.listen(PORT, () => {
  console.log(`[server] Mnemonify content server listening on port ${PORT}`);
  console.log(`[server] CONTENT_BASE_URL=${CONTENT_BASE_URL}`);
});
