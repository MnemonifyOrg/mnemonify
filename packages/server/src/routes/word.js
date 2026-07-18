import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import pool from '../db.js';
import { DEV_ORG_ID, DEV_USER_ID } from '../lib/devUser.js';
import { buildTemplateWordDoc } from '../lib/wordExport.js';
import { parseTables } from '../lib/htmlTableParser.js';
import { applyFieldValue } from '../lib/wordFieldMap.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/templates/:id/export-word', asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM courses WHERE id = $1 AND organisation_id = $2 AND is_template = true`, [
    req.params.id,
    DEV_ORG_ID,
  ]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  const template = result.rows[0];
  const pages = template.course_json?.pages || [];
  console.log(`[word-export] course_id=${template.id} pages=${pages.length} blocksOnFirstPage=${pages[0]?.blocks?.length ?? 0}`);
  const buffer = await buildTemplateWordDoc(template);

  res.setHeader('Content-Disposition', `attachment; filename="${template.title.replace(/[^\w.-]+/g, '_')}.docx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.send(buffer);
}));

router.post('/courses/import-word', upload.single('file'), asyncHandler(async (req, res) => {
  const { template_id } = req.body;
  if (!req.file || !template_id) {
    res.status(400).json({ error: 'file and template_id are required' });
    return;
  }

  const templateResult = await pool.query(`SELECT * FROM courses WHERE id = $1 AND organisation_id = $2`, [
    template_id,
    DEV_ORG_ID,
  ]);
  if (templateResult.rows.length === 0) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  const proposedCourseJson = JSON.parse(JSON.stringify(templateResult.rows[0].course_json));

  const { value: html } = await mammoth.convertToHtml({ buffer: req.file.buffer });
  const tables = parseTables(html);

  const mapped = [];
  const flagged = [];
  const skipped = [];

  for (const table of tables) {
    const [header, ...dataRows] = table;
    if (!header || header.length < 4) continue; // not one of our tables
    for (const row of dataRows) {
      const [, field, content, notes] = row;
      if (!notes || !notes.includes(':')) {
        skipped.push({ row, reason: 'Notes column missing or malformed -- cannot map without a Mnemonify-generated Notes value' });
        continue;
      }
      const separatorIndex = notes.indexOf(':');
      const blockId = notes.slice(0, separatorIndex);
      const fieldName = notes.slice(separatorIndex + 1);

      const { applied, oldValue } = applyFieldValue(proposedCourseJson, blockId, fieldName, content);
      if (applied) {
        mapped.push({ block_id: blockId, field_name: fieldName, old_value: oldValue, new_value: content });
      } else if ((fieldName === 'alt' || fieldName === 'caption') && content) {
        flagged.push({
          row: `${field}: ${content}`,
          reason: 'This block has no image uploaded yet -- upload the image in the editor first, then set alt text/caption there',
        });
      } else if ((fieldName === 'alt' || fieldName === 'caption') && !content) {
        // Blank alt/caption on a not-yet-uploaded image is expected, not an error.
      } else {
        flagged.push({ row: `${field}: ${content}`, reason: `Could not find block "${blockId}" field "${fieldName}" in this template` });
      }
    }
  }

  res.json({ mapped, flagged, skipped, proposed_course_json: proposedCourseJson });
}));

router.post('/courses/import-word/confirm', asyncHandler(async (req, res) => {
  const { proposed_course_json, title } = req.body;
  const result = await pool.query(
    `INSERT INTO courses (organisation_id, title, course_json, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [DEV_ORG_ID, title || 'Untitled Course', proposed_course_json, DEV_USER_ID]
  );
  res.status(201).json(result.rows[0]);
}));

export default router;
