import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

export const LOCAL_UPLOADS_DIR = path.resolve(import.meta.dirname, '..', '..', 'uploads');

const R2_ENV_KEYS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];

function cleanKey(key) {
  const normalized = String(key || '').replaceAll('\\', '/').replace(/^\/+/, '');
  if (!normalized || normalized.split('/').some((part) => part === '..')) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return normalized;
}

function publicBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function encodeKey(key) {
  return cleanKey(key).split('/').map((part) => encodeURIComponent(part)).join('/');
}

function localPath(rootDir, key) {
  const resolvedRoot = path.resolve(rootDir);
  const resolved = path.resolve(resolvedRoot, cleanKey(key));
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Storage key escapes local storage root: ${key}`);
  }
  return resolved;
}

export class LocalStorage {
  constructor({ rootDir = LOCAL_UPLOADS_DIR } = {}) {
    this.rootDir = rootDir;
    this.isRemote = false;
    this.provider = 'local';
  }

  async upload(key, buffer) {
    const destination = localPath(this.rootDir, key);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, buffer);
  }

  async download(key) {
    return fs.readFile(localPath(this.rootDir, key));
  }

  getUrl(key) {
    // Preserve the existing local URL byte-for-byte.
    return `/uploads/${cleanKey(key)}`;
  }

  async delete(key) {
    try {
      await fs.unlink(localPath(this.rootDir, key));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  async exists(key) {
    try {
      await fs.access(localPath(this.rootDir, key));
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }
}

export class R2Storage {
  constructor({ accountId, accessKeyId, secretAccessKey, bucketName, publicUrl, client } = {}) {
    this.accountId = accountId;
    this.bucketName = bucketName;
    this.publicUrl = publicBaseUrl(publicUrl);
    if (!this.publicUrl) {
      throw new Error('R2_PUBLIC_URL is required when R2 storage is configured. Set it to the bucket public URL or Cloudflare custom domain.');
    }
    this.client = client || new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      // Use path-style addressing for R2's bucket-scoped S3 credentials.
      // Virtual-hosted requests can be rejected by R2 with SignatureDoesNotMatch.
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      // R2's S3 compatibility matrix does not support the SDK's optional
      // x-amz-sdk-checksum-algorithm request header. Only calculate/validate
      // checksums when an operation explicitly requires one.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    this.isRemote = true;
    this.provider = 'r2';
  }

  async upload(key, buffer, contentType) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: cleanKey(key),
      Body: buffer,
      ...(contentType ? { ContentType: contentType } : {}),
    }));
  }

  async download(key) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucketName, Key: cleanKey(key) }));
    return Buffer.from(await result.Body.transformToByteArray());
  }

  getUrl(key) {
    return `${this.publicUrl}/${encodeKey(key)}`;
  }

  async delete(key) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: cleanKey(key) }));
  }

  async exists(key) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucketName, Key: cleanKey(key) }));
      return true;
    } catch (error) {
      if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound' || error?.name === 'NoSuchKey') return false;
      throw error;
    }
  }
}

export function createStorage({ env = process.env, rootDir = LOCAL_UPLOADS_DIR, client } = {}) {
  const configured = R2_ENV_KEYS.some((key) => Boolean(env[key]));
  if (!configured) return new LocalStorage({ rootDir });
  const missing = R2_ENV_KEYS.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Incomplete R2 configuration. Missing: ${missing.join(', ')}`);
  return new R2Storage({
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
    publicUrl: env.R2_PUBLIC_URL,
    client,
  });
}

let storage;

export function getStorage() {
  if (!storage) storage = createStorage();
  return storage;
}

export function resetStorageForTests() {
  storage = undefined;
}

function keyFromUrlOrPath(value, { asset = false, publicUrl = process.env.R2_PUBLIC_URL } = {}) {
  if (!value || typeof value !== 'string') return null;
  const raw = value.trim();
  if (/^https?:\/\//i.test(raw)) {
    const base = publicBaseUrl(publicUrl);
    if (!base || !raw.startsWith(`${base}/`)) return null;
    return decodeURIComponent(raw.slice(base.length + 1));
  }
  const withoutLeadingSlash = raw.replace(/^\/+/, '');
  if (withoutLeadingSlash.startsWith('uploads/')) return withoutLeadingSlash.slice('uploads/'.length);
  if (asset && withoutLeadingSlash.startsWith('uploads')) return withoutLeadingSlash.slice('uploads'.length).replace(/^\/+/, '');
  return asset ? null : cleanKey(withoutLeadingSlash);
}

export function normalizeCourseStoragePaths(courseJson, storageInstance = getStorage()) {
  if (!courseJson || typeof courseJson !== 'object') return courseJson;
  const normalized = structuredClone(courseJson);
  for (const asset of normalized.assets || []) {
    const key = keyFromUrlOrPath(asset.src, { asset: true, publicUrl: storageInstance.publicUrl });
    if (key) asset.src = `uploads/${key}`;
  }
  const resources = normalized.meta?.resources || [];
  for (const resource of resources) {
    const key = keyFromUrlOrPath(resource.file_path, { publicUrl: storageInstance.publicUrl });
    if (key) resource.file_path = key;
  }
  return normalized;
}

export function resolveCourseStorageUrls(courseJson, storageInstance = getStorage()) {
  if (!courseJson || typeof courseJson !== 'object' || !storageInstance.isRemote) return courseJson;
  const resolved = structuredClone(courseJson);
  for (const asset of resolved.assets || []) {
    const key = keyFromUrlOrPath(asset.src, { asset: true, publicUrl: storageInstance.publicUrl });
    if (key) asset.src = storageInstance.getUrl(key);
  }
  for (const resource of resolved.meta?.resources || []) {
    const key = keyFromUrlOrPath(resource.file_path, { publicUrl: storageInstance.publicUrl });
    if (key) resource.file_path = storageInstance.getUrl(key);
  }
  return resolved;
}

export function storageKeyFromAssetSrc(src) {
  return keyFromUrlOrPath(src, { asset: true });
}

export function storageKeyFromResourcePath(filePath) {
  return keyFromUrlOrPath(filePath);
}
