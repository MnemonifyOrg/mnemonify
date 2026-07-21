import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import puppeteer from 'puppeteer';
import pool from '../db.js';
import { DEV_ORG_ID } from './devUser.js';
import { upsertGeneratedResource } from '../routes/resources.js';

const UPLOADS_DIR = path.resolve(import.meta.dirname, '..', '..', 'uploads');
const jobs = new Set();

function safeName(value) {
  return String(value || 'course').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function loadCourse(courseId) {
  const result = await pool.query(`SELECT title, course_json FROM courses WHERE id = $1 AND organisation_id = $2`, [courseId, DEV_ORG_ID]);
  if (!result.rows.length) throw new Error(`Course ${courseId} not found`);
  return result.rows[0];
}

async function renderPage(browser, courseId, pageId, worksheet) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  const params = new URLSearchParams({ courseId, preview: 'true', print: '1', page_id: pageId });
  if (worksheet) params.set('worksheet', '1');
  await page.goto(`http://localhost:${process.env.PORT || 3001}/player?${params}`, { waitUntil: 'networkidle0', timeout: 120000 });
  await new Promise((resolve) => setTimeout(resolve, 250));
  await page.waitForFunction(() => window.__MNEMONIFY_BOOTED__ === true && (window.__MNEMONIFY_CAPTIONS_PENDING__ || 0) === 0, { timeout: 120000 });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = img.onerror = resolve; })));
  });
  const pdf = await page.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true, margin: { top: '0.55in', right: '0.55in', bottom: '0.55in', left: '0.55in' } });
  await page.close();
  return pdf;
}

async function mergePdfs(buffers) {
  const output = await PDFDocument.create();
  for (const buffer of buffers) {
    const source = await PDFDocument.load(buffer);
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach((page) => output.addPage(page));
  }
  return Buffer.from(await output.save());
}

async function savePdf(courseId, filename, label, kind, buffer) {
  const dir = path.join(UPLOADS_DIR, courseId, 'resources');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return upsertGeneratedResource({ courseId, filename, filePath: `${courseId}/resources/${filename}`, label, sizeBytes: buffer.length, resourceKind: kind });
}

export async function generateCoursePdfs(courseId, { worksheet = false } = {}) {
  const course = await loadCourse(courseId);
  const settings = course.course_json.meta?.pdf_settings || {};
  if (!worksheet && settings.enabled === false) return { skipped: true };
  const mode = worksheet ? 'combined' : (settings.mode || 'both');
  await pool.query(`DELETE FROM resources WHERE course_id = $1 AND source = 'generated' AND resource_kind IN ('combined_pdf', 'page_pdf', 'worksheet_pdf')`, [courseId]);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const pages = course.course_json.pages || [];
    const rendered = [];
    for (const page of pages) rendered.push(await renderPage(browser, courseId, page.page_id, worksheet));
    const base = safeName(course.title);
    const outputs = [];
    if (mode === 'combined' || mode === 'both') {
      const buffer = await mergePdfs(rendered);
      outputs.push(await savePdf(courseId, worksheet ? `${base}-worksheet.pdf` : `${base}.pdf`, worksheet ? 'Worksheet' : 'Course PDF', worksheet ? 'worksheet_pdf' : 'combined_pdf', buffer));
    }
    if (!worksheet && (mode === 'per_page' || mode === 'both')) {
      for (let i = 0; i < rendered.length; i += 1) {
        const page = pages[i];
        outputs.push(await savePdf(courseId, `${base}-page-${i + 1}.pdf`, `Page ${i + 1}: ${page.title}`, 'page_pdf', rendered[i]));
      }
    }
    return { outputs };
  } finally {
    await browser.close();
  }
}

export function queueCoursePdfs(courseId, options = {}) {
  const key = `${courseId}:${options.worksheet ? 'worksheet' : 'publish'}`;
  if (jobs.has(key)) return false;
  jobs.add(key);
  generateCoursePdfs(courseId, options)
    .catch((error) => console.error(`[pdf] generation failed for ${courseId}:`, error))
    .finally(() => jobs.delete(key));
  return true;
}
