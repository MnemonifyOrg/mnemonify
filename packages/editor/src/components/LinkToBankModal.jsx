import { useState } from 'react';

export default function LinkToBankModal({ questionBanks = [], onConfirm, onClose }) {
  const [bankId, setBankId] = useState(questionBanks[0]?.bank_id || '');
  return (
    <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="link-to-bank-title">
        <h2 id="link-to-bank-title">Add question to a bank</h2>
        <p className="settings-panel__hint">The page block and new bank entry will share one canonical question entity.</p>
        {questionBanks.length === 0 ? (
          <p className="settings-panel__empty">Create a question bank first.</p>
        ) : (
          <>
            <label htmlFor="link-to-bank-select">Question bank</label>
            <select id="link-to-bank-select" className="input" value={bankId} onChange={(event) => setBankId(event.target.value)}>
              {questionBanks.map((bank) => <option key={bank.bank_id} value={bank.bank_id}>{bank.name || bank.bank_id}</option>)}
            </select>
            <div className="modal-actions">
              <button type="button" className="btn-text" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={!bankId} onClick={() => onConfirm(bankId)}>Link to bank</button>
            </div>
          </>
        )}
        {questionBanks.length === 0 && <button type="button" className="btn-text modal-close" aria-label="Close add to bank dialog" onClick={onClose}>✕</button>}
      </div>
    </div>
  );
}
