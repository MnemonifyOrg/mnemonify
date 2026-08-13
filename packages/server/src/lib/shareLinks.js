import crypto from 'node:crypto';

export const SHARE_LINK_UNAVAILABLE_MESSAGE = 'This link is no longer available.';
export const SHARE_LINK_NOT_PUBLISHED_MESSAGE = 'This course is not yet published.';
const TOKEN_BYTES = 32;

function encryptionKey() {
  // A dedicated secret is preferred. DATABASE_URL is a stable per-installation
  // fallback for self-hosted deployments that have not added a separate key.
  return crypto
    .createHash('sha256')
    .update(process.env.SHARE_LINK_SECRET || process.env.DATABASE_URL || 'mnemonify-development-share-link-key')
    .digest();
}

export function createShareLinkToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashShareLinkToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function encryptShareLinkToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(token), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptShareLinkToken(value) {
  const [ivValue, authTagValue, ciphertextValue] = String(value || '').split('.');
  if (!ivValue || !authTagValue || !ciphertextValue) throw new Error('Invalid share link token ciphertext.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function validateShareLinkExpiration(value, { now = Date.now() } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Expiration must be a valid date.');
  if (date.getTime() <= now) throw new Error('Expiration must be in the future.');
  return date.toISOString();
}

export function isShareLinkExpired(link, now = Date.now()) {
  return Boolean(link?.expires_at && new Date(link.expires_at).getTime() <= now);
}

export function isShareLinkAvailable(link, now = Date.now()) {
  return Boolean(link && !link.revoked && !isShareLinkExpired(link, now));
}

export function latestPublishedVersion(versions = []) {
  return versions
    .filter((version) => version?.kind === 'published')
    .sort((a, b) => {
      const dateDelta = new Date(b.published_at || b.created_at || 0).getTime()
        - new Date(a.published_at || a.created_at || 0).getTime();
      if (dateDelta !== 0) return dateDelta;
      return Number(b.version_number || 0) - Number(a.version_number || 0);
    })[0] || null;
}

export function stripEditorOnlyCourseData(value) {
  if (Array.isArray(value)) return value.map(stripEditorOnlyCourseData);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'faculty_notes')
      .map(([key, child]) => [key, stripEditorOnlyCourseData(child)]),
  );
}

export function shareLinkForResponse(row, shareUrl) {
  return {
    share_link_id: row.share_link_id,
    course_id: row.course_id,
    created_by: row.created_by,
    created_at: row.created_at,
    expires_at: row.expires_at,
    revoked: Boolean(row.revoked),
    revoked_at: row.revoked_at,
    share_url: shareUrl,
  };
}
