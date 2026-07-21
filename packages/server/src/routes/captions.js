import express from 'express';
import multer from 'multer';
import pool from '../db.js';
import { DEV_ORG_ID } from '../lib/devUser.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function timeToSeconds(value) {
  const parts = value.replace(',', '.').split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function secondsToTimestamp(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const rest = ms % 60_000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(Math.floor(rest / 1000)).padStart(2, '0')}.${String(rest % 1000).padStart(3, '0')}`;
}

export function srtToVtt(input) {
  const lines = input.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
  const output = ['WEBVTT', ''];
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\d+$/.test(lines[i].trim()) && lines[i + 1]?.includes('-->')) {
      output.push(lines[i].trim());
      const [start, end] = lines[i + 1].split('-->').map((part) => part.trim());
      output.push(`${secondsToTimestamp(timeToSeconds(start))} --> ${secondsToTimestamp(timeToSeconds(end))}`);
      i += 1;
      while (i + 1 < lines.length && lines[i + 1].trim() !== '') {
        i += 1;
        output.push(lines[i]);
      }
      output.push('');
    }
  }
  return output.join('\n').trimEnd() + '\n';
}

function normalizeVtt(buffer, filename) {
  const input = buffer.toString('utf8');
  if (filename.toLowerCase().endsWith('.srt')) return srtToVtt(input);
  if (!/^WEBVTT(?:\s|$)/i.test(input.trimStart())) throw new Error('Caption file must be WebVTT or SRT.');
  return input.replace(/^\uFEFF/, '').trimEnd() + '\n';
}

router.get('/assets/:assetId/captions', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT kind, content, source, review_status, status, error_message, generated_at, updated_at
       FROM captions WHERE organisation_id = $1 AND asset_id = $2 ORDER BY kind`,
    [DEV_ORG_ID, req.params.assetId]
  );
  res.json(result.rows);
}));

router.get('/assets/:assetId/captions/caption.vtt', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT content FROM captions
      WHERE organisation_id = $1 AND asset_id = $2 AND kind = 'caption' AND status = 'ready'`,
    [DEV_ORG_ID, req.params.assetId]
  );
  if (result.rows.length === 0) {
    res.status(404).send('Caption file not available.');
    return;
  }
  res.type('text/vtt').send(result.rows[0].content);
}));

router.patch('/assets/:assetId/captions/:kind', asyncHandler(async (req, res) => {
  const { content, review_status: reviewStatus } = req.body;
  if (!['caption', 'transcript'].includes(req.params.kind) || typeof content !== 'string') {
    res.status(400).json({ error: 'kind must be caption or transcript, and content must be a string.' });
    return;
  }
  const result = await pool.query(
    `UPDATE captions SET content = $1, status = 'ready', review_status = $2,
            source = COALESCE(source, 'whisper'), error_message = '', updated_at = now()
      WHERE organisation_id = $3 AND asset_id = $4 AND kind = $5 RETURNING *`,
    [content, reviewStatus === 'reviewed' ? 'reviewed' : 'draft', DEV_ORG_ID, req.params.assetId, req.params.kind]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Caption or transcript not found.' });
    return;
  }
  res.json(result.rows[0]);
}));

router.post('/assets/:assetId/captions/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'A .vtt or .srt file is required.' });
    return;
  }
  let content;
  try {
    content = normalizeVtt(req.file.buffer, req.file.originalname);
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  const result = await pool.query(
    `UPDATE captions SET content = $1, source = 'manual', status = 'ready',
            review_status = 'draft', error_message = '', generated_at = now(), updated_at = now()
      WHERE organisation_id = $2 AND asset_id = $3 AND kind = 'caption' RETURNING *`,
    [content, DEV_ORG_ID, req.params.assetId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Caption record not found for this asset.' });
    return;
  }
  res.json(result.rows[0]);
}));

export default router;
