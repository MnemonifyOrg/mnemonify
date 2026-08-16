import nodemailer from 'nodemailer';
import pool from '../db.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_SMTP_FROM = 'no-reply@mnemonify.org';
const DEFAULT_RESEND_FROM_NAME = 'Mnemonify';

function formatResendFrom(value, name) {
  if (value.includes('<')) return value;
  return `${name} <${value}>`;
}

function createResendError(message, status, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.status = status;
  return error;
}

async function readResponseBody(response) {
  try {
    return await response.json();
  } catch {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }
}

function createResendSender({ env, fetchImpl, logger }) {
  return {
    async sendEmail({ to, subject, text, html }) {
      if (!env.RESEND_FROM) {
        throw createResendError('Email delivery is not configured: RESEND_FROM is missing.', 500);
      }
      if (typeof fetchImpl !== 'function') {
        throw createResendError('Email delivery is not available: this Node runtime does not provide fetch.', 500);
      }

      let response;
      try {
        response = await fetchImpl(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: formatResendFrom(env.RESEND_FROM, env.RESEND_FROM_NAME || DEFAULT_RESEND_FROM_NAME),
            to,
            subject,
            text,
            ...(html ? { html } : {}),
          }),
        });
      } catch (cause) {
        const error = createResendError('Email delivery failed. Please try again.', 502, cause);
        logger.error('[email] Resend request failed:', cause);
        throw error;
      }

      const payload = await readResponseBody(response);
      if (!response.ok) {
        const detail = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const error = createResendError('Email delivery failed. Please try again.', 502);
        logger.error(`[email] Resend rejected the email (${response.status}): ${detail}`);
        throw error;
      }

      return {
        delivered: true,
        provider: 'resend',
        ...(payload?.id ? { id: payload.id } : {}),
      };
    },
  };
}

function createLocalSender({ env, poolClient, logger, smtpTransportFactory }) {
  let smtpTransport;

  function getSmtpTransport() {
    if (!env.SMTP_HOST) return null;
    smtpTransport ||= smtpTransportFactory({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      secure: env.SMTP_SECURE === 'true',
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
    return smtpTransport;
  }

  return {
    async sendEmail({ to, subject, text, html }) {
      const transport = getSmtpTransport();
      if (transport) {
        await transport.sendMail({
          from: env.SMTP_FROM || DEFAULT_SMTP_FROM,
          to,
          subject,
          text,
          ...(html ? { html } : {}),
        });
        return { delivered: true };
      }
      await poolClient.query('INSERT INTO auth_email_outbox (recipient, subject, body) VALUES ($1, $2, $3)', [to, subject, text]);
      logger.info(`[auth] SMTP is not configured; token email queued for ${to}:\n${text}`);
      return { delivered: false };
    },
  };
}

export function createEmailSender({
  env = process.env,
  fetchImpl = globalThis.fetch,
  poolClient = pool,
  logger = console,
  smtpTransportFactory = (options) => nodemailer.createTransport(options),
} = {}) {
  if (env.RESEND_API_KEY) return createResendSender({ env, fetchImpl, logger });
  return createLocalSender({ env, poolClient, logger, smtpTransportFactory });
}

let emailSender;

export function getEmailSender() {
  emailSender ||= createEmailSender();
  return emailSender;
}

export function resetEmailSenderForTests() {
  emailSender = undefined;
}

export function sendEmail({ to, subject, text, html }) {
  return getEmailSender().sendEmail({ to, subject, text, html });
}
