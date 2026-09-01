// Rendered automatically as the last element of every page's block stack
// (ARCHITECTURE.md 5.1) -- not a block type an author adds, a reserved
// chrome role. `disabled`/`label` are computed by App.jsx (which owns the
// gating-condition evaluation and last-page detection) so this component
// stays a plain, dumb button.
export default function ContinueButton({ label, disabled, message, onClick }) {
  const messageText = typeof message === 'string' ? message : message?.text;
  const messageTone = typeof message === 'object' ? message?.tone : 'info';
  return (
    <div className="continue-button-row">
      {messageText && (
        <p id="continue-button-message" className={`continue-button__message continue-button__message--${messageTone}`} role="status" aria-live="polite">
          {messageText}
        </p>
      )}
      <button type="button" className="continue-button" disabled={disabled} aria-describedby={messageText ? 'continue-button-message' : undefined} onClick={onClick}>
        {label}
      </button>
    </div>
  );
}
