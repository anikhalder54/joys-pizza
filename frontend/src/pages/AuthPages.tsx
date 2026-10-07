import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { isStaff } from '../lib/roles';
import { Link, navigate, useRoute } from '../lib/router';
import { RESTAURANT } from '../data/restaurant';

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-art">
        <div>
          <img src="/logo.webp" alt={RESTAURANT.name} width={260} height={202} className="auth-logo" />
          <h2 className="tagline">{RESTAURANT.tagline}</h2>
          <p>{RESTAURANT.motto}. Order online for pickup or delivery from {RESTAURANT.address.line1}, {RESTAURANT.address.city}.</p>
        </div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const { query } = useRoute();
  const next = query.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    navigate(next ?? (isStaff(res.user) ? '/admin' : '/'));
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to order and track your food.">
      {next === '/checkout' && <p className="alert alert-info">Please sign in to complete your order.</p>}
      <form onSubmit={submit} className="stack">
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="switch">
        New here? <Link to={`/signup${next ? `?next=${next}` : ''}`}>Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function SignupPage() {
  const { signup } = useAuth();
  const { query } = useRoute();
  const next = query.get('next');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Please enter a valid email.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setBusy(true);
    const res = await signup({ name: form.name, email: form.email, phone: form.phone, password: form.password });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    navigate(next ?? '/menu');
  };

  return (
    <AuthShell title="Create your account" subtitle="Save your details for faster checkout and order tracking.">
      <form onSubmit={submit} className="stack">
        <label>Full name<input value={form.name} onChange={set('name')} autoComplete="name" required /></label>
        <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
        <label>Phone (optional)<input value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" /></label>
        <div className="form-grid">
          <label>Password<input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" required /></label>
          <label>Confirm<input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required /></label>
        </div>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="switch">
        Already have an account? <Link to={`/login${next ? `?next=${next}` : ''}`}>Sign in</Link>
      </p>
    </AuthShell>
  );
}
