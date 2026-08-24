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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function FieldError({ id, message }) {
  return message ? <p id={id} className="auth-field-error" role="alert">{message}</p> : null;
}

function validateEmailField(email) {
  if (!email.trim()) return 'Enter your email address.';
  if (!isValidEmail(email)) return 'Enter an email address in the format name@example.com.';
  return '';
}

function validatePasswordField(password) {
  if (!password) return 'Enter your password.';
  if (password.length < 8) return 'Use at least 8 characters for your password.';
  return '';
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const nextFieldErrors = {
      email: validateEmailField(form.email),
      password: form.password ? '' : 'Enter your password.',
    };
    if (Object.values(nextFieldErrors).some(Boolean)) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setBusy(true); setError('');
    setFieldErrors({});
    try { await login(form); navigate(location.state?.from || '/', { replace: true }); }
    catch (err) { setError(err.response?.data?.error || 'Could not sign in.'); }
    finally { setBusy(false); }
  }
  return (
    <AuthShell title="Sign in">
      <form className="auth-form" onSubmit={submit} noValidate>
        <label htmlFor="login-email">Email</label>
        <input id="login-email" className="input" type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((current) => ({ ...current, email: '' })); }} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'login-email-error' : undefined} autoComplete="email" />
        <FieldError id="login-email-error" message={fieldErrors.email} />
        <label htmlFor="login-password">Password</label>
        <input id="login-password" className="input" type="password" value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setFieldErrors((current) => ({ ...current, password: '' })); }} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? 'login-password-error' : undefined} autoComplete="current-password" />
        <FieldError id="login-password-error" message={fieldErrors.password} />
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);
  async function submit(event) {
    event.preventDefault(); setError('');
    const nextFieldErrors = {
      email: validateEmailField(form.email),
      password: validatePasswordField(form.password),
    };
    if (Object.values(nextFieldErrors).some(Boolean)) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setFieldErrors({});
    try { setResult(await api.signup({ ...form, invite_token: params.get('invite_token') || undefined })); }
    catch (err) { setError(err.response?.data?.error || 'Could not create the account.'); }
  }
  if (result) return <AuthShell title="Check your email"><p>Your account is ready. Open the verification link to activate it.</p>{result.verification_url && <p><a href={result.verification_url}>Verify email (local development)</a></p>}<p><Link to="/login">Return to sign in</Link></p></AuthShell>;
  return (
    <AuthShell title="Create your account">
      <form className="auth-form" onSubmit={submit} noValidate>
        <label htmlFor="signup-name">Name</label>
        <input id="signup-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
        <label htmlFor="signup-email">Email</label>
        <input id="signup-email" className="input" type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((current) => ({ ...current, email: '' })); }} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined} autoComplete="email" />
        <FieldError id="signup-email-error" message={fieldErrors.email} />
        <label htmlFor="signup-password">Password</label>
        <input id="signup-password" className="input" type="password" value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setFieldErrors((current) => ({ ...current, password: '' })); }} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined} autoComplete="new-password" />
        <FieldError id="signup-password-error" message={fieldErrors.password} />
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
  const [fieldError, setFieldError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    const validationError = params.get('token') ? validatePasswordField(password) : validateEmailField(email);
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    setFieldError('');
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
  const hasToken = !!params.get('token');
  return (
    <AuthShell title={hasToken ? 'Choose a new password' : 'Reset password'}>
      <form className="auth-form" onSubmit={submit} noValidate>
        {!hasToken && (
          <>
            <label htmlFor="reset-email">Email</label>
            <input id="reset-email" className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setFieldError(''); }} aria-invalid={!!fieldError} aria-describedby={fieldError ? 'reset-field-error' : undefined} />
          </>
        )}
        {hasToken && (
          <>
            <label htmlFor="reset-password">New password</label>
            <input id="reset-password" className="input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setFieldError(''); }} aria-invalid={!!fieldError} aria-describedby={fieldError ? 'reset-field-error' : undefined} autoComplete="new-password" />
          </>
        )}
        <FieldError id="reset-field-error" message={fieldError} />
        <ErrorMessage error={error} />
        {message && <p className="auth-success">{message}</p>}
        <button className="btn btn-primary">{hasToken ? 'Reset password' : 'Send reset link'}</button>
      </form>
      <p className="auth-links"><Link to="/login">Back to sign in</Link></p>
    </AuthShell>
  );
}
