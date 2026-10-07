import { useState } from 'react';
import type { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { money } from '../lib/storage';
import SmartImage from './SmartImage';
import { PlusIcon } from './Icons';

/** True when the item has a photo (uploaded file or image link). */
export const hasPhoto = (item: MenuItem) => !!item.image?.trim();

/**
 * One menu item.
 * - With a photo → card (photo on top, text below).
 * - Without a photo → compact list row (no empty image box).
 */
export default function MenuCard({ item, featured = false }: { item: MenuItem; featured?: boolean }) {
  const { add } = useCart();
  // Default to the largest size.
  const [sizeIdx, setSizeIdx] = useState(item.sizes?.length ? item.sizes.length - 1 : 0);
  const size = item.sizes?.[sizeIdx];
  const price = size?.price ?? item.price;
  const photo = hasPhoto(item);

  const tags = (item.tags?.length || (!photo && item.special)) ? (
    <div className="tags">
      {!photo && item.special && <span className="tag tag-special">Chef's special</span>}
      {item.tags?.map((t) => (
        <span key={t} className={`tag tag-${t.toLowerCase().replace(/\s+/g, '-')}`}>{t}</span>
      ))}
    </div>
  ) : null;

  const actions = (
    <div className="menu-card-actions">
      {item.sizes ? (
        <div className="size-picker" role="radiogroup" aria-label={`${item.name} size`}>
          {item.sizes.map((s, i) => (
            <button
              key={s.label}
              role="radio"
              aria-checked={i === sizeIdx}
              className={i === sizeIdx ? 'active' : ''}
              onClick={() => setSizeIdx(i)}
              title={`${s.label} — ${money(s.price)}`}
            >
              {s.label.split(' ')[0].charAt(0)}
              <small>{s.label.split(' ')[1]}</small>
            </button>
          ))}
        </div>
      ) : (
        <span />
      )}
      <button className="btn btn-primary btn-sm" onClick={() => add(item, size)}>
        <PlusIcon width={16} height={16} /> Add
      </button>
    </div>
  );

  // ---------- no photo: list row ----------
  if (!photo) {
    return (
      <article className="menu-row">
        <div className="menu-row-main">
          <h3>{item.name}</h3>
          {item.description && <p>{item.description}</p>}
          {tags}
        </div>
        <div className="menu-row-side">
          <span className="price">{money(price)}</span>
          {actions}
        </div>
      </article>
    );
  }

  // ---------- with photo: card ----------
  return (
    <article className={`menu-card ${featured ? 'featured' : ''}`}>
      <div className="menu-card-img">
        <SmartImage src={item.image} alt={item.name} />
        {item.special && <span className="ribbon">Chef's special</span>}
      </div>
      <div className="menu-card-body">
        <div className="menu-card-top">
          <h3>{item.name}</h3>
          <span className="price">{money(price)}</span>
        </div>
        {item.description && <p>{item.description}</p>}
        {tags}
        {actions}
      </div>
    </article>
  );
}

/** Items with photos as a card grid, then items without photos as a list. */
export function MenuItems({ items, featured = false }: { items: MenuItem[]; featured?: boolean }) {
  const withPhoto = items.filter(hasPhoto);
  const withoutPhoto = items.filter((m) => !hasPhoto(m));
  return (
    <>
      {withPhoto.length > 0 && (
        <div className="menu-grid">
          {withPhoto.map((item) => (
            <MenuCard key={item.id} item={item} featured={featured} />
          ))}
        </div>
      )}
      {withoutPhoto.length > 0 && (
        <div className={`menu-list ${withPhoto.length > 0 ? 'after-grid' : ''}`}>
          {withoutPhoto.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
