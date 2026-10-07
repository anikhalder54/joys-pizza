import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminTabsWithCount, StaffOnly, useAdminGuard } from '../components/AdminTabs';
import MenuItemForm, { type Draft } from '../components/MenuItemForm';
import { errorMessage } from '../lib/api';
import SmartImage from '../components/SmartImage';
import { PlusIcon, SearchIcon, StarIcon } from '../components/Icons';
import { useMenu } from '../context/MenuContext';
import { CATEGORIES, isAvailable } from '../data/menu';
import { money } from '../lib/storage';
import type { Category, MenuItem, MenuItemInput } from '../types';

type CatFilter = 'All' | Category;
type StatusFilter = 'all' | 'available' | 'unavailable';

const priceLabel = (m: MenuItem) => {
  if (!m.sizes?.length) return money(m.price);
  const ps = m.sizes.map((s) => s.price);
  const lo = Math.min(...ps);
  const hi = Math.max(...ps);
  return lo === hi ? money(lo) : `${money(lo)} – ${money(hi)}`;
};

export default function AdminMenuPage() {
  const { user, isStaff, isAdmin } = useAdminGuard('/admin/menu');
  const { items, loading, error: loadError, addItem, updateItem, setAvailable, deleteItem, resetMenu, uploadImage } = useMenu();

  const [cat, setCat] = useState<CatFilter>('All');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(''), 2600);
    return () => clearTimeout(t);
  }, [flash]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter(
      (m) =>
        (cat === 'All' || m.category === cat) &&
        (status === 'all' || (status === 'available') === isAvailable(m)) &&
        (!term || m.name.toLowerCase().includes(term) || m.description.toLowerCase().includes(term)),
    );
  }, [items, cat, status, q]);

  if (!user) return null;
  if (!isStaff) return <StaffOnly />;

  const availableCount = items.filter(isAvailable).length;
  const unavailableCount = items.length - availableCount;
  const catCount = (c: CatFilter) => (c === 'All' ? items.length : items.filter((m) => m.category === c).length);

  const groups = (cat === 'All' ? CATEGORIES : [cat])
    .map((c) => ({ c, rows: list.filter((m) => m.category === c) }))
    .filter((g) => g.rows.length);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      setFlash(success);
    } catch (e) {
      setFlash(`⚠ ${errorMessage(e)}`);
    }
  };

  const toggle = (m: MenuItem) => {
    const next = !isAvailable(m);
    run(
      () => setAvailable(m.id, next),
      `${m.name} is now ${next ? 'available — showing on the website' : 'unavailable — hidden from the website'}`,
    );
  };

  const toInput = (d: Draft): MenuItemInput => ({
    name: d.name,
    description: d.description,
    price: d.price,
    category: d.category,
    image: d.image || undefined,
    tags: d.tags ?? [],
    special: !!d.special,
    sizes: d.sizes,
    available: d.available !== false,
  });

  return (
    <div className="page admin">
      <div className="container">
        <AdminTabsWithCount />

        <div className="page-title-row">
          <div>
            <span className="eyebrow">Menu management</span>
            <h1>Menu items</h1>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <PlusIcon width={16} height={16} /> Add item
          </button>
        </div>

        <div className="stat-row three">
          <button className={`stat stat-btn ${status === 'all' ? 'selected' : ''}`} onClick={() => setStatus('all')}>
            <span>All items</span><strong>{items.length}</strong>
          </button>
          <button className={`stat stat-btn ${status === 'available' ? 'selected' : ''}`} onClick={() => setStatus('available')}>
            <span>Available on website</span><strong className="txt-green">{availableCount}</strong>
          </button>
          <button className={`stat stat-btn ${status === 'unavailable' ? 'selected' : ''}`} onClick={() => setStatus('unavailable')}>
            <span>Unavailable (hidden)</span><strong className="txt-red">{unavailableCount}</strong>
          </button>
        </div>

        <div className="admin-toolbar">
          <div className="chips">
            {(['All', ...CATEGORIES] as CatFilter[]).map((c) => (
              <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
                {c} <span className="chip-count">{catCount(c)}</span>
              </button>
            ))}
          </div>
          <label className="search">
            <SearchIcon width={16} height={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" aria-label="Search items" />
          </label>
        </div>

        {loadError && <p className="alert alert-error">Couldn't load the menu: {loadError}</p>}

        {groups.length === 0 ? (
          <div className="panel center-page">
            <p className="muted">{loading ? 'Loading menu…' : 'No items match these filters.'}</p>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.c} className="admin-menu-group">
              <h2 className="list-head">{g.c} <small className="muted">({g.rows.length})</small></h2>
              <div className="item-table" role="table" aria-label={`${g.c} items`}>
                {g.rows.map((m) => {
                  const on = isAvailable(m);
                  return (
                    <div key={m.id} className={`item-row ${on ? '' : 'off'}`} role="row">
                      <SmartImage src={m.image} alt={m.name} className="item-thumb" />
                      <div className="item-main" role="cell">
                        <div className="item-title">
                          <strong>{m.name}</strong>
                          {m.special && <span className="special-mark" title="Chef's special"><StarIcon width={12} height={12} /> Special</span>}
                        </div>
                        {m.description && <p className="item-desc">{m.description}</p>}
                        {!!m.tags?.length && (
                          <div className="tags">
                            {m.tags.map((t) => <span key={t} className={`tag tag-${t.toLowerCase().replace(/\s+/g, '-')}`}>{t}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="item-price" role="cell">
                        <strong>{priceLabel(m)}</strong>
                        {m.sizes?.length ? <small className="muted">{m.sizes.length} sizes</small> : null}
                      </div>
                      <div className="item-status" role="cell">
                        <button
                          className={`switch-btn ${on ? 'on' : ''}`}
                          role="switch"
                          aria-checked={on}
                          aria-label={`${m.name} availability`}
                          onClick={() => toggle(m)}
                        >
                          <span className="switch-track"><span /></span>
                          <span className="switch-text">{on ? 'Available' : 'Unavailable'}</span>
                        </button>
                      </div>
                      <div className="item-actions" role="cell">
                        {confirmDelete === m.id ? (
                          <>
                            <span className="small">Delete permanently?</span>
                            <button className="btn btn-sm btn-danger" onClick={() => { setConfirmDelete(null); run(() => deleteItem(m.id), `${m.name} deleted`); }}>Delete</button>
                            <button className="btn btn-sm btn-ghost-dark" onClick={() => setConfirmDelete(null)}>Keep</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-sm btn-outline" onClick={() => { setEditing(m); setFormOpen(true); }}>Edit</button>
                            <button className="btn btn-sm btn-ghost-dark" onClick={() => setConfirmDelete(m.id)}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}

        {isAdmin && (
        <div className="reset-row">
          {confirmReset ? (
            <>
              <span className="small">This replaces your menu with the original sample menu. Continue?</span>
              <button className="btn btn-sm btn-danger" onClick={() => { setConfirmReset(false); run(resetMenu, 'Menu reset to the sample menu'); }}>Reset menu</button>
              <button className="btn btn-sm btn-ghost-dark" onClick={() => setConfirmReset(false)}>Cancel</button>
            </>
          ) : (
            <button className="link-btn" onClick={() => setConfirmReset(true)}>Reset to sample menu</button>
          )}
        </div>
        )}
      </div>

      {formOpen && (
        <MenuItemForm
          initial={editing}
          onClose={closeForm}
          onUpload={uploadImage}
          onSave={async (draft) => {
            // Errors propagate to the form, which shows them and stays open.
            if (editing) {
              await updateItem(editing.id, toInput(draft));
              setFlash(`Saved changes to ${draft.name}`);
            } else {
              await addItem(toInput(draft));
              setFlash(`${draft.name} added to ${draft.category}${draft.available ? '' : ' (hidden until marked available)'}`);
              setCat(draft.category);
            }
            closeForm();
          }}
        />
      )}

      <div className={`toast ${flash ? 'show' : ''}`} role="status" aria-live="polite">
        <span>{flash}</span>
      </div>
    </div>
  );
}
