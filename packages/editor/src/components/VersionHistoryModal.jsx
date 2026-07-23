import { useEffect, useState } from 'react';
import { formatVersionDate, restoreConfirmationMessage, sortVersionsNewestFirst } from '../lib/versionHistory.js';

function errorMessage(error) {
  return error?.response?.data?.error || error?.message || 'Something went wrong. Please try again.';
}

export default function VersionHistoryModal({ versions = [], loading = false, error = null, onSave, onRestore, onClose }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingVersion, setConfirmingVersion] = useState(null);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose]);

  async function handleSave(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setActionError('Enter a name for this version.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await onSave(trimmedName);
      setName('');
    } catch (saveError) {
      setActionError(errorMessage(saveError));
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (!confirmingVersion) return;
    setBusy(true);
    setActionError(null);
    try {
      await onRestore(confirmingVersion);
      setConfirmingVersion(null);
    } catch (restoreError) {
      setActionError(errorMessage(restoreError));
    } finally {
      setBusy(false);
    }
  }

  const orderedVersions = sortVersionsNewestFirst(versions);

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="modal-card modal-card--wide version-history-modal" role="dialog" aria-modal="true" aria-labelledby="version-history-title">
        <div className="version-history-modal__header">
          <div>
            <h2 id="version-history-title">Version History</h2>
            <p className="settings-panel__hint">Manual snapshots of the complete course. Saving or restoring never removes history.</p>
          </div>
          <button type="button" className="btn-text modal-close" aria-label="Close version history" onClick={onClose} disabled={busy}>✕</button>
        </div>

        <form className="version-history-modal__save" onSubmit={handleSave}>
          <label htmlFor="version-name">Save as version</label>
          <div className="version-history-modal__save-row">
            <input
              id="version-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Beta review"
              maxLength={120}
              disabled={busy}
            />
            <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>Save snapshot</button>
          </div>
        </form>

        {(error || actionError) && <p className="bank-transfer-error" role="alert">{errorMessage(actionError || error)}</p>}

        <section aria-labelledby="saved-versions-title">
          <h3 id="saved-versions-title">Saved versions</h3>
          {loading ? <p className="settings-panel__empty">Loading version history…</p> : orderedVersions.length === 0 ? (
            <p className="settings-panel__empty">No saved versions yet. Save a snapshot when you reach a milestone.</p>
          ) : (
            <ul className="version-history-modal__list">
              {orderedVersions.map((version) => (
                <li key={version.version_id} className="version-history-modal__item">
                  <div>
                    <strong>{version.name}</strong>
                    <div className="settings-panel__hint">
                      {formatVersionDate(version.created_at)} · {version.author || version.created_by || 'Unknown author'}
                    </div>
                    {version.restored_from_version_id && <div className="version-history-modal__lineage">Created by restoring an earlier version</div>}
                  </div>
                  <button type="button" className="btn" onClick={() => { setActionError(null); setConfirmingVersion(version); }} disabled={busy}>Restore</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {confirmingVersion && (
          <div className="version-history-modal__confirm" role="alertdialog" aria-labelledby="restore-version-title" aria-describedby="restore-version-description">
            <h3 id="restore-version-title">Confirm restore</h3>
            <p id="restore-version-description">{restoreConfirmationMessage(confirmingVersion)}</p>
            <div className="modal-actions">
              <button type="button" className="btn-text" onClick={() => setConfirmingVersion(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleRestore} disabled={busy}>Restore version</button>
            </div>
          </div>
        )}

        {!confirmingVersion && <button type="button" className="btn-text modal-close" onClick={onClose} disabled={busy}>Close</button>}
      </div>
    </div>
  );
}
