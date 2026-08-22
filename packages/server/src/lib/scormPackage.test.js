import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import AdmZip from 'adm-zip';
import { createScormPackage, findExternalEmbeds } from './scormPackage.js';

test('self-contained SCORM package embeds course data and rewrites stored files locally', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mnemonify-scorm-test-'));
  const playerDistDir = path.join(root, 'player');
  const bridgePath = path.join(root, 'scorm-api.js');
  const outputPath = path.join(root, 'course.zip');
  await fs.mkdir(path.join(playerDistDir, 'assets'), { recursive: true });
  await fs.writeFile(path.join(playerDistDir, 'index.html'), '<head><link href="/assets/player.css"></head><body></body>');
  await fs.writeFile(path.join(playerDistDir, 'assets/player.js'), 'player bundle');
  await fs.writeFile(bridgePath, 'bridge');

  const richTextHtml = '<b>bold</b> <i>italic</i> <u>underline</u> <sup>2</sup><sub>x</sub> <span style="color:#B42318">color</span><ul><li>item</li></ul>';
  const storage = {
    async download(key) {
      return Buffer.from({
        'course-1/image.png': 'image bytes',
        'course-1/resources/guide.pdf': 'pdf bytes',
      }[key]);
    },
  };
  const courseJson = {
    title: 'Export Course',
    meta: { course_id: 'course-1', resources: [{ resource_id: 'res_1', filename: 'guide.pdf', file_path: 'course-1/resources/guide.pdf' }] },
    assets: [{ asset_id: 'ast_1', src: 'uploads/course-1/image.png', filename: 'image.png' }],
    pages: [{ page_id: 'page_1', title: 'Page', blocks: [{ type: 'text', content: { rich_text: [{ t: 'html', v: richTextHtml }] } }, { type: 'embed', content: { url: 'https://example.org/embed/1' } }] }],
  };

  const result = await createScormPackage({
    courseId: 'course-1',
    versionId: 'version-1',
    courseJson,
    assets: [{ asset_id: 'ast_1', filename: 'image.png', file_path: 'course-1/image.png' }],
    resources: [{ resource_id: 'res_1', filename: 'guide.pdf', file_path: 'course-1/resources/guide.pdf', source: 'manual' }],
    captions: [{ asset_id: 'ast_1', kind: 'caption', status: 'ready', content: 'WEBVTT\n\n00:00.000 --> 00:01.000\nHello\n' }],
    storage,
    outputPath,
    playerDistDir,
    bridgePath,
  });

  const zip = new AdmZip(outputPath);
  const names = zip.getEntries().map((entry) => entry.entryName);
  assert.ok(names.includes('imsmanifest.xml'));
  assert.ok(names.includes('course-assets/ast_1/image.png'));
  assert.ok(names.includes('resources/res_1/guide.pdf'));
  assert.ok(names.includes('captions/ast_1.vtt'));
  assert.ok(names.includes('scorm-api.js'));
  const index = zip.readAsText('index.html');
  assert.match(index, /id="mnemonify-course-data"/);
  assert.doesNotMatch(index, /window\.__MNEMONIFY_COURSE_DATA__=/);
  const embeddedJson = index.match(/<script type="application\/json" id="mnemonify-course-data">([\s\S]*?)<\/script>/)?.[1];
  assert.equal(JSON.parse(embeddedJson).assets[0].src, 'course-assets/ast_1/image.png');
  assert.equal(JSON.parse(embeddedJson).pages[0].blocks[0].content.rich_text[0].v, richTextHtml);
  assert.match(index, /course-assets\/ast_1\/image.png/);
  assert.match(index, /href="assets\/player.css"/);
  assert.match(zip.readAsText('imsmanifest.xml'), /<file href="course-assets\/ast_1\/image.png"\/>/);
  assert.equal(result.warnings.length, 1);
  assert.match(zip.readAsText('export-warnings.txt'), /example.org/);
  await fs.rm(root, { recursive: true, force: true });
});

test('external embed detection is empty for courses without iframe embed blocks', () => {
  assert.deepEqual(findExternalEmbeds({ pages: [{ blocks: [{ type: 'text', content: { url: 'https://example.org' } }] }] }), []);
});
