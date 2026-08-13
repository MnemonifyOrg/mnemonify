import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import SettingsSection from './SettingsSection.jsx';

function errorMessage(error, fallback) {
  return error?.response?.data?.error || error?.message || fallback;
}

function inputValue(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16);
}

function isExpired(link) {
  return Boolean(link.expires_at && new Date(link.expires_at).getTime() <= Date.now());
}

function linkStatus(link) {
  if (link.revoked) return 'Revoked';
  if (isExpired(link)) return 'Expired';
  return link.expires_at ? `Expires ${new Date(link.expires_at).toLocaleString()}` : 'Never expires';
}

export default function ShareLinksPanel({ courseId, canManage, published }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(canManage);
  const [error, setError] = useState(null);
  const [newExpiration, setNewExpiration] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  async function loadLinks() {
    if (!canManage) return;
    setLoading(true);
    setError(null);
    try {
      setLinks(await api.listShareLinks(courseId));
    } catch (loadError) {
      setError(errorMessage(loadError, 'Share links could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLinks();
    // The panel is mounted only while the Course drawer is open. Reloading on
    // courseId/role changes keeps the list fresh without a polling loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, canManage]);

  function expiresAtPayload(value) {
    return value ? new Date(value).toISOString() : null;
  }

  async function createLink(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.createShareLink(courseId, { expires_at: expiresAtPayload(newExpiration) });
      setLinks((current) => [created, ...current]);
      setNewExpiration('');
    } catch (createError) {
      setError(errorMessage(createError, 'Share link could not be created.'));
    } finally {
      setSaving(false);
    }
  }

  async function updateExpiration(link) {
    setSavingId(link.share_link_id);
    setError(null);
    try {
      const updated = await api.updateShareLink(courseId, link.share_link_id, { expires_at: expiresAtPayload(link.editExpiration) });
      setLinks((current) => current.map((item) => item.share_link_id === updated.share_link_id ? { ...updated, editExpiration: inputValue(updated.expires_at) } : item));
    } catch (updateError) {
      setError(errorMessage(updateError, 'Expiration could not be updated.'));
    } finally {
      setSavingId(null);
    }
  }

  async function revokeLink(link) {
    setSavingId(link.share_link_id);
    setError(null);
    try {
      await api.revokeShareLink(courseId, link.share_link_id);
      setLinks((current) => current.map((item) => item.share_link_id === link.share_link_id
        ? { ...item, revoked: true, revoked_at: new Date().toISOString() }
        : item));
    } catch (revokeError) {
      setError(errorMessage(revokeError, 'Share link could not be revoked.'));
    } finally {
      setSavingId(null);
    }
  }

  async function copyLink(link) {
    if (!link.share_url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link.share_url);
      } else {
        const input = document.createElement('textarea');
        input.value = link.share_url;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      setCopiedId(link.share_link_id);
      window.setTimeout(() => setCopiedId((current) => current === link.share_link_id ? null : current), 1800);
    } catch {
      setError('The link could not be copied.');
    }
  }

  if (!canManage) {
    return (
      <SettingsSection title="Anonymous share links">
        <p className="settings-panel__hint">Only course owners and editors can manage anonymous share links.</p>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Anonymous share links">
      <p className="settings-panel__hint">Share the latest published course with someone who does not have a Mnemonify account. Links are read-only and never expose comments or draft edits.</p>
      {!published && <p className="share-links-panel__notice">Publish this course before creating a share link.</p>}
      {error && <p className="share-links-panel__error" role="alert">{error}</p>}
      <form className="share-links-panel__create" onSubmit={createLink}>
        <label htmlFor="share-link-expiration">Expiration (optional)</label>
        <div className="share-links-panel__create-row">
          <input
            id="share-link-expiration"
            className="input"
            type="datetime-local"
            value={newExpiration}
            min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
            onChange={(event) => setNewExpiration(event.target.value)}
            disabled={!published || saving}
          />
          <button type="submit" className="btn btn-primary" disabled={!published || saving}>
            {saving ? 'Creating…' : 'Create link'}
          </button>
        </div>
      </form>

      {loading && <p className="settings-panel__hint">Loading links…</p>}
      {!loading && links.length === 0 && <p className="settings-panel__hint">No share links yet.</p>}
      <div className="share-links-panel__list">
        {links.map((link) => (
          <article className={`share-links-panel__link ${link.revoked || isExpired(link) ? 'share-links-panel__link--inactive' : ''}`} key={link.share_link_id}>
            <div className="share-links-panel__link-heading">
              <strong>{linkStatus(link)}</strong>
              <time dateTime={link.created_at}>Created {new Date(link.created_at).toLocaleDateString()}</time>
            </div>
            <div className="share-links-panel__url-row">
              <input className="input" value={link.share_url || 'Link URL unavailable'} readOnly aria-label="Share link URL" />
              <button type="button" className="btn" onClick={() => copyLink(link)} disabled={!link.share_url}>
                {copiedId === link.share_link_id ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="share-links-panel__link-actions">
              <label>
                Expiration
                <input
                  className="input"
                  type="datetime-local"
                  value={link.editExpiration ?? inputValue(link.expires_at)}
                  min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                  onChange={(event) => setLinks((current) => current.map((item) => item.share_link_id === link.share_link_id ? { ...item, editExpiration: event.target.value } : item))}
                  disabled={link.revoked || savingId === link.share_link_id}
                />
              </label>
              <button type="button" className="btn" onClick={() => updateExpiration(link)} disabled={link.revoked || savingId === link.share_link_id}>
                Save expiration
              </button>
              <button type="button" className="btn btn-danger" onClick={() => revokeLink(link)} disabled={link.revoked || savingId === link.share_link_id}>
                {link.revoked ? 'Revoked' : 'Revoke'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </SettingsSection>
  );
}
