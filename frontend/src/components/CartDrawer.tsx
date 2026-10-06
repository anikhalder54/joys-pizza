import { useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { navigate } from '../lib/router';
import { money } from '../lib/storage';
import { RESTAURANT } from '../data/restaurant';
import { useMenu } from '../context/MenuContext';
import { isAvailable } from '../data/menu';
import { PROMO, applyPromo, isSize } from '../lib/promo';
import { CloseIcon, MinusIcon, PlusIcon, TrashIcon, CartIcon } from './Icons';
import SmartImage from './SmartImage';

export default function CartDrawer() {
  const cart = useCart();
  const { findItem } = useMenu();
  const unavailable = (itemId: string) => {
    const m = findItem(itemId);
    return !m || !isAvailable(m);
  };

  useEffect(() => {
    if (!cart.isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cart.close();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [cart.isOpen, cart]);

  // Buy 2 Large Cheese Pizzas, Get 1 Medium FREE (preview — the API applies the same rule).
  const promo = applyPromo(cart.lines);
  const total = +(cart.subtotal - promo.discount).toFixed(2);
  const cheese = findItem(PROMO.itemId);
  const freeSize = cheese?.sizes?.find((s) => isSize(s.label, 'Medium'));
  const toFree = RESTAURANT.freeDeliveryOver - total;

  return (
    <>
      <div className={`scrim ${cart.isOpen ? 'show' : ''}`} onClick={cart.close} />
      <aside className={`drawer ${cart.isOpen ? 'open' : ''}`} aria-hidden={!cart.isOpen} aria-label="Your cart">
        <div className="drawer-head">
          <h2>Your order</h2>
          <button className="icon-btn" onClick={cart.close} aria-label="Close cart">
            <CloseIcon />
          </button>
        </div>

        {cart.lines.length === 0 ? (
          <div className="empty">
            <CartIcon width={44} height={44} />
            <p>Your cart is empty.</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                cart.close();
                navigate('/menu');
              }}
            >
              Browse the menu
            </button>
          </div>
        ) : (
          <>
            {toFree > 0 ? (
              <div className="free-bar">
                Add <strong>{money(toFree)}</strong> more for free delivery
                <span style={{ width: `${Math.min(100, (total / RESTAURANT.freeDeliveryOver) * 100)}%` }} />
              </div>
            ) : (
              <div className="free-bar done">You've unlocked free delivery!</div>
            )}

            {promo.unclaimed > 0 && cheese && freeSize && isAvailable(cheese) && (
              <div className="free-bar done promo-bar">
                <span>
                  You've earned <strong>{promo.unclaimed} FREE Medium Cheese Pizza{promo.unclaimed > 1 ? 's' : ''}</strong>!
                </span>
                <button className="btn btn-primary btn-sm" onClick={() => cart.add(cheese, freeSize, promo.unclaimed)}>
                  Add free pizza
                </button>
              </div>
            )}
            {promo.largesToNext > 0 && (
              <div className="free-bar promo-bar">
                Add {promo.largesToNext} more <strong>Large Cheese Pizza</strong> to get a <strong>Medium FREE</strong>
              </div>
            )}

            <ul className="cart-lines">
              {cart.lines.map((l) => (
                <li key={l.key} className={unavailable(l.itemId) ? 'is-sold-out' : ''}>
                  <SmartImage src={l.image} alt={l.name} />
                  <div className="cart-line-info">
                    <strong>{l.name}</strong>
                    {l.size && <small>{l.size}</small>}
                    {unavailable(l.itemId) ? (
                      <span className="sold-out-text">No longer available</span>
                    ) : (
                      <span className="muted">{money(l.unitPrice)} each</span>
                    )}
                  </div>
                  <div className="cart-line-side">
                    <div className="qty">
                      <button onClick={() => cart.setQty(l.key, l.qty - 1)} aria-label="Decrease">
                        {l.qty === 1 ? <TrashIcon width={14} height={14} /> : <MinusIcon width={14} height={14} />}
                      </button>
                      <span>{l.qty}</span>
                      <button onClick={() => cart.setQty(l.key, l.qty + 1)} aria-label="Increase">
                        <PlusIcon width={14} height={14} />
                      </button>
                    </div>
                    <strong>{money(l.unitPrice * l.qty)}</strong>
                  </div>
                </li>
              ))}
            </ul>

            <div className="drawer-foot">
              {promo.discount > 0 && (
                <div className="row between promo-line">
                  <span>{PROMO.title}</span>
                  <strong>−{money(promo.discount)}</strong>
                </div>
              )}
              <div className="row between">
                <span>Subtotal</span>
                <strong>{money(total)}</strong>
              </div>
              <small className="muted">Delivery & tip calculated at checkout.</small>
              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={() => {
                  cart.close();
                  navigate('/checkout');
                }}
              >
                Checkout · {money(total)}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
