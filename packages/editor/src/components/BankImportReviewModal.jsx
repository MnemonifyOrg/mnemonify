import { useMemo, useState } from 'react';
import { inspectNativeQuestionBankImport } from '@mnemonify/schema/question-bank-transfer.js';

function WarningList({ title, items, format }) {
  if (!items?.length) return null;
  return (
    <div className="bank-transfer-review__warning">
      <strong>{title}</strong>
      <ul>
        {items.map((item, index) => <li key={`${item.id || item.name}:${item.question_id}:${index}`}>{format(item)}</li>)}
      </ul>
    </div>
  );
}

export default function BankImportReviewModal({ payload, courseJson, questionBanks = [], onConfirm, onClose }) {
  const [mode, setMode] = useState('create_new');
  const [targetBankId, setTargetBankId] = useState(questionBanks[0]?.bank_id || '');
  const preview = useMemo(() => inspectNativeQuestionBankImport(courseJson, payload, mode === 'merge' ? targetBankId : null), [courseJson, payload, mode, targetBankId]);
  const hasMissingReferences = preview.missingObjectives.length > 0 || preview.missingVariables.length > 0;

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card bank-transfer-modal bank-transfer-review" role="dialog" aria-modal="true" aria-labelledby="bank-import-title">
        <h2 id="bank-import-title">Review bank import</h2>
        <p className="settings-panel__hint">{preview.questionCount} question{preview.questionCount === 1 ? '' : 's'} from <strong>{preview.bankTitle}</strong>.</p>

        <fieldset className="bank-transfer-review__choice">
          <legend>Import destination</legend>
          <label className="settings-panel__radio-row">
            <input type="radio" name="bank-import-mode" checked={mode === 'create_new'} onChange={() => setMode('create_new')} />
            Create a new bank
          </label>
          <label className="settings-panel__radio-row">
            <input type="radio" name="bank-import-mode" checked={mode === 'merge'} onChange={() => setMode('merge')} disabled={questionBanks.length === 0} />
            Merge into an existing bank
          </label>
          {mode === 'merge' && (
            <select className="input" aria-label="Target question bank" value={targetBankId} onChange={(event) => setTargetBankId(event.target.value)}>
              {questionBanks.map((bank) => <option key={bank.bank_id} value={bank.bank_id}>{bank.name || bank.bank_id}</option>)}
            </select>
          )}
        </fieldset>

        {preview.idCollisions.length > 0 && (
          <div className="bank-transfer-review__info">
            <strong>{preview.idCollisions.length} question ID collision{preview.idCollisions.length === 1 ? '' : 's'}</strong>
            <p>Colliding imported IDs will be regenerated; existing questions will not be overwritten.</p>
            <code>{preview.idCollisions.join(', ')}</code>
          </div>
        )}

        {hasMissingReferences && (
          <div className="bank-transfer-review__warning bank-transfer-review__warning--major">
            <strong>Unresolved references found</strong>
            <p>These references will be preserved as authored. Mnemonify will not auto-create them or silently remove them.</p>
          </div>
        )}
        <WarningList title="Missing objectives" items={preview.missingObjectives} format={(item) => `${item.id} — ${item.location}`} />
        <WarningList title="Missing variables" items={preview.missingVariables} format={(item) => `${item.name} — ${item.location}`} />

        <div className="modal-actions">
          <button type="button" className="btn-text" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => onConfirm({ mode, targetBankId: mode === 'merge' ? targetBankId : null })}>
            {hasMissingReferences ? 'Import with warnings' : 'Import bank'}
          </button>
        </div>
      </div>
    </div>
  );
}
