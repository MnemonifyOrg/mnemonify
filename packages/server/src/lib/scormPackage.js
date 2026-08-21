import fs from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { buildManifest, getCourseTitle } from '../../../../packages/launcher/manifest.js';
import { mergeCourseResources } from './courseResources.js';
import { storageKeyFromAssetSrc, storageKeyFromResourcePath } from './storage.js';

const PLAYER_DIST_DIR = path.resolve(import.meta.dirname, '../../../../packages/player/dist');
const SCORM_BRIDGE_PATH = path.resolve(import.meta.dirname, '../../../../packages/launcher/template/scorm-api.js');

function safeFilename(value, fallback = 'file') {
  const base = path.basename(String(value || fallback)).replace(/[^a-zA-Z0-9._-]+/g, '-');
  return base || fallback;
}

function scriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

async function filesUnder(rootDir, currentDir = rootDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(currentDir, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(rootDir, absolute));
    else files.push({ absolute, relative: path.relative(rootDir, absolute).split(path.sep).join('/') });
  }
  return files;
}

function collectEmbedUrls(value, found = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEmbedUrls(item, found));
    return found;
  }
  if (!value || typeof value !== 'object') return found;
  if (value.type === 'embed' && typeof value.content?.url === 'string') {
    try {
      const url = new URL(value.content.url);
      if (['http:', 'https:'].includes(url.protocol)) found.push(url.toString());
    } catch {
      // Invalid embed URLs are already handled by the editor/player; they do
      // not need to be reported as an external runtime dependency here.
    }
  }
  Object.values(value).forEach((child) => collectEmbedUrls(child, found));
  return found;
}

export function findExternalEmbeds(courseJson) {
  const urls = [...new Set(collectEmbedUrls(courseJson))];
  const hosts = [...new Set(urls.map((url) => new URL(url).hostname))];
  if (!hosts.length) return [];
  return [
    `This course contains ${urls.length} external embed${urls.length === 1 ? '' : 's'} (${hosts.join(', ')}). These embeds will still require internet access at runtime, even in this self-contained package.`,
  ];
}

export function rewriteCourseForPackage(courseJson, { assets = [], resources = [] } = {}) {
  const rewritten = structuredClone(courseJson);
  const assetRows = new Map(assets.map((asset) => [asset.asset_id, asset]));
  const resourceRows = new Map(resources.map((resource) => [resource.resource_id, resource]));
  const assetFiles = [];
  const resourceFiles = [];

  rewritten.assets = (rewritten.assets || []).map((asset) => {
    const row = assetRows.get(asset.asset_id);
    if (!row) throw new Error(`SCORM export cannot find asset ${asset.asset_id} in the database.`);
    const relativePath = `course-assets/${asset.asset_id}/${safeFilename(row.filename || asset.filename, asset.asset_id)}`;
    assetFiles.push({ row, relativePath });
    return { ...asset, src: relativePath };
  });

  const existingResources = rewritten.meta?.resources || [];
  if (rewritten.meta) {
    rewritten.meta.resources = existingResources.map((resource) => {
      const row = resourceRows.get(resource.resource_id);
      const storagePath = row?.file_path || storageKeyFromResourcePath(resource.file_path);
      if (!storagePath) throw new Error(`SCORM export cannot resolve resource ${resource.resource_id || resource.filename}.`);
      const relativePath = `resources/${resource.resource_id}/${safeFilename(row?.filename || resource.filename, resource.resource_id || 'resource')}`;
      resourceFiles.push({ row: row || { ...resource, file_path: storagePath }, relativePath });
      return { ...resource, file_path: relativePath };
    });
  }

  return { courseJson: rewritten, assetFiles, resourceFiles };
}

function renderPackageIndex(playerIndex, courseJson, captionManifest) {
  const embeddedScript = `<script src="scorm-api.js"></script><script>window.__MNEMONIFY_EMBEDDED__=true;window.__MNEMONIFY_COURSE_DATA__=${scriptJson(courseJson)};window.__MNEMONIFY_EMBEDDED_CAPTIONS__=${scriptJson(captionManifest)};</script>`;
  const localIndex = playerIndex
    .replaceAll('="/assets/', '="assets/')
    .replaceAll('="/brand/', '="brand/')
    .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>/, '')
    .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin \/>/, '')
    .replace(/\s*<link\s+href="https:\/\/fonts\.googleapis\.com[^>]+>/, '')
    .replace(/\s*<link rel="(?:icon|apple-touch-icon)"[^>]*>/g, '');
  return localIndex.replace('</head>', `${embeddedScript}\n</head>`);
}

export async function createScormPackage({
  courseId,
  versionId,
  courseJson,
  assets = [],
  resources = [],
  captions = [],
  storage,
  outputPath,
  playerDistDir = PLAYER_DIST_DIR,
  bridgePath = SCORM_BRIDGE_PATH,
}) {
  const playerFiles = await filesUnder(playerDistDir);
  const playerIndexFile = playerFiles.find((file) => file.relative === 'index.html');
  if (!playerIndexFile) throw new Error('SCORM export cannot find packages/player/dist/index.html. Build the player first.');

  const resourceRows = resources.filter((resource) => resource.source !== 'generated' || courseJson.meta?.pdf_settings?.resources_page !== false);
  const mergedCourse = mergeCourseResources(courseJson, resourceRows);
  const { courseJson: embeddedCourse, assetFiles, resourceFiles } = rewriteCourseForPackage(mergedCourse, {
    assets,
    resources: resourceRows,
  });

  const captionManifest = {};
  const captionFiles = [];
  for (const row of captions.filter((caption) => caption.status === 'ready')) {
    const relativePath = `captions/${row.asset_id}.${row.kind === 'caption' ? 'vtt' : 'txt'}`;
    captionManifest[row.asset_id] = { ...(captionManifest[row.asset_id] || {}), [row.kind]: relativePath };
    captionFiles.push({ row, relativePath });
  }

  const warnings = findExternalEmbeds(embeddedCourse);
  const zip = new AdmZip();
  const packageFiles = new Map();
  packageFiles.set('index.html', Buffer.from(renderPackageIndex(await fs.readFile(playerIndexFile.absolute, 'utf8'), embeddedCourse, captionManifest)));
  packageFiles.set('scorm-api.js', await fs.readFile(bridgePath));
  for (const file of playerFiles) {
    if (file.relative === 'index.html') continue;
    packageFiles.set(file.relative, await fs.readFile(file.absolute));
  }

  for (const item of assetFiles) {
    const storagePath = item.row.file_path || storageKeyFromAssetSrc(item.row.src);
    if (!storagePath) throw new Error(`SCORM export cannot resolve storage path for asset ${item.row.asset_id}.`);
    packageFiles.set(item.relativePath, await storage.download(storagePath));
  }
  for (const item of resourceFiles) packageFiles.set(item.relativePath, await storage.download(item.row.file_path));
  for (const item of captionFiles) packageFiles.set(item.relativePath, Buffer.from(item.row.content || '', 'utf8'));
  if (warnings.length) packageFiles.set('export-warnings.txt', Buffer.from(`${warnings.join('\n\n')}\n`, 'utf8'));

  const manifestFiles = [...packageFiles.keys()].sort();
  packageFiles.set('imsmanifest.xml', Buffer.from(buildManifest({
    courseId,
    versionId,
    courseTitle: getCourseTitle(embeddedCourse),
    files: manifestFiles,
  })));
  for (const [relativePath, content] of packageFiles) zip.addFile(relativePath, content);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  zip.writeZip(outputPath);
  return { outputPath, warnings, files: [...packageFiles.keys()].sort(), embeddedCourse };
}
