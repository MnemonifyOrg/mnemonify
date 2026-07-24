import { FEATURE_FLAGS } from '@mnemonify/schema/featureFlags.js';

function usageLabel(usage) {
  return usage.kind === 'page'
    ? `Page: ${usage.label} (${usage.block_id})`
    : `Question bank: ${usage.label} (${usage.question_id})`;
}

export default function LinkedEntityPrompt({ mode, usages = [], onConfirm, onDetach, onCancel, featureFlags = FEATURE_FLAGS }) {
  if (!featureFlags.linkedQuestions) return null;
  const isEdit = mode === 'edit';
  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card linked-entity-prompt" role="dialog" aria-modal="true" aria-labelledby="linked-entity-prompt-title">
        <h2 id="linked-entity-prompt-title">{isEdit ? 'Update linked question?' : 'Delete linked question?'}</h2>
        <p>
          {isEdit
            ? 'This question is used in more than one place. Choose whether to update every usage or keep this edit only here.'
            : 'This page usage is linked to other places. Choose whether to unlink only this usage or delete the shared question everywhere.'}
        </p>
        <ul className="linked-entity-prompt__usages">
          {usages.map((usage) => <li key={`${usage.kind}:${usage.page_id || usage.bank_id}:${usage.block_id || usage.question_id}`}>{usageLabel(usage)}</li>)}
        </ul>
        <div className="modal-actions">
          <button type="button" className="btn-text" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn" onClick={onDetach}>{isEdit ? 'Keep this instance only' : 'Unlink this instance'}</button>
          <button type="button" className={isEdit ? 'btn btn-primary' : 'btn btn-danger'} onClick={onConfirm}>{isEdit ? 'Update all usages' : 'Delete everywhere'}</button>
        </div>
      </div>
    </div>
  );
}
