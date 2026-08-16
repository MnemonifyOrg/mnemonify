function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function layout({ greeting, paragraphs, actionLabel, actionUrl, ignoreMessage }) {
  const text = [
    greeting,
    '',
    ...paragraphs,
    '',
    `${actionLabel}:`,
    actionUrl,
    '',
    ignoreMessage,
    '',
    'Regards,',
    'Mnemonify',
    'https://mnemonify.org',
  ].join('\n');

  const htmlParagraphs = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f6f7f9;color:#1f2937;font-family:Arial,sans-serif;line-height:1.6;">
    <div style="max-width:560px;margin:32px auto;padding:28px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
      <p>${escapeHtml(greeting)}</p>
      ${htmlParagraphs}
      <p><a href="${escapeHtml(actionUrl)}" style="color:#0f766e;">${escapeHtml(actionLabel)}</a></p>
      <p style="color:#4b5563;">${escapeHtml(ignoreMessage)}</p>
      <p>Regards,<br><strong>Mnemonify</strong><br><a href="https://mnemonify.org" style="color:#0f766e;">mnemonify.org</a></p>
    </div>
  </body>
</html>`;

  return { text, html };
}

function greetingFor(name) {
  return name ? `Hello ${name},` : 'Hello,';
}

export function verificationEmail({ verificationUrl, name }) {
  return {
    subject: 'Verify your Mnemonify account',
    ...layout({
      greeting: greetingFor(name),
      paragraphs: [
        'Thanks for creating a Mnemonify account. Please verify your email address so you can sign in and use your account.',
        'This verification link is single-use and will expire in 1 hour.',
      ],
      actionLabel: 'Verify your email address',
      actionUrl: verificationUrl,
      ignoreMessage: 'If you did not create a Mnemonify account, you can safely ignore this email.',
    }),
  };
}

export function invitationEmail({ invitationUrl }) {
  return {
    subject: 'You are invited to Mnemonify',
    ...layout({
      greeting: 'Hello,',
      paragraphs: [
        'You have been invited to join an organization on Mnemonify, a collaborative course authoring platform.',
        'Use the link below to create your account and accept the invitation. The invitation will expire in 7 days.',
      ],
      actionLabel: 'Accept the invitation',
      actionUrl: invitationUrl,
      ignoreMessage: 'If you were not expecting this invitation, you can safely ignore this email.',
    }),
  };
}

export function passwordResetEmail({ resetUrl, name }) {
  return {
    subject: 'Reset your Mnemonify password',
    ...layout({
      greeting: greetingFor(name),
      paragraphs: [
        'We received a request to reset the password for your Mnemonify account.',
        'The link below is single-use and will expire in 1 hour. Your password will not change unless you use the link and choose a new one.',
      ],
      actionLabel: 'Reset your password',
      actionUrl: resetUrl,
      ignoreMessage: 'If you did not request a password reset, you can safely ignore this email. No changes will be made to your account.',
    }),
  };
}
