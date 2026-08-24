import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function OrganizationMembersPanel({ onClose }) {
  const { membership, user } = useAuth();
  const organisationId = membership?.organisation_id;
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  const refresh = useCallback(async () => {
    if (organisationId) setMembers(await api.listOrganizationMembers(organisationId));
  }, [organisationId]);
  useEffect(() => { refresh(); }, [refresh]);

  async function invite(event) {
    event.preventDefault(); setError(''); setFieldError(''); setMessage('');
    if (!email.trim()) {
      setFieldError('Enter the colleague’s email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Enter an email address in the format name@example.com.');
      return;
    }
    try {
      const result = await api.inviteOrganizationMember(organisationId, { email, role });
      setEmail('');
      setMessage(result.direct ? 'Existing user added to the organization.' : 'Invitation sent.');
      if (result.invitation_url) setMessage(`Invitation created. Local link: ${result.invitation_url}`);
      await refresh();
    } catch (err) { setError(err.response?.data?.error || 'Could not invite member.'); }
  }

  async function changeRole(member, nextRole) {
    setError('');
    try { await api.updateOrganizationMember(organisationId, member.id, { role: nextRole }); await refresh(); }
    catch (err) { setError(err.response?.data?.error || 'Could not change role.'); }
  }

  async function remove(member) {
    if (!window.confirm(`Remove ${member.name || member.email} from this organization?`)) return;
    setError('');
    try { await api.removeOrganizationMember(organisationId, member.id); await refresh(); }
    catch (err) { setError(err.response?.data?.error || 'Could not remove member.'); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-card organization-members" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="organization-members-title">
        <header className="organization-members__header"><div><h2 id="organization-members-title">Team members</h2><p>Manage access to this organization.</p></div><button className="btn-text" onClick={onClose} aria-label="Close team members">×</button></header>
        <form className="organization-members__invite" onSubmit={invite} noValidate>
          <label htmlFor="organization-member-email">Email</label>
          <div className="organization-members__email-field">
            <input id="organization-member-email" className="input" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setFieldError(''); }} aria-invalid={!!fieldError} aria-describedby={fieldError ? 'organization-member-email-error' : undefined} placeholder="colleague@example.com" />
            {fieldError && <p id="organization-member-email-error" className="organization-members__field-error" role="alert">{fieldError}</p>}
          </div>
          <label>Role<select className="input" value={role} onChange={(event) => setRole(event.target.value)}><option value="editor">Editor</option><option value="reviewer">Reviewer</option><option value="owner">Owner</option></select></label>
          <button className="btn btn-primary">Invite</button>
        </form>
        {message && <p className="auth-success">{message}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="organization-members__list">
          {members.map((member) => (
            <div className="organization-members__row" key={member.id}>
              <div><strong>{member.name || member.email}</strong><small>{member.email}{member.id === user?.id ? ' · You' : ''}</small></div>
              <select className="input organization-members__role" value={member.role} onChange={(event) => changeRole(member, event.target.value)}><option value="owner">Owner</option><option value="editor">Editor</option><option value="reviewer">Reviewer</option></select>
              <button className="btn-text" onClick={() => remove(member)} aria-label={`Remove ${member.email}`}>Remove</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
