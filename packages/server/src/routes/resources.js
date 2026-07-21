import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';
import { DEV_ORG_ID } from '../lib/devUser.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validateFileSignature } from '../lib/fileSignature.js';

const router = express.Router();
const UPLOADS_DIR = path.resolve(import.meta.dirname, '..', '..', 'uploads');
const MAX_RESOURCE_BYTES = 50 * 1024 * 1024; // 50MB per file (Step 2, this session)

// Allowed course-resource file types. Kind is derived from the file's own
// extension (not the client-declared mimetype, which varies by browser/OS
// for these formats and is trivially spoofable either way) -- extension
// picks the CLAIMED kind, and validateFileSignature then checks the
// file's actual leading bytes match what that kind's container format
// requires, which is the check that actually matters for security.
const RESOURCE_KIND_BY_EXT = {
  '.pdf': 'pdf',
  '.doc': 'doc',
  '.docx': 'docx',
  '.xls': 'xls',
  '.xlsx': 'xlsx',
  '.ppt': 'ppt',
  '.pptx': 'pptx',
  '.zip': 'zip',
  '.txt': 'txt',
};

function detectResourceKind(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  return RESOURCE_KIND_BY_EXT[ext] || null;
}

function resourceUploadsDir(courseId) {
  return path.join(UPLOADS_DIR, courseId, 'resources');
}

// Guards against overwriting an existing file with the same name by
// suffixing a short id when a collision would occur -- same pattern as
// routes/assets.js's own uniqueFilename, duplicated locally rather than
// imported since assets.js doesn't export it and this is a small enough
// helper that a shared-module extraction isn't worth the coupling.
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

async function insertResource({ courseId, filename, filePath, label, sizeBytes }) {
  const resourceId = `res_${uuidv4().slice(0, 8)}`;
  const result = await pool.query(
    `INSERT INTO resources (organisation_id, course_id, resource_id, filename, file_path, label, size_bytes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [DEV_ORG_ID, courseId, resourceId, filename, filePath, label || filename, sizeBytes]
  );
  const row = result.rows[0];
  // pg returns a BIGINT column (size_bytes) as a JS string, not a number,
  // to avoid silent precision loss above Number.MAX_SAFE_INTEGER -- fine
  // for a 50MB-capped upload (MAX_RESOURCE_BYTES), but course.schema.json
  // requires size_bytes to be a real integer once it's copied into
  // course_json.meta.resources[] (CourseEditor.jsx's handleAddCourseResource),
  // so it's cast back to a number here, at the one place a resource row is
  // ever newly created. Found during the Phase 4.5a migration work when
  // real schema validation ran for the first time ever against existing
  // course data -- see DECISIONS.md.
  return { ...row, size_bytes: Number(row.size_bytes) };
}

export async function upsertGeneratedResource({ courseId, filename, filePath, label, sizeBytes, resourceKind }) {
  await pool.query(
    `DELETE FROM resources WHERE course_id = $1 AND source = 'generated' AND resource_kind = $2 AND filename = $3`,
    [courseId, resourceKind, filename]
  );
  const resourceId = `res_${uuidv4().slice(0, 8)}`;
  const result = await pool.query(
    `INSERT INTO resources (organisation_id, course_id, resource_id, filename, file_path, label, size_bytes, source, resource_kind)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'generated', $8) RETURNING *`,
    [DEV_ORG_ID, courseId, resourceId, filename, filePath, label || filename, sizeBytes, resourceKind]
  );
  return { ...result.rows[0], size_bytes: Number(result.rows[0].size_bytes) };
}

router.get('/courses/:courseId/resources', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT r.resource_id, r.filename, r.file_path, r.label, r.size_bytes, r.created_at AS uploaded_at, r.source, r.resource_kind
     FROM resources r
     JOIN courses c ON c.id = r.course_id
     WHERE r.course_id = $1
       AND r.organisation_id = $2
       AND (
         r.source <> 'generated'
         OR COALESCE((c.course_json->'meta'->'pdf_settings'->>'enabled')::boolean, true)
       )
     ORDER BY r.created_at ASC`,
    [req.params.courseId, DEV_ORG_ID]
  );
  res.json(result.rows.map((row) => ({ ...row, size_bytes: Number(row.size_bytes) })));
}));

const singleUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESOURCE_BYTES },
});

router.post('/resources/upload', singleUpload.single('file'), async (req, res) => {
  // Express 4 does not catch rejected promises from async handlers (see
  // routes/assets.js's own comment on this, and DECISIONS.md's Step 0
  // root-cause entry) -- every failure path below must produce a response.
  try {
    const { course_id, label } = req.body;
    if (!req.file || !course_id) {
      res.status(400).json({ error: 'file and course_id are required' });
      return;
    }
    const kind = detectResourceKind(req.file.originalname);
    if (!kind) {
      res.status(400).json({
        error:
          'Unsupported file type. Allowed: PDF, Word (.doc/.docx), Excel (.xls/.xlsx), PowerPoint (.ppt/.pptx), ZIP, and plain text (.txt).',
      });
      return;
    }
    if (req.file.size > MAX_RESOURCE_BYTES) {
      res.status(400).json({ error: 'File exceeds the 50MB limit for course resources.' });
      return;
    }
    const signatureError = validateFileSignature(req.file.buffer, kind);
    if (signatureError) {
      res.status(400).json({ error: signatureError });
      return;
    }

    const dir = resourceUploadsDir(course_id);
    fs.mkdirSync(dir, { recursive: true });
    const filename = uniqueFilename(dir, req.file.originalname);
    fs.writeFileSync(path.join(dir, filename), req.file.buffer);

    const resource = await insertResource({
      courseId: course_id,
      filename,
      filePath: `${course_id}/resources/${filename}`,
      label: label || req.file.originalname,
      sizeBytes: req.file.size,
    });
    res.status(201).json(resource);
  } catch (err) {
    console.error('[resources] upload failed:', err);
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
});

// Matched by the server-generated resource_id (not the DB primary key) --
// that's the only id the editor ever holds, since it's what's mirrored
// into course_json.meta.resources[] on upload; unlike assets.js's
// :assetId (which matches the DB `id`), there's no separate DB-only id
// the client would otherwise need to track.
router.patch('/resources/:resourceId', asyncHandler(async (req, res) => {
  const { label } = req.body;
  if (label === undefined) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  const result = await pool.query(
    `UPDATE resources SET label = $1 WHERE resource_id = $2 AND organisation_id = $3 RETURNING *`,
    [label, req.params.resourceId, DEV_ORG_ID]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  res.json(result.rows[0]);
}));

router.delete('/resources/:resourceId', asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM resources WHERE resource_id = $1 AND organisation_id = $2`, [
    req.params.resourceId,
    DEV_ORG_ID,
  ]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  const resource = result.rows[0];
  const filePath = path.join(UPLOADS_DIR, resource.file_path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  await pool.query(`DELETE FROM resources WHERE resource_id = $1`, [resource.resource_id]);
  res.status(204).end();
}));

export default router;
