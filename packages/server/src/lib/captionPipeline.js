import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../db.js';
import { DEV_ORG_ID } from './devUser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, '../..');
const UPLOADS_DIR = path.join(SERVER_DIR, 'uploads');
const PYTHON_BIN = process.env.WHISPER_PYTHON || path.join(SERVER_DIR, '.venv', 'bin', 'python3');
const TRANSCRIBE_SCRIPT = path.join(__dirname, 'transcribe.py');
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'tiny';

function timestamp(seconds) {
  const totalMs = Math.max(0, Math.round(Number(seconds || 0) * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const remaining = totalMs % 60_000;
  const wholeSeconds = Math.floor(remaining / 1000);
  const milliseconds = remaining % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

export function segmentsToVtt(segments) {
  const cues = segments.map((segment, index) => `${index + 1}\n${timestamp(segment.start)} --> ${timestamp(segment.end)}\n${segment.text.trim()}`).join('\n\n');
  return `WEBVTT\n\n${cues}${cues ? '\n' : ''}`;
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} exited with code ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

async function extractAudio(inputPath, outputPath) {
  await runProcess('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', inputPath, '-vn', '-ac', '1', '-ar', '16000', outputPath]);
}

async function createGeneratingRows(asset) {
  await pool.query(
    `INSERT INTO captions (organisation_id, course_id, asset_id, kind, source, status)
     VALUES ($1, $2, $3, 'caption', 'whisper', 'generating'),
            ($1, $2, $3, 'transcript', 'whisper', 'generating')
     ON CONFLICT (organisation_id, course_id, asset_id, kind)
     DO UPDATE SET source = 'whisper', status = 'generating', error_message = '', updated_at = now()`,
    [DEV_ORG_ID, asset.course_id, asset.asset_id]
  );
}

async function saveSuccess(asset, result) {
  const vtt = segmentsToVtt(result.segments);
  await pool.query(
    `UPDATE captions
        SET content = CASE WHEN kind = 'caption' THEN $1 ELSE $2 END,
            source = 'whisper', status = 'ready', review_status = 'draft',
            error_message = '', generated_at = now(), updated_at = now()
      WHERE organisation_id = $3 AND course_id = $4 AND asset_id = $5`,
    [vtt, result.text, DEV_ORG_ID, asset.course_id, asset.asset_id]
  );
}

async function saveFailure(asset, error) {
  await pool.query(
    `UPDATE captions SET status = 'failed', error_message = $1, updated_at = now()
      WHERE organisation_id = $2 AND course_id = $3 AND asset_id = $4`,
    [error.message || String(error), DEV_ORG_ID, asset.course_id, asset.asset_id]
  );
}

export async function transcribeAsset(asset) {
  const inputPath = path.join(UPLOADS_DIR, asset.file_path);
  const workDir = await fs.mkdtemp(path.join(UPLOADS_DIR, '.caption-'));
  const audioPath = path.join(workDir, 'audio.wav');
  try {
    await extractAudio(inputPath, audioPath);
    const raw = await runProcess(PYTHON_BIN, [TRANSCRIBE_SCRIPT, audioPath, WHISPER_MODEL]);
    const result = JSON.parse(raw.trim());
    await saveSuccess(asset, result);
    console.log(`[captions] generated ${asset.asset_id} with local Whisper (${WHISPER_MODEL})`);
  } catch (error) {
    console.error(`[captions] transcription failed for ${asset.asset_id}:`, error);
    try {
      await saveFailure(asset, error);
    } catch (saveError) {
      console.error(`[captions] could not record failure for ${asset.asset_id}:`, saveError);
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

export async function queueTranscription(asset) {
  await createGeneratingRows(asset);
  // Deliberately do not await this from the upload route: ffmpeg/model load
  // can take minutes on CPU, while the upload response should remain fast.
  void transcribeAsset(asset);
}
