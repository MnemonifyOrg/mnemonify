import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createShareLinkToken,
  decryptShareLinkToken,
  encryptShareLinkToken,
  hashShareLinkToken,
  isShareLinkAvailable,
  latestPublishedVersion,
  stripEditorOnlyCourseData,
  validateShareLinkExpiration,
} from './shareLinks.js';

test('share link tokens are long, random, hashable, and recoverable only through encryption', () => {
  const first = createShareLinkToken();
  const second = createShareLinkToken();
  assert.equal(first.length >= 43, true);
  assert.notEqual(first, second);
  assert.notEqual(hashShareLinkToken(first), first);
  const ciphertext = encryptShareLinkToken(first);
  assert.notEqual(ciphertext, first);
  assert.equal(decryptShareLinkToken(ciphertext), first);
});

test('share link availability rejects revoked and expired links', () => {
  const now = Date.parse('2026-08-12T12:00:00.000Z');
  assert.equal(isShareLinkAvailable({ revoked: false, expires_at: null }, now), true);
  assert.equal(isShareLinkAvailable({ revoked: false, expires_at: '2026-08-12T12:00:00.000Z' }, now), false);
  assert.equal(isShareLinkAvailable({ revoked: true, expires_at: null }, now), false);
});

test('published version selection always chooses the newest publish, not a named snapshot', () => {
  const latest = latestPublishedVersion([
    { kind: 'published', version_id: 'old', published_at: '2026-08-01T12:00:00.000Z', version_number: 1 },
    { kind: 'named_snapshot', version_id: 'snapshot', published_at: '2026-08-20T12:00:00.000Z', version_number: 99 },
    { kind: 'published', version_id: 'new', published_at: '2026-08-10T12:00:00.000Z', version_number: 2 },
  ]);
  assert.equal(latest.version_id, 'new');
});

test('share link expiration is optional but must be in the future when set', () => {
  const now = Date.parse('2026-08-12T12:00:00.000Z');
  assert.equal(validateShareLinkExpiration(null, { now }), null);
  assert.equal(validateShareLinkExpiration('2026-08-13T12:00:00.000Z', { now }), '2026-08-13T12:00:00.000Z');
  assert.throws(() => validateShareLinkExpiration('2026-08-12T11:59:00.000Z', { now }), /future/);
});

test('anonymous course payloads remove faculty-only data recursively', () => {
  const source = { pages: [{ blocks: [{ faculty_notes: { rich_text: [{ t: 'text', v: 'private' }] }, content: { text: 'public' } }] }] };
  assert.deepEqual(stripEditorOnlyCourseData(source), { pages: [{ blocks: [{ content: { text: 'public' } }] }] });
  assert.deepEqual(source.pages[0].blocks[0].faculty_notes.rich_text[0].v, 'private');
});
