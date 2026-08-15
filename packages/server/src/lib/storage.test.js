import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import test from 'node:test';
import { createStorage, LocalStorage, R2Storage, normalizeCourseStoragePaths, resolveCourseStorageUrls } from './storage.js';

test('local storage preserves the existing /uploads URL and round-trips bytes', async () => {
  const rootDir = await fs.mkdtemp(`${os.tmpdir()}/mnemonify-storage-test-`);
  const storage = new LocalStorage({ rootDir });
  await storage.upload('course-1/resources/handout.pdf', Buffer.from('pdf-bytes'));

  assert.equal(storage.getUrl('course-1/resources/handout.pdf'), '/uploads/course-1/resources/handout.pdf');
  assert.deepEqual(await storage.download('course-1/resources/handout.pdf'), Buffer.from('pdf-bytes'));
  assert.equal(await storage.exists('course-1/resources/handout.pdf'), true);
  await storage.delete('course-1/resources/handout.pdf');
  assert.equal(await storage.exists('course-1/resources/handout.pdf'), false);
  await fs.rm(rootDir, { recursive: true, force: true });
});

test('R2 configuration activates R2 only when credentials are present', () => {
  assert.equal(createStorage({ env: {} }).provider, 'local');
  assert.throws(
    () => createStorage({ env: { R2_ACCOUNT_ID: 'account' } }),
    /Incomplete R2 configuration/,
  );

  const storage = createStorage({
    env: {
      R2_ACCOUNT_ID: 'account',
      R2_ACCESS_KEY_ID: 'access',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET_NAME: 'bucket',
      R2_PUBLIC_URL: 'https://pub.example.test/assets/',
    },
    client: { send: async () => ({}) },
  });
  assert.equal(storage.provider, 'r2');
  assert.equal(storage.getUrl('course-1/My File.pdf'), 'https://pub.example.test/assets/course-1/My%20File.pdf');
});

test('course storage URLs resolve for responses and normalize back to portable paths', () => {
  const r2 = new R2Storage({
    accountId: 'account',
    accessKeyId: 'access',
    secretAccessKey: 'secret',
    bucketName: 'bucket',
    publicUrl: 'https://pub.example.test',
    client: { send: async () => ({}) },
  });
  const course = {
    assets: [{ asset_id: 'ast_1', kind: 'image', src: 'uploads/course-1/image.png', alt: '' }],
    meta: { resources: [{ resource_id: 'res_1', filename: 'handout.pdf', file_path: 'course-1/resources/handout.pdf', size_bytes: 1, uploaded_at: 'now' }] },
  };
  const resolved = resolveCourseStorageUrls(course, r2);
  assert.equal(resolved.assets[0].src, 'https://pub.example.test/course-1/image.png');
  assert.equal(resolved.meta.resources[0].file_path, 'https://pub.example.test/course-1/resources/handout.pdf');
  assert.deepEqual(normalizeCourseStoragePaths(resolved, r2), course);
  assert.equal(course.assets[0].src, 'uploads/course-1/image.png');
});
