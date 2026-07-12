import express from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';
import { DEV_ORG_ID } from '../lib/devUser.js';

const router = express.Router();
const UPLOADS_DIR = path.resolve(import.meta.dirname, '..', '..', 'uploads');
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB per file
const MAX_ZIP_BYTES = 500 * 1024 * 1024; // 500MB per ZIP
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);

function courseUploadsDir(courseId) {
  return path.join(UPLOADS_DIR, courseId);
}

// Guards against overwriting an existing file with the same name by
// suffixing a short id when a collision would occur.
function uniqueFilename(dir, originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  let candidate = originalName;
  let attempt = 0;
  while (fs.existsSync(path.join(dir, candidate))) {
    attempt += 1;
    candidate = `${base}-${uuidv4().slice(0, 8)}${ext}`;
    if (attempt > 5) break;
  }
  return candidate;
}

async function insertAsset({ courseId, kind, filename, filePath, alt, caption }) {
  const assetId = `ast_${uuidv4().slice(0, 8)}`;
  const result = await pool.query(
    `INSERT INTO assets (organisation_id, course_id, asset_id, kind, filename, file_path, alt, caption)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [DEV_ORG_ID, courseId, assetId, kind, filename, filePath, alt || '', caption || '']
  );
  return result.rows[0];
}

const singleUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

router.post('/assets/upload', singleUpload.single('file'), async (req, res) => {
  // Express 4 does not catch rejected promises from async handlers -- an
  // uncaught error here previously left the request hanging forever
  // (client stuck on "Uploading...", see DECISIONS.md). Every failure
  // path below must produce a response.
  try {
    const { course_id, alt, caption } = req.body;
    if (!req.file || !course_id) {
      res.status(400).json({ error: 'file and course_id are required' });
      return;
    }
    if (!IMAGE_MIME_TYPES.has(req.file.mimetype)) {
      res.status(400).json({ error: `Unsupported file type: ${req.file.mimetype}` });
      return;
    }

    const dir = courseUploadsDir(course_id);
    fs.mkdirSync(dir, { recursive: true });
    const filename = uniqueFilename(dir, req.file.originalname);
    fs.writeFileSync(path.join(dir, filename), req.file.buffer);

    const asset = await insertAsset({
      courseId: course_id,
      kind: 'image',
      filename,
      filePath: `${course_id}/${filename}`,
      alt,
      caption,
    });
    res.status(201).json(asset);
  } catch (err) {
    console.error('[assets] upload failed:', err);
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
});

const bulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ZIP_BYTES },
});

router.post('/assets/bulk', bulkUpload.fields([{ name: 'files', maxCount: 200 }, { name: 'zip', maxCount: 1 }]), async (req, res) => {
  const courseId = req.body.course_id;
  if (!courseId) {
    res.status(400).json({ error: 'course_id is required' });
    return;
  }

  const dir = courseUploadsDir(courseId);
  fs.mkdirSync(dir, { recursive: true });
  const created = [];
  const skipped = [];

  if (req.files?.zip?.[0]) {
    const zip = new AdmZip(req.files.zip[0].buffer);
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const ext = path.extname(entry.entryName).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) {
        skipped.push({ filename: entry.entryName, reason: 'not a supported image type' });
        continue;
      }
      const data = entry.getData();
      if (data.length > MAX_FILE_BYTES) {
        skipped.push({ filename: entry.entryName, reason: 'exceeds 10MB per-file limit' });
        continue;
      }
      const filename = uniqueFilename(dir, path.basename(entry.entryName));
      fs.writeFileSync(path.join(dir, filename), data);
      created.push(
        await insertAsset({ courseId, kind: 'image', filename, filePath: `${courseId}/${filename}` })
      );
    }
  }

  if (req.files?.files) {
    for (const file of req.files.files) {
      if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
        skipped.push({ filename: file.originalname, reason: `unsupported file type: ${file.mimetype}` });
        continue;
      }
      const filename = uniqueFilename(dir, file.originalname);
      fs.writeFileSync(path.join(dir, filename), file.buffer);
      created.push(
        await insertAsset({ courseId, kind: 'image', filename, filePath: `${courseId}/${filename}` })
      );
    }
  }

  res.status(201).json({ created, skipped });
});

router.get('/assets/:courseId', async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM assets WHERE course_id = $1 AND organisation_id = $2 ORDER BY created_at ASC`,
    [req.params.courseId, DEV_ORG_ID]
  );
  res.json(result.rows);
});

router.patch('/assets/:assetId', async (req, res) => {
  const { alt, caption } = req.body;
  const fields = [];
  const values = [];
  let i = 1;
  if (alt !== undefined) {
    fields.push(`alt = $${i++}`);
    values.push(alt);
  }
  if (caption !== undefined) {
    fields.push(`caption = $${i++}`);
    values.push(caption);
  }
  if (fields.length === 0) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  values.push(req.params.assetId, DEV_ORG_ID);
  const result = await pool.query(
    `UPDATE assets SET ${fields.join(', ')} WHERE id = $${i++} AND organisation_id = $${i} RETURNING *`,
    values
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }
  res.json(result.rows[0]);
});

router.delete('/assets/:assetId', async (req, res) => {
  const result = await pool.query(`SELECT * FROM assets WHERE id = $1 AND organisation_id = $2`, [
    req.params.assetId,
    DEV_ORG_ID,
  ]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }
  const asset = result.rows[0];
  const filePath = path.join(UPLOADS_DIR, asset.file_path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  await pool.query(`DELETE FROM assets WHERE id = $1`, [asset.id]);
  res.status(204).end();
});

export default router;
