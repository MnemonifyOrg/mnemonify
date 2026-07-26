import express from 'express';
import crypto from 'node:crypto';
import pool from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  AUTH_TOKEN_TTLS,
  ROLES,
  appAuthUrl,
  canManageMembership,
  canChangeMemberRole,
  canRemoveMember,
  clearLoginFailures,
  clearSessionCookie,
  consumeAuthToken,
  createSession,
  hashPassword,
  hashToken,
  invalidateSession,
  issueAuthToken,
  normalizeEmail,
  parseCookies,
  requireAuth,
  requireRole,
  sendAuthEmail,
  sessionCookieValue,
  validateEmail,
  validatePassword,
  verifyPassword,
  checkLoginRateLimit,
  recordLoginFailure,
} from '../lib/auth.js';

const router = express.Router();

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    email_verified: Boolean(row.email_verified_at),
    onboarding_completed: Boolean(row.onboarding_completed),
  };
}

async function membershipsFor(userId) {
  const result = await pool.query(
    `SELECT m.organisation_id, o.name AS organisation_name, m.role
       FROM organisation_memberships m
       JOIN organisations o ON o.id = m.organisation_id
      WHERE m.user_id = $1 ORDER BY o.name ASC`,
    [userId]
  );
  return result.rows;
}

function devTokenResponse(req, path, token) {
  return process.env.NODE_ENV === 'production' ? undefined : appAuthUrl(req, path, token);
}

router.post('/auth/signup', asyncHandler(async (req, res) => {
  let email;
  try {
    email = validateEmail(req.body?.email);
    validatePassword(req.body?.password);
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim().slice(0, 120) : email.split('@')[0];
  const inviteToken = req.body?.invite_token;
  const existing = await pool.query('SELECT id FROM users WHERE lower(email) = $1', [email]);
  if (existing.rows.length) {
    res.status(409).json({ error: 'An account with that email already exists.' });
    return;
  }

  const client = await pool.connect();
  let user;
  let organisationId;
  try {
    await client.query('BEGIN');
    let invitation = null;
    if (inviteToken) {
      const invitationResult = await client.query(
        `SELECT * FROM organisation_invitations
          WHERE token_hash = $1 AND lower(email) = $2 AND accepted_at IS NULL AND expires_at > now()
          FOR UPDATE`,
        [hashToken(inviteToken), email]
      );
      invitation = invitationResult.rows[0] || null;
      if (!invitation) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'This invitation is invalid or has expired.' });
        return;
      }
      organisationId = invitation.organisation_id;
    } else {
      const organisation = await client.query(
        `INSERT INTO organisations (name) VALUES ($1) RETURNING id`,
        [`${name}'s Organisation`]
      );
      organisationId = organisation.rows[0].id;
    }
    const userResult = await client.query(
      `INSERT INTO users (organisation_id, email, name, role, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, onboarding_completed, email_verified_at`,
      [organisationId, email, name, inviteToken ? 'editor' : 'owner', await hashPassword(req.body.password)]
    );
    user = userResult.rows[0];
    await client.query(
      `INSERT INTO organisation_memberships (organisation_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [organisationId, user.id, inviteToken ? (invitation?.role || ROLES.EDITOR) : ROLES.OWNER]
    );
    if (inviteToken) {
      await client.query(
        `UPDATE organisation_invitations SET accepted_at = now(), accepted_by = $1 WHERE invitation_id = $2`,
        [user.id, invitation.invitation_id]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const token = await issueAuthToken({ userId: user.id, organisationId, kind: 'email_verification', ttlMs: AUTH_TOKEN_TTLS.emailVerification });
  const verificationUrl = appAuthUrl(req, '/verify-email', token);
  await sendAuthEmail({
    recipient: email,
    subject: 'Verify your Mnemonify account',
    text: `Verify your account by opening this link: ${verificationUrl}`,
  });
  res.status(201).json({
    user: publicUser(user),
    verification_required: true,
    ...(devTokenResponse(req, '/verify-email', token) ? { verification_url: verificationUrl } : {}),
  });
}));

router.get('/auth/verify-email', asyncHandler(async (req, res) => {
  const token = req.query.token;
  const authToken = await consumeAuthToken(token, 'email_verification');
  if (!authToken) {
    res.status(400).json({ error: 'This verification link is invalid, expired, or already used.' });
    return;
  }
  const result = await pool.query(
    `UPDATE users SET email_verified_at = COALESCE(email_verified_at, now())
      WHERE id = $1 RETURNING id, email, name, onboarding_completed, email_verified_at`,
    [authToken.user_id]
  );
  res.json({ user: publicUser(result.rows[0]), verified: true });
}));

router.post('/auth/login', asyncHandler(async (req, res) => {
  let email;
  try { email = validateEmail(req.body?.email); } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  const identity = `${email}|${req.ip || 'unknown'}`;
  const rate = await checkLoginRateLimit(identity);
  if (!rate.allowed) {
    res.status(429).json({ error: 'Too many login attempts. Try again later.', retry_after_seconds: rate.retryAfterSeconds });
    return;
  }
  const result = await pool.query(
    `SELECT id, email, name, password_hash, email_verified_at, onboarding_completed
       FROM users WHERE lower(email) = $1`,
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await verifyPassword(req.body?.password, user.password_hash))) {
    await recordLoginFailure(identity);
    res.status(401).json({ error: 'Email or password is incorrect.' });
    return;
  }
  if (!user.email_verified_at) {
    res.status(403).json({ error: 'Please verify your email before logging in.', code: 'email_not_verified' });
    return;
  }
  const memberships = await membershipsFor(user.id);
  if (!memberships.length) {
    res.status(403).json({ error: 'This account is not a member of an organization.' });
    return;
  }
  const requestedOrg = req.body?.organisation_id;
  const membership = memberships.find((item) => item.organisation_id === requestedOrg) || memberships[0];
  const session = await createSession({ userId: user.id, organisationId: membership.organisation_id, req });
  await clearLoginFailures(identity);
  res.setHeader('Set-Cookie', sessionCookieValue(session.token));
  res.json({ user: publicUser(user), membership, memberships });
}));

router.post('/auth/logout', asyncHandler(async (req, res) => {
  const raw = parseCookies(req.headers.cookie || '').mnemonify_session;
  await invalidateSession(raw);
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.status(204).end();
}));

router.post('/auth/password-reset/request', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const result = await pool.query('SELECT id, email FROM users WHERE lower(email) = $1', [email]);
  let resetUrl;
  if (result.rows.length) {
    const token = await issueAuthToken({ userId: result.rows[0].id, kind: 'password_reset', ttlMs: AUTH_TOKEN_TTLS.passwordReset });
    resetUrl = appAuthUrl(req, '/reset-password', token);
    await sendAuthEmail({ recipient: result.rows[0].email, subject: 'Reset your Mnemonify password', text: `Reset your password by opening this link: ${resetUrl}` });
  }
  // Deliberately generic in production to avoid account enumeration. Local
  // development exposes the link so the flow is testable without SMTP.
  res.json({ message: 'If an account exists for that email, a reset link has been sent.', ...(resetUrl && process.env.NODE_ENV !== 'production' ? { reset_url: resetUrl } : {}) });
}));

router.post('/auth/password-reset/confirm', asyncHandler(async (req, res) => {
  try { validatePassword(req.body?.password); } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  const authToken = await consumeAuthToken(req.body?.token || req.query?.token, 'password_reset');
  if (!authToken) {
    res.status(400).json({ error: 'This password reset link is invalid, expired, or already used.' });
    return;
  }
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(req.body.password), authToken.user_id]);
  await pool.query('DELETE FROM auth_sessions WHERE user_id = $1', [authToken.user_id]);
  res.json({ reset: true });
}));

router.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, email, name, onboarding_completed, email_verified_at FROM users WHERE id = $1`,
    [req.auth.userId]
  );
  res.json({ user: publicUser(result.rows[0]), membership: { organisation_id: req.auth.organisationId, role: req.auth.role }, memberships: await membershipsFor(req.auth.userId) });
}));

router.get('/organizations', requireAuth, asyncHandler(async (req, res) => {
  res.json(await membershipsFor(req.auth.userId));
}));

router.post('/organizations/switch', requireAuth, asyncHandler(async (req, res) => {
  const organisationId = req.body?.organisation_id;
  const membership = (await membershipsFor(req.auth.userId)).find((item) => item.organisation_id === organisationId);
  if (!membership) {
    res.status(403).json({ error: 'You are not a member of that organization.' });
    return;
  }
  const raw = parseCookies(req.headers.cookie || '').mnemonify_session;
  if (raw) await pool.query('UPDATE auth_sessions SET organisation_id = $1 WHERE session_hash = $2', [organisationId, hashToken(raw)]);
  res.json({ membership });
}));

router.get('/organizations/:organisationId/members', requireAuth, asyncHandler(async (req, res) => {
  if (req.params.organisationId !== req.auth.organisationId) {
    res.status(403).json({ error: 'You can only view your active organization.' });
    return;
  }
  const result = await pool.query(
    `SELECT u.id, u.email, u.name, u.email_verified_at, m.role, m.created_at
       FROM organisation_memberships m JOIN users u ON u.id = m.user_id
      WHERE m.organisation_id = $1 ORDER BY m.created_at ASC`,
    [req.auth.organisationId]
  );
  res.json(result.rows.map((row) => ({ ...row, email_verified: Boolean(row.email_verified_at) })));
}));

router.post('/organizations/:organisationId/invitations', requireRole(ROLES.OWNER), asyncHandler(async (req, res) => {
  if (req.params.organisationId !== req.auth.organisationId || !canManageMembership(req.auth.role)) {
    res.status(403).json({ error: 'Only an owner of the active organization can invite members.' });
    return;
  }
  let email;
  try { email = validateEmail(req.body?.email); } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  const role = [ROLES.OWNER, ROLES.EDITOR, ROLES.REVIEWER].includes(req.body?.role) ? req.body.role : ROLES.EDITOR;
  const existing = await pool.query('SELECT id, email, name FROM users WHERE lower(email) = $1', [email]);
  if (existing.rows.length) {
    const current = await pool.query(
      'SELECT role FROM organisation_memberships WHERE organisation_id = $1 AND user_id = $2',
      [req.auth.organisationId, existing.rows[0].id]
    );
    if (current.rows[0]?.role === ROLES.OWNER && !canChangeMemberRole(current.rows[0].role, role, (await pool.query('SELECT COUNT(*)::integer AS count FROM organisation_memberships WHERE organisation_id = $1 AND role = $2', [req.auth.organisationId, ROLES.OWNER])).rows[0].count)) {
      res.status(409).json({ error: 'An organization must always have at least one owner.' });
      return;
    }
    await pool.query(
      `INSERT INTO organisation_memberships (organisation_id, user_id, role)
       VALUES ($1, $2, $3) ON CONFLICT (organisation_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = now()`,
      [req.auth.organisationId, existing.rows[0].id, role]
    );
    res.status(201).json({ direct: true, member: { ...existing.rows[0], role } });
    return;
  }
  const token = crypto.randomBytes(32).toString('base64url');
  await pool.query(
    `INSERT INTO organisation_invitations (organisation_id, email, role, invited_by, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + interval '7 days')
     ON CONFLICT (organisation_id, email) DO UPDATE SET role = EXCLUDED.role, invited_by = EXCLUDED.invited_by, token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, accepted_at = NULL, accepted_by = NULL`,
    [req.auth.organisationId, email, role, req.auth.userId, hashToken(token)]
  );
  const invitationUrl = appAuthUrl(req, '/signup', token).replace('?token=', '?invite_token=');
  await sendAuthEmail({ recipient: email, subject: 'You are invited to Mnemonify', text: `Create your account and join the organization: ${invitationUrl}` });
  res.status(201).json({ direct: false, ...(process.env.NODE_ENV !== 'production' ? { invitation_url: invitationUrl } : {}) });
}));

router.patch('/organizations/:organisationId/members/:userId', requireRole(ROLES.OWNER), asyncHandler(async (req, res) => {
  if (req.params.organisationId !== req.auth.organisationId) {
    res.status(403).json({ error: 'You can only manage your active organization.' });
    return;
  }
  const role = req.body?.role;
  if (![ROLES.OWNER, ROLES.EDITOR, ROLES.REVIEWER].includes(role)) {
    res.status(400).json({ error: 'Role must be owner, editor, or reviewer.' });
    return;
  }
  const current = await pool.query('SELECT role FROM organisation_memberships WHERE organisation_id = $1 AND user_id = $2', [req.auth.organisationId, req.params.userId]);
  if (!current.rows.length) {
    res.status(404).json({ error: 'Member not found.' });
    return;
  }
  if (current.rows[0].role === ROLES.OWNER && role !== ROLES.OWNER) {
    const owners = await pool.query('SELECT COUNT(*)::integer AS count FROM organisation_memberships WHERE organisation_id = $1 AND role = $2', [req.auth.organisationId, ROLES.OWNER]);
    if (!canChangeMemberRole(current.rows[0].role, role, owners.rows[0].count)) {
      res.status(409).json({ error: 'An organization must always have at least one owner.' });
      return;
    }
  }
  const result = await pool.query(
    `UPDATE organisation_memberships SET role = $1, updated_at = now()
      WHERE organisation_id = $2 AND user_id = $3 RETURNING organisation_id, user_id, role`,
    [role, req.auth.organisationId, req.params.userId]
  );
  res.json(result.rows[0]);
}));

router.delete('/organizations/:organisationId/members/:userId', requireRole(ROLES.OWNER), asyncHandler(async (req, res) => {
  if (req.params.organisationId !== req.auth.organisationId) {
    res.status(403).json({ error: 'You can only manage your active organization.' });
    return;
  }
  const current = await pool.query('SELECT role FROM organisation_memberships WHERE organisation_id = $1 AND user_id = $2', [req.auth.organisationId, req.params.userId]);
  if (!current.rows.length) {
    res.status(404).json({ error: 'Member not found.' });
    return;
  }
  if (current.rows[0].role === ROLES.OWNER) {
    const owners = await pool.query('SELECT COUNT(*)::integer AS count FROM organisation_memberships WHERE organisation_id = $1 AND role = $2', [req.auth.organisationId, ROLES.OWNER]);
    if (!canRemoveMember(current.rows[0].role, owners.rows[0].count)) {
      res.status(409).json({ error: 'An organization must always have at least one owner.' });
      return;
    }
  }
  await pool.query('DELETE FROM organisation_memberships WHERE organisation_id = $1 AND user_id = $2', [req.auth.organisationId, req.params.userId]);
  await pool.query('DELETE FROM auth_sessions WHERE organisation_id = $1 AND user_id = $2', [req.auth.organisationId, req.params.userId]);
  res.status(204).end();
}));

export default router;
