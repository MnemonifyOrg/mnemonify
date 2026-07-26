import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ROLES,
  canDeleteCourse,
  canChangeMemberRole,
  canEditCourse,
  canManageMembership,
  canPublishCourse,
  canRemoveMember,
  clearSessionCookie,
  hashToken,
  normalizeEmail,
  parseCookies,
  sessionCookieValue,
  validateEmail,
  validatePassword,
} from './auth.js';

test('normalizes and validates account credentials', () => {
  assert.equal(normalizeEmail('  AUTHOR@Example.COM '), 'author@example.com');
  assert.equal(validateEmail('author@example.com'), 'author@example.com');
  assert.equal(validatePassword('long-enough-password'), 'long-enough-password');
  assert.throws(() => validateEmail('not-an-email'), /valid email/);
  assert.throws(() => validatePassword('short'), /at least 8/);
});

test('session cookies are HttpOnly, SameSite protected, and secure in production mode', () => {
  const cookie = sessionCookieValue('raw-token', { secure: true });
  assert.match(cookie, /mnemonify_session=raw-token/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.equal(parseCookies('mnemonify_session=raw-token; other=value').mnemonify_session, 'raw-token');
  assert.match(clearSessionCookie({ secure: true }), /Max-Age=0/);
});

test('role helpers enforce the Phase 6a permission boundary', () => {
  assert.equal(canEditCourse(ROLES.OWNER), true);
  assert.equal(canEditCourse(ROLES.EDITOR), true);
  assert.equal(canEditCourse(ROLES.REVIEWER), false);
  assert.equal(canPublishCourse(ROLES.REVIEWER), false);
  assert.equal(canDeleteCourse(ROLES.EDITOR), true);
  assert.equal(canManageMembership(ROLES.OWNER), true);
  assert.equal(canManageMembership(ROLES.EDITOR), false);
  assert.equal(canChangeMemberRole(ROLES.OWNER, ROLES.EDITOR, 1), false);
  assert.equal(canChangeMemberRole(ROLES.OWNER, ROLES.EDITOR, 2), true);
  assert.equal(canRemoveMember(ROLES.OWNER, 1), false);
  assert.equal(canRemoveMember(ROLES.OWNER, 2), true);
});

test('session token hashing is deterministic and does not expose the raw token', () => {
  assert.equal(hashToken('same-token'), hashToken('same-token'));
  assert.notEqual(hashToken('same-token'), 'same-token');
});
