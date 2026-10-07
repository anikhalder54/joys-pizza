import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { AdminTabsWithCount, StaffOnly, useAdminGuard } from '../components/AdminTabs';
import { api, errorMessage } from '../lib/api';
import { roleLabel } from '../lib/roles';
import type { PublicUser } from '../types';

/**
 * Admin-only: create Store Manager accounts, give an existing account Store Manager access,
 * or remove that access. Store Managers and Customers can't open this page (and the API refuses them too).
 */
export default function AdminStaffPage() {
  const { user, isAdmin } = useAdminGuard('/admin/staff');
  const [staff, setStaff] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [grantEmail, setGrantEmail] = useState('');
  const [grantError, setGrantError] = useState('');
  const [granting, setGranting] = useState(false);

  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStaff(await api.admin.staff());
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(''), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  if (!user) return null;
  if (!isAdmin) return <StaffOnly adminOnly />;

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (form.name.trim().length < 2) return setFormError('Enter the store manager’s name.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setFormError('Enter a valid email.');
    if (form.password.length < 8) return setFormError('Password must be at least 8 characters.');
    if (form.password !== form.confirm) return setFormError('Passwords do not match.');
    setSaving(true);
    try {
      const created = await api.admin.createStoreManager({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      setForm({ name: '', email: '', phone: '', password: '', confirm: '' });
      setFlash(`${created.name} can now sign in as Store Manager`);
      load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const grant = async (e: FormEvent) => {
    e.preventDefault();
    setGrantError('');
    if (!/^\S+@\S+\.\S+$/.test(grantEmail)) return setGrantError('Enter a valid email.');
    setGranting(true);
    try {
      const u = await api.admin.grantStoreManager(grantEmail.trim());
      setGrantEmail('');
      setFlash(`${u.name} is now a Store Manager (they need to sign in again)`);
      load();
    } catch (err) {
      setGrantError(errorMessage(err));
    } finally {
      setGranting(false);
    }
  };

  const remove = async (u: PublicUser) => {
    setConfirmRemove(null);
    try {
      await api.admin.revokeStoreManager(u.id);
      setFlash(`${u.name} no longer has Store Manager access`);
      load();
    } catch (err) {
      setFlash(`⚠ ${errorMessage(err)}`);
    }
  };

  return (
    <div className="page admin">
      <div className="container">
        <AdminTabsWithCount />

        <div className="page-title-row">
          <div>
            <span className="eyebrow">Admin only</span>
            <h1>Staff accounts</h1>
          </div>
        </div>

        <div className="staff-grid">
          {/* ---------- create ---------- */}
          <form className="panel stack" onSubmit={create} noValidate>
            <h3>Add a Store Manager</h3>
            <p className="muted small">
              Store Managers can run the order dashboard and manage the menu. They can’t create staff accounts.
            </p>
            <div className="form-grid">
              <label>Full name<input value={form.name} onChange={set('name')} autoComplete="off" /></label>
              <label>Phone (optional)<input value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="off" /></label>
              <label className="span-2">Email (used to sign in)<input type="email" value={form.email} onChange={set('email')} autoComplete="off" /></label>
              <label>Password<input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" /></label>
              <label>Confirm password<input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" /></label>
            </div>
            {formError && <p className="alert alert-error">{formError}</p>}
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Store Manager'}</button>
          </form>

          {/* ---------- grant ---------- */}
          <form className="panel stack" onSubmit={grant} noValidate>
            <h3>Give access to an existing account</h3>
            <p className="muted small">
              If the person already signed up on the website, enter their email to make them a Store Manager.
            </p>
            <label>Account email<input type="email" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} autoComplete="off" /></label>
            {grantError && <p className="alert alert-error">{grantError}</p>}
            <button className="btn btn-outline" disabled={granting}>{granting ? 'Saving…' : 'Make Store Manager'}</button>
          </form>
        </div>

        {/* ---------- list ---------- */}
        <h2 className="list-head">Current staff</h2>
        {error && <p className="alert alert-error">{error}</p>}
        <div className="item-table">
          {loading && <div className="item-row staff-row"><span className="muted">Loading…</span></div>}
          {!loading && staff.length === 0 && <div className="item-row staff-row"><span className="muted">No staff yet.</span></div>}
          {staff.map((s) => (
            <div key={s.id} className="item-row staff-row">
              <div className="item-main">
                <div className="item-title">
                  <strong>{s.name}</strong>
                  <span className={`pill ${s.role === 'admin' ? 'pill-dark' : 'pill-red'}`}>{roleLabel(s.role)}</span>
                  {s.id === user.id && <span className="muted small">(you)</span>}
                </div>
                <p className="item-desc">{s.email}{s.phone ? ` · ${s.phone}` : ''}</p>
              </div>
              <div className="item-actions">
                {s.role === 'store_manager' &&
                  (confirmRemove === s.id ? (
                    <>
                      <span className="small">Remove access?</span>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(s)}>Remove</button>
                      <button className="btn btn-sm btn-ghost-dark" onClick={() => setConfirmRemove(null)}>Keep</button>
                    </>
                  ) : (
                    <button className="btn btn-sm btn-ghost-dark" onClick={() => setConfirmRemove(s.id)}>Remove access</button>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>
          Removing access turns the account back into a normal customer account. It takes effect immediately.
        </p>
      </div>

      <div className={`toast ${flash ? 'show' : ''}`} role="status" aria-live="polite">
        <span>{flash}</span>
      </div>
    </div>
  );
}
