import { useState } from 'react';
import type { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { money } from '../lib/storage';
import SmartImage from './SmartImage';
import { PlusIcon } from './Icons';

export default function MenuCard({ item, featured = false }: { item: MenuItem; featured?: boolean }) {
  const { add } = useCart();
  // Default to the largest size.
  const [sizeIdx, setSizeIdx] = useState(item.sizes?.length ? item.sizes.length - 1 : 0);
  const size = item.sizes?.[sizeIdx];
  const price = size?.price ?? item.price;

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
        <p>{item.description}</p>
        {item.tags && (
          <div className="tags">
            {item.tags.map((t) => (
              <span key={t} className={`tag tag-${t.toLowerCase().replace(/\s+/g, '-')}`}>{t}</span>
            ))}
          </div>
        )}
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
      </div>
    </article>
  );
}
