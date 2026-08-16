import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmailSender } from './email.js';

test('local fallback keeps the existing outbox and console behavior when Resend is not configured', async () => {
  const queries = [];
  const logs = [];
  const sender = createEmailSender({
    env: {},
    poolClient: { query: async (...args) => queries.push(args) },
    logger: { info: (message) => logs.push(message) },
  });

  const result = await sender.sendEmail({ to: 'person@example.com', subject: 'Verify', text: 'Open /verify' });

  assert.deepEqual(result, { delivered: false });
  assert.deepEqual(queries, [[
    'INSERT INTO auth_email_outbox (recipient, subject, body) VALUES ($1, $2, $3)',
    ['person@example.com', 'Verify', 'Open /verify'],
  ]]);
  assert.deepEqual(logs, ['[auth] SMTP is not configured; token email queued for person@example.com:\nOpen /verify']);
});

test('legacy SMTP behavior remains available when SMTP_HOST is configured without Resend', async () => {
  const transportOptions = [];
  const sent = [];
  const sender = createEmailSender({
    env: {
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '2525',
      SMTP_SECURE: 'true',
      SMTP_USER: 'smtp-user',
      SMTP_PASSWORD: 'smtp-password',
      SMTP_FROM: 'from@example.com',
    },
    smtpTransportFactory: (options) => {
      transportOptions.push(options);
      return { sendMail: async (message) => sent.push(message) };
    },
  });

  const result = await sender.sendEmail({ to: 'person@example.com', subject: 'Invite', text: 'Join' });

  assert.deepEqual(result, { delivered: true });
  assert.deepEqual(transportOptions, [{
    host: 'smtp.example.com',
    port: 2525,
    secure: true,
    auth: { user: 'smtp-user', pass: 'smtp-password' },
  }]);
  assert.deepEqual(sent, [{ from: 'from@example.com', to: 'person@example.com', subject: 'Invite', text: 'Join' }]);
});

test('Resend sender posts the plain-text email and returns the provider id', async () => {
  const requests = [];
  const sender = createEmailSender({
    env: { RESEND_API_KEY: 're_test_key', RESEND_FROM: 'noreply@mail.mnemonify.org' },
    fetchImpl: async (...args) => {
      requests.push(args);
      return { ok: true, status: 200, json: async () => ({ id: 'email-123' }) };
    },
  });

  const result = await sender.sendEmail({ to: 'person@example.com', subject: 'Reset', text: 'Open /reset' });

  assert.deepEqual(result, { delivered: true, provider: 'resend', id: 'email-123' });
  assert.equal(requests.length, 1);
  assert.equal(requests[0][0], 'https://api.resend.com/emails');
  assert.deepEqual(requests[0][1], {
    method: 'POST',
    headers: {
      Authorization: 'Bearer re_test_key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@mail.mnemonify.org',
      to: 'person@example.com',
      subject: 'Reset',
      text: 'Open /reset',
    }),
  });
});

test('Resend failures are logged and rejected with a non-success status', async () => {
  const errors = [];
  const sender = createEmailSender({
    env: { RESEND_API_KEY: 're_test_key', RESEND_FROM: 'noreply@mail.mnemonify.org' },
    logger: { error: (...args) => errors.push(args) },
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ message: 'invalid api key' }) }),
  });

  await assert.rejects(
    sender.sendEmail({ to: 'person@example.com', subject: 'Verify', text: 'Open /verify' }),
    (error) => error.message === 'Email delivery failed. Please try again.' && error.status === 502
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0][0], /Resend rejected the email \(401\)/);
  assert.match(errors[0][0], /invalid api key/);
});
