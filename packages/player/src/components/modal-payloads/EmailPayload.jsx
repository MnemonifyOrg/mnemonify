import { useState } from 'react';

// No caller opens this today -- the Contact utility bar item (P1-19) is
// Phase 4 player-chrome scope and hasn't been built. Renders the
// "sends via mailto" half of ARCHITECTURE.md 5.3's stated behavior
// (the configured-SMTP half needs a backend endpoint that doesn't exist
// yet); a real Contact button can call this payload renderer unchanged
// once P1-19 exists.
export default function EmailPayload({ payload }) {
  const { recipient, subjectPrefix = '', courseName = '' } = payload;
  const [message, setMessage] = useState('');
  const subject = subjectPrefix ? `${subjectPrefix}${courseName ? ` — ${courseName}` : ''}` : courseName;
  const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

  return (
    <form className="modal-payload modal-payload--email" onSubmit={(e) => e.preventDefault()}>
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
        Send email
      </a>
    </form>
  );
}
