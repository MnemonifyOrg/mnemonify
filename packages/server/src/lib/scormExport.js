import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pool from '../db.js';
import { getStorage } from './storage.js';
import { createScormPackage, findExternalEmbeds } from './scormPackage.js';

const jobs = new Map();

function filenameFor(courseId, versionId) {
  const safeCourseId = String(courseId).replace(/[^a-zA-Z0-9_-]/g, '-');
  return `mnemonify-${safeCourseId}-v${versionId}.zip`;
}

export async function loadLatestPublishedExport(courseId, organisationId) {
  const versionResult = await pool.query(
    `SELECT version_id, course_id, course_json, published_at
       FROM course_versions
      WHERE course_id = $1 AND organisation_id = $2 AND kind = 'published'
      ORDER BY published_at DESC, version_number DESC, created_at DESC
      LIMIT 1`,
    [courseId, organisationId],
  );
  if (!versionResult.rows.length) return null;
  const version = versionResult.rows[0];
  const [assets, resources, captions] = await Promise.all([
    pool.query(
      `SELECT asset_id, filename, file_path, kind
         FROM assets WHERE course_id = $1 AND organisation_id = $2`,
      [courseId, organisationId],
    ),
    pool.query(
      `SELECT resource_id, filename, file_path, label, size_bytes, created_at, source, resource_kind
         FROM resources WHERE course_id = $1 AND organisation_id = $2 ORDER BY created_at ASC`,
      [courseId, organisationId],
    ),
    pool.query(
      `SELECT asset_id, kind, content, status
         FROM captions WHERE course_id = $1 AND organisation_id = $2 AND status = 'ready'`,
      [courseId, organisationId],
    ),
  ]);
  const assetIds = new Set((version.course_json?.assets || []).map((asset) => asset.asset_id));
  return {
    ...version,
    assets: assets.rows,
    resources: resources.rows,
    captions: captions.rows.filter((caption) => assetIds.has(caption.asset_id)),
  };
}

function publicJob(job) {
  return {
    job_id: job.jobId,
    status: job.status,
    warnings: job.warnings,
    filename: job.filename,
    error: job.error || null,
  };
}

async function runJob(job, input) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mnemonify-scorm-'));
  const outputPath = path.join(workDir, job.filename);
  try {
    const result = await createScormPackage({
      courseId: input.course_id,
      versionId: input.version_id,
      courseJson: input.course_json,
      assets: input.assets,
      resources: input.resources,
      captions: input.captions,
      storage: getStorage(),
      outputPath,
    });
    const storageKey = `${input.course_id}/exports/${job.filename}`;
    await getStorage().upload(storageKey, await fs.readFile(outputPath), 'application/zip');
    job.status = 'ready';
    job.storageKey = storageKey;
    job.warnings = result.warnings;
  } catch (error) {
    job.status = 'failed';
    job.error = error.message || String(error);
    console.error(`[scorm-export] package generation failed for ${input.course_id}:`, error);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

export async function startScormExport({ courseId, organisationId }) {
  const input = await loadLatestPublishedExport(courseId, organisationId);
  if (!input) return { notPublished: true };
  const job = {
    jobId: crypto.randomUUID(),
    courseId,
    organisationId,
    status: 'generating',
    warnings: findExternalEmbeds(input.course_json),
    filename: filenameFor(courseId, input.version_id),
  };
  jobs.set(job.jobId, job);
  void runJob(job, input);
  return publicJob(job);
}

export function getScormExportJob({ courseId, organisationId, jobId }) {
  const job = jobs.get(jobId);
  if (!job || job.courseId !== courseId || job.organisationId !== organisationId) return null;
  return job;
}

export function scormExportResponse(job) {
  return publicJob(job);
}

export async function downloadScormExport(job) {
  if (job.status !== 'ready' || !job.storageKey) return null;
  return getStorage().download(job.storageKey);
}
