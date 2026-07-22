import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';
import { buildManifest, getCourseTitle, renderLauncherConfig } from './manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getArg(flagName, envName) {
  const prefix = `--${flagName}=`;
  const cliArg = process.argv.find((a) => a.startsWith(prefix));
  if (cliArg) return cliArg.slice(prefix.length);
  return process.env[envName];
}

const CONTENT_SERVER_URL = getArg('content-server-url', 'CONTENT_SERVER_URL');
const COURSE_ID = getArg('course-id', 'COURSE_ID');
const VERSION_ID = getArg('version-id', 'VERSION_ID');

if (!CONTENT_SERVER_URL || !COURSE_ID || !VERSION_ID) {
  console.error(
    '[launcher build] CONTENT_SERVER_URL, COURSE_ID, and VERSION_ID are required, as env vars or --content-server-url=/--course-id=/--version-id= CLI args.'
  );
  process.exit(1);
}

function zipDirectory(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function main() {
  const templateDir = path.join(__dirname, 'template');
  const distDir = path.join(__dirname, 'dist');
  const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mnemonify-launcher-'));

  fs.cpSync(templateDir, buildDir, { recursive: true });

  const contentUrl = CONTENT_SERVER_URL.replace(/\/$/, '');
  const courseResponse = await fetch(`${contentUrl}/content/${encodeURIComponent(COURSE_ID)}`);
  if (!courseResponse.ok) {
    throw new Error(`Could not load course ${COURSE_ID} from ${contentUrl}/content: HTTP ${courseResponse.status}`);
  }
  const courseTitle = getCourseTitle(await courseResponse.json());

  fs.writeFileSync(
    path.join(buildDir, 'config.json'),
    renderLauncherConfig({ contentServerUrl: CONTENT_SERVER_URL, courseId: COURSE_ID, versionId: VERSION_ID, courseTitle })
  );
  fs.writeFileSync(path.join(buildDir, 'imsmanifest.xml'), buildManifest({ courseId: COURSE_ID, versionId: VERSION_ID, courseTitle }));

  fs.mkdirSync(distDir, { recursive: true });
  const outputPath = path.join(distDir, `mnemonify-${COURSE_ID}-launcher.zip`);
  await zipDirectory(buildDir, outputPath);

  fs.rmSync(buildDir, { recursive: true, force: true });

  console.log(`[launcher build] Wrote ${outputPath}`);
}

main().catch((err) => {
  console.error('[launcher build] Failed:', err);
  process.exit(1);
});
