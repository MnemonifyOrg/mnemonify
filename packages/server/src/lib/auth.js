import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import pool from '../db.js';
import { DEV_ORG_ID, DEV_USER_ID } from './devUser.js';

export const ROLES = Object.freeze({
  OWNER: 'owner',
  EDITOR: 'editor',
  REVIEWER: 'reviewer',
});

export const SESSION_COOKIE = 'mnemonify_session';
const SESSION_DAYS = 14;
const TOKEN_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  if (password.length > 200) throw new Error('Password is too long.');
  return password;
}

export function validateEmail(email) {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Enter a valid email address.');
  return normalized;
}

export async function hashPassword(password) {
  validatePassword(password);
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

export function createRawToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return [part, ''];
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

function cookieAttributes({ maxAge, secure = process.env.NODE_ENV === 'production' } = {}) {
  return [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
    ...(maxAge === undefined ? [] : [`Max-Age=${Math.max(0, Math.floor(maxAge))}`]),
  ].join('; ');
}

export function sessionCookieValue(token, { secure = process.env.NODE_ENV === 'production' } = {}) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieAttributes({ maxAge: SESSION_DAYS * 86400, secure })}`;
}

export function clearSessionCookie({ secure = process.env.NODE_ENV === 'production' } = {}) {
  return `${SESSION_COOKIE}=; ${cookieAttributes({ maxAge: 0, secure })}`;
}

export function canEditCourse(role) {
  return role === ROLES.OWNER || role === ROLES.EDITOR;
}

export function canManageMembership(role) {
  return role === ROLES.OWNER;
}

export function canChangeMemberRole(currentRole, nextRole, ownerCount) {
  return !(currentRole === ROLES.OWNER && nextRole !== ROLES.OWNER && Number(ownerCount) <= 1);
}

export function canRemoveMember(currentRole, ownerCount) {
  return !(currentRole === ROLES.OWNER && Number(ownerCount) <= 1);
}

export function canPublishCourse(role) {
  return canEditCourse(role);
}

export function canDeleteCourse(role) {
  return canEditCourse(role);
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}

export function requireAuth(req, res, next) {
  if (!req.auth) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  next();
}

export async function authContext(req, res, next) {
  try {
    const rawSession = parseCookies(req.headers.cookie || '')[SESSION_COOKIE];
    if (rawSession) {
      const result = await pool.query(
        `SELECT s.session_hash, s.user_id, s.organisation_id, s.expires_at,
                u.email, u.name, u.email_verified_at, m.role
           FROM auth_sessions s
           JOIN users u ON u.id = s.user_id
           JOIN organisation_memberships m
             ON m.user_id = s.user_id AND m.organisation_id = s.organisation_id
          WHERE s.session_hash = $1 AND s.expires_at > now()`,
        [hashToken(rawSession)]
      );
      if (result.rows.length) {
        const row = result.rows[0];
        req.auth = {
          userId: row.user_id,
          organisationId: row.organisation_id,
          role: row.role,
          email: row.email,
          name: row.name,
          emailVerified: Boolean(row.email_verified_at),
          isDevFallback: false,
        };
        pool.query('UPDATE auth_sessions SET last_seen_at = now() WHERE session_hash = $1', [row.session_hash]).catch(() => {});
        next();
        return;
      }
    }

    // Existing local/editor/test flows intentionally remain usable without a
    // login prompt. This fallback is disabled in production and can be
    // disabled locally with DEV_AUTH_BYPASS=false. It resolves to the seeded
    // owner membership created by migration 013, not a privileged magic role.
    if (process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS !== 'false') {
      req.auth = {
        userId: DEV_USER_ID,
        organisationId: DEV_ORG_ID,
        role: ROLES.OWNER,
        email: 'dev@mnemonify.org',
        name: 'Dev User',
        emailVerified: true,
        isDevFallback: true,
      };
    }
    next();
  } catch (error) {
    next(error);
  }
}

export async function createSession({ userId, organisationId, req }) {
  const rawToken = createRawToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000);
  await pool.query(
    `INSERT INTO auth_sessions
       (session_hash, user_id, organisation_id, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [hashToken(rawToken), userId, organisationId, expiresAt, req.ip || null, req.get('user-agent') || null]
  );
  return { token: rawToken, expiresAt };
}

export async function invalidateSession(rawToken) {
  if (!rawToken) return;
  await pool.query('DELETE FROM auth_sessions WHERE session_hash = $1', [hashToken(rawToken)]);
}

export async function issueAuthToken({ userId, organisationId = null, kind, ttlMs = TOKEN_TTL_MS }) {
  const token = createRawToken();
  await pool.query(
    `INSERT INTO auth_tokens (token_hash, user_id, organisation_id, kind, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [hashToken(token), userId, organisationId, kind, new Date(Date.now() + ttlMs)]
  );
  return token;
}

export async function consumeAuthToken(token, kind) {
  if (!token) return null;
  const result = await pool.query(
    `UPDATE auth_tokens
        SET consumed_at = now()
      WHERE token_hash = $1 AND kind = $2 AND consumed_at IS NULL AND expires_at > now()
      RETURNING user_id, organisation_id, expires_at`,
    [hashToken(token), kind]
  );
  return result.rows[0] || null;
}

export async function checkLoginRateLimit(identity) {
  const result = await pool.query(
    `SELECT attempts, first_attempt_at, blocked_until
       FROM auth_login_attempts WHERE identity = $1`,
    [identity]
  );
  const row = result.rows[0];
  if (!row) return { allowed: true };
  const now = Date.now();
  if (row.blocked_until && new Date(row.blocked_until).getTime() > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((new Date(row.blocked_until).getTime() - now) / 1000) };
  }
  if (now - new Date(row.first_attempt_at).getTime() > LOGIN_WINDOW_MS) {
    await pool.query('DELETE FROM auth_login_attempts WHERE identity = $1', [identity]);
    return { allowed: true };
  }
  return { allowed: Number(row.attempts) < LOGIN_MAX_ATTEMPTS };
}

export async function recordLoginFailure(identity) {
  await pool.query(
    `INSERT INTO auth_login_attempts (identity, attempts, first_attempt_at, blocked_until, updated_at)
     VALUES ($1, 1, now(), NULL, now())
     ON CONFLICT (identity) DO UPDATE SET
       attempts = CASE
         WHEN auth_login_attempts.first_attempt_at < now() - interval '15 minutes' THEN 1
         ELSE auth_login_attempts.attempts + 1 END,
       first_attempt_at = CASE
         WHEN auth_login_attempts.first_attempt_at < now() - interval '15 minutes' THEN now()
         ELSE auth_login_attempts.first_attempt_at END,
       blocked_until = CASE
         WHEN auth_login_attempts.attempts + 1 >= 5 THEN now() + interval '15 minutes'
         ELSE NULL END,
       updated_at = now()`,
    [identity]
  );
}

export async function clearLoginFailures(identity) {
  await pool.query('DELETE FROM auth_login_attempts WHERE identity = $1', [identity]);
}

let smtpTransport;
function getSmtpTransport() {
  if (!process.env.SMTP_HOST) return null;
  smtpTransport ||= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return smtpTransport;
}

export async function sendAuthEmail({ recipient, subject, text }) {
  const transport = getSmtpTransport();
  if (transport) {
    await transport.sendMail({ from: process.env.SMTP_FROM || 'no-reply@mnemonify.org', to: recipient, subject, text });
    return { delivered: true };
  }
  await pool.query('INSERT INTO auth_email_outbox (recipient, subject, body) VALUES ($1, $2, $3)', [recipient, subject, text]);
  console.info(`[auth] SMTP is not configured; token email queued for ${recipient}:\n${text}`);
  return { delivered: false };
}

export function authUrl(req, path, token) {
  const base = process.env.AUTH_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

export function appAuthUrl(req, path, token) {
  const base = process.env.APP_BASE_URL || (process.env.NODE_ENV === 'production' ? `${req.protocol}://${req.get('host')}` : 'http://localhost:3000');
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

export const AUTH_TOKEN_TTLS = Object.freeze({
  emailVerification: TOKEN_TTL_MS,
  passwordReset: PASSWORD_RESET_TTL_MS,
});
