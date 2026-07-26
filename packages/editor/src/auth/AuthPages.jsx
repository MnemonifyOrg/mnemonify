import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';
import '../styles/auth.css';

function AuthShell({ title, children }) {
  return (
    <main className="auth-page">
      <section className="auth-card card">
        <img src="/brand/logos/svg/mnemonify-primary-horizontal.svg" alt="Mnemonify" className="auth-card__logo" />
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  );
}

function ErrorMessage({ error }) {
  return error ? <p className="auth-error" role="alert">{error}</p> : null;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try { await login(form); navigate(location.state?.from || '/', { replace: true }); }
    catch (err) { setError(err.response?.data?.error || 'Could not sign in.'); }
    finally { setBusy(false); }
  }
  return (
    <AuthShell title="Sign in">
      <form className="auth-form" onSubmit={submit}>
        <label>Email<input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></label>
        <label>Password<input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" /></label>
        <ErrorMessage error={error} />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="auth-links"><Link to="/reset-password">Forgot password?</Link> · <Link to="/signup">Create an account</Link></p>
      <p className="auth-dev-note">Local development: the seeded owner is <code>dev@mnemonify.org</code> / <code>dev-password</code>.</p>
    </AuthShell>
  );
}

export function SignupPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  async function submit(event) {
    event.preventDefault(); setError('');
    try { setResult(await api.signup({ ...form, invite_token: params.get('invite_token') || undefined })); }
    catch (err) { setError(err.response?.data?.error || 'Could not create the account.'); }
  }
  if (result) return <AuthShell title="Check your email"><p>Your account is ready. Open the verification link to activate it.</p>{result.verification_url && <p><a href={result.verification_url}>Verify email (local development)</a></p>}<p><Link to="/login">Return to sign in</Link></p></AuthShell>;
  return (
    <AuthShell title="Create your account">
      <form className="auth-form" onSubmit={submit}>
        <label>Name<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>
        <label>Email<input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></label>
        <label>Password<input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" /></label>
        <ErrorMessage error={error} />
        <button className="btn btn-primary">Create account</button>
      </form>
      <p className="auth-links"><Link to="/login">Already have an account?</Link></p>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState('Verifying…');
  useEffect(() => {
    api.verifyEmail(params.get('token')).then(() => setMessage('Your email is verified.')).catch((err) => setMessage(err.response?.data?.error || 'Verification failed.'));
  }, [params]);
  return <AuthShell title="Email verification"><p>{message}</p><Link to="/login">Continue to sign in</Link></AuthShell>;
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      if (params.get('token')) {
        await api.confirmPasswordReset({ token: params.get('token'), password });
        setMessage('Password reset. You can now sign in.');
      } else {
        const result = await api.requestPasswordReset(email);
        setMessage(result.reset_url ? `Open the local reset link: ${result.reset_url}` : result.message);
      }
    } catch (err) { setError(err.response?.data?.error || 'Could not complete the request.'); }
  }
  return <AuthShell title={params.get('token') ? 'Choose a new password' : 'Reset password'}><form className="auth-form" onSubmit={submit}>{!params.get('token') && <label>Email<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>}{params.get('token') && <label>New password<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" /></label>}<ErrorMessage error={error} />{message && <p className="auth-success">{message}</p>}<button className="btn btn-primary">{params.get('token') ? 'Reset password' : 'Send reset link'}</button></form><p className="auth-links"><Link to="/login">Back to sign in</Link></p></AuthShell>;
}
