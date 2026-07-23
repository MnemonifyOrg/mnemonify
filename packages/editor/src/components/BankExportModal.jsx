export default function BankExportModal({ bank, onExport, onClose }) {
  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card bank-transfer-modal" role="dialog" aria-modal="true" aria-labelledby="bank-export-title">
        <h2 id="bank-export-title">Export bank</h2>
        <p className="settings-panel__hint">Choose a format for {bank?.name || bank?.bank_id || 'this question bank'}.</p>
        <div className="bank-transfer-modal__options">
          <button type="button" className="btn" onClick={() => onExport('native')}>
            Native Mnemonify JSON
            <span>Full fidelity, including objectives and linked-question metadata.</span>
          </button>
          <button type="button" className="btn" onClick={() => onExport('gift')}>
            GIFT interoperability format
            <span>Portable question/answer text with documented fidelity gaps.</span>
          </button>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-text" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
