import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

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

function buildManifest({ courseId, versionId }) {
  const identifier = `mnemonify_${courseId}_v${versionId}`;
  return `<?xml version="1.0" standalone="no" ?>
<manifest identifier="${identifier}" version="${versionId}"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
                       http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd
                       http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
                       http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
                       http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 3rd Edition</schemaversion>
  </metadata>
  <organizations default="mnemonify_org">
    <organization identifier="mnemonify_org">
      <title>Mnemonify Course</title>
      <item identifier="mnemonify_item" identifierref="mnemonify_resource">
        <title>Mnemonify Course</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="mnemonify_resource" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm-api.js"/>
      <file href="config.json"/>
    </resource>
  </resources>
</manifest>
`;
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

  const configPath = path.join(buildDir, 'config.json');
  const filledConfig = fs
    .readFileSync(configPath, 'utf-8')
    .replace('{{CONTENT_SERVER_URL}}', CONTENT_SERVER_URL)
    .replace('{{COURSE_ID}}', COURSE_ID)
    .replace('{{VERSION_ID}}', VERSION_ID);
  fs.writeFileSync(configPath, filledConfig);

  fs.writeFileSync(path.join(buildDir, 'imsmanifest.xml'), buildManifest({ courseId: COURSE_ID, versionId: VERSION_ID }));

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
