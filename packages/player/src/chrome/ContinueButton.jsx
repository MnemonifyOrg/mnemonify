// Rendered automatically as the last element of every page's block stack
// (ARCHITECTURE.md 5.1) -- not a block type an author adds, a reserved
// chrome role. `disabled`/`label` are computed by App.jsx (which owns the
// gating-condition evaluation and last-page detection) so this component
// stays a plain, dumb button.
export default function ContinueButton({ label, disabled, onClick }) {
  return (
    <div className="continue-button-row">
      <button type="button" className="continue-button" disabled={disabled} onClick={onClick}>
        {label}
      </button>
    </div>
  );
}
