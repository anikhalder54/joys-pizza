import { useMemo, useState } from 'react';
import { MenuItems } from '../components/MenuCard';
import { CATEGORIES } from '../data/menu';
import { useMenu } from '../context/MenuContext';
import type { Category } from '../types';
import { navigate, useRoute } from '../lib/router';
import { SearchIcon } from '../components/Icons';

type Filter = 'All' | Category;

export default function MenuPage() {
  const { query } = useRoute();
  const fromUrl = query.get('cat') as Category | null;
  const cat: Filter = fromUrl && CATEGORIES.includes(fromUrl) ? fromUrl : 'All';
  const [q, setQ] = useState('');
  const { available, loading, error, reload } = useMenu();

  const pick = (c: Filter) => navigate(c === 'All' ? '/menu' : `/menu?cat=${c}`);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return available.filter(
      (m) =>
        (cat === 'All' || m.category === cat) &&
        (!term || m.name.toLowerCase().includes(term) || m.description.toLowerCase().includes(term)),
    );
  }, [cat, q, available]);

  const groups = (cat === 'All' ? CATEGORIES : [cat]).map((c) => ({
    c,
    items: filtered.filter((m) => m.category === c),
  }));

  return (
    <div className="page">
      <div className="page-hero">
        <div className="container">
          <span className="eyebrow">Order online</span>
          <h1>Our Menu</h1>
          <p>Pizza is our thing — but save room for pasta, burgers, and dessert.</p>
        </div>
      </div>

      <div className="menu-toolbar">
        <div className="container toolbar-inner">
          <div className="chips" role="tablist">
            {(['All', ...CATEGORIES] as Filter[]).map((c) => (
              <button key={c} role="tab" aria-selected={cat === c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => pick(c)}>
                {c}
              </button>
            ))}
          </div>
          <label className="search">
            <SearchIcon width={16} height={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the menu" aria-label="Search the menu" />
          </label>
        </div>
      </div>

      <div className="container">
        {error && available.length === 0 && (
          <div className="panel center-page load-error">
            <h3>We couldn't load the menu</h3>
            <p className="muted">{error}</p>
            <button className="btn btn-primary" onClick={reload}>Try again</button>
          </div>
        )}
        {loading && available.length === 0 && <p className="empty-note">Loading the menu…</p>}
        {!loading && !error && filtered.length === 0 && <p className="empty-note">{q ? `No dishes match “${q}”.` : 'Nothing here right now — check back soon.'}</p>}
        {groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.c} className="menu-section" id={`cat-${g.c}`}>
              <h2>{g.c}</h2>
              <MenuItems items={g.items} />
            </section>
          ))}
      </div>
    </div>
  );
}
