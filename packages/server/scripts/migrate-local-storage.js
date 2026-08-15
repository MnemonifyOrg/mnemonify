import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStorage, LOCAL_UPLOADS_DIR } from '../src/lib/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const CONTENT_TYPES = {
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip',
};

async function* filesUnder(directory, relative = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const childRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) yield* filesUnder(absolute, childRelative);
    else if (entry.isFile()) yield { absolute, key: childRelative.split(path.sep).join('/') };
  }
}

async function main() {
  const storage = getStorage();
  if (!storage.isRemote) {
    throw new Error('R2 is not configured. Set the R2 environment variables before running this migration.');
  }

  let count = 0;
  let bytes = 0;
  for await (const file of filesUnder(LOCAL_UPLOADS_DIR)) {
    const buffer = await fs.readFile(file.absolute);
    const contentType = CONTENT_TYPES[path.extname(file.key).toLowerCase()];
    await storage.upload(file.key, buffer, contentType);
    if (!(await storage.exists(file.key))) throw new Error(`R2 verification failed for ${file.key}`);
    count += 1;
    bytes += buffer.length;
    console.log(`[storage-migration] uploaded and verified ${file.key} (${buffer.length} bytes)`);
  }
  console.log(`[storage-migration] complete: ${count} files, ${bytes} bytes uploaded and verified`);
}

main().catch((error) => {
  console.error(`[storage-migration] failed: ${error.message}`);
  process.exitCode = 1;
});
