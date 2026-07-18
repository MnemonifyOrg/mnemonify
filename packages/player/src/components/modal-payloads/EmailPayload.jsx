import { useState } from 'react';

// Contact utility bar item (ARCHITECTURE.md 5.1/5.3, Phase 4 Part 1).
// mailto: is the primary path -- the launcher's own iframe (packages/
// launcher/template/index.html) carries no `sandbox` attribute, so a
// mailto: link isn't blocked there, and it keeps the browser tab itself on
// the player (the in-player containment rule cares about not navigating
// the tab/window away, not about launching an OS-level mail client).
// "Copy email address" is a second, always-available action alongside it,
// not a replacement -- mailto: silently does nothing if the learner's
// device has no mail client configured (common on shared/lab computers),
// and there's no way for the player to detect that failure to fall back
// automatically, so both are offered together rather than picking one.
export default function EmailPayload({ payload }) {
  const { recipient, subjectPrefix = '', courseName = '' } = payload;
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const subject = subjectPrefix ? `${subjectPrefix}${courseName ? ` — ${courseName}` : ''}` : courseName;
  const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(recipient);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[player] Failed to copy email address to clipboard:', err);
    }
  }

  return (
    <form className="modal-payload modal-payload--email" onSubmit={(e) => e.preventDefault()}>
      <p className="modal-payload__email-recipient">
        {recipient}
        <button type="button" className="modal-payload__email-copy" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy email address'}
        </button>
      </p>
      <label className="modal-payload__email-label" htmlFor="modal-email-message">
        Message
      </label>
      <textarea
        id="modal-email-message"
        className="modal-payload__email-textarea"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
      />
      <a className="modal-payload__email-send" href={mailto}>
        Open in email app
      </a>
    </form>
  );
}
