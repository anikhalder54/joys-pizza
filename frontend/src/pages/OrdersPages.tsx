import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMyOrders, useOrder } from '../context/OrdersContext';
import { isStaff } from '../lib/roles';
import { useCart } from '../context/CartContext';
import { Link, navigate, useRoute } from '../lib/router';
import { money } from '../lib/storage';
import { useMenu } from '../context/MenuContext';
import { isAvailable } from '../data/menu';
import { RESTAURANT, fullAddress } from '../data/restaurant';
import SmartImage from '../components/SmartImage';
import { CheckIcon } from '../components/Icons';
import { OrderTotals, PaymentLabel, linePrice, StatusBadge, StatusTracker, fmtTime } from '../components/OrderBits';

function useRequireUser(next: string) {
  const { user, checking } = useAuth();
  useEffect(() => {
    if (!user && !checking) navigate(`/login?next=${next}`);
  }, [user, checking, next]);
  return user;
}

export function MyOrdersPage() {
  const user = useRequireUser('/orders');
  const { orders: mine, loading, error } = useMyOrders(!!user);
  const cart = useCart();
  const { findItem } = useMenu();
  if (!user) return null;

  const active = mine.filter((o) => !['Completed', 'Cancelled'].includes(o.status));
  const past = mine.filter((o) => ['Completed', 'Cancelled'].includes(o.status));

  const reorder = (id: string) => {
    const o = mine.find((x) => x.id === id);
    if (!o) return;
    o.items.forEach((l) => {
      const m = findItem(l.itemId);
      if (!m || !isAvailable(m)) return; // skip items no longer on the menu
      const size = m.sizes?.find((s) => s.label === l.size);
      cart.add(m, size, l.qty);
    });
    cart.open();
  };

  return (
    <div className="page container">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Hi, {user.name.split(' ')[0]}</span>
          <h1>My Orders</h1>
        </div>
        <Link to="/menu" className="btn btn-primary">New order</Link>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {loading && mine.length === 0 && <div className="panel center-page"><p className="muted">Loading your orders…</p></div>}

      {!loading && !error && mine.length === 0 && (
        <div className="panel center-page">
          <h3>No orders yet</h3>
          <p className="muted">When you place an order it will show up here so you can track it.</p>
          <Link to="/menu" className="btn btn-primary">Browse the menu</Link>
        </div>
      )}

      {active.length > 0 && (
        <>
          <h2 className="list-head">In progress</h2>
          <div className="order-list">
            {active.map((o) => (
              <div key={o.id} className="panel order-row">
                <div className="order-row-head">
                  <div>
                    <strong>{o.id}</strong>
                    <small className="muted"> · {fmtTime(o.createdAt)} · {o.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}</small>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <StatusTracker order={o} />
                <div className="order-row-foot">
                  <span className="muted">{o.items.reduce((s, l) => s + l.qty, 0)} items · {money(o.total)}</span>
                  <Link to={`/order/${o.id}`} className="btn btn-outline btn-sm">View details</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="list-head">Past orders</h2>
          <div className="order-list">
            {past.map((o) => (
              <div key={o.id} className="panel order-row compact">
                <div className="order-row-head">
                  <div>
                    <strong>{o.items.map((l) => `${l.qty}× ${l.name}`).join(', ')}</strong>
                    <small className="muted block">{o.id} · {fmtTime(o.createdAt)} · {money(o.total)}</small>
                  </div>
                  <div className="row gap">
                    <StatusBadge status={o.status} />
                    <Link to={`/order/${o.id}`} className="btn btn-ghost-dark btn-sm">Details</Link>
                    <button className="btn btn-outline btn-sm" onClick={() => reorder(o.id)}>Reorder</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function OrderDetailPage({ id }: { id: string }) {
  const user = useRequireUser(`/order/${id}`);
  const { order, loading, error } = useOrder(id, !!user);
  const { query } = useRoute();
  const cart = useCart();
  const justPlaced = query.get('placed') === '1';
  const paid = !!order && order.status !== 'Awaiting payment';

  // Returning from a redirect-based payment (e.g. some wallets): empty the cart once paid.
  useEffect(() => {
    if (justPlaced && paid) cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justPlaced, paid]);

  if (!user) return null;

  if (!order) {
    return (
      <div className="page container narrow center-page">
        {loading ? (
          <p className="muted">Loading order…</p>
        ) : (
          <>
            <h1>Order not found</h1>
            {error && <p className="muted">{error}</p>}
            <Link to="/orders" className="btn btn-primary">Back to my orders</Link>
          </>
        )}
      </div>
    );
  }

  const placed = justPlaced && paid;

  return (
    <div className="page container narrow">
      {placed && (
        <div className="success-banner">
          <span className="success-icon"><CheckIcon width={28} height={28} /></span>
          <div>
            <h1>Thank you, {order.customerName.split(' ')[0]}!</h1>
            <p>Your order has been received and sent to the kitchen. A confirmation was sent to {order.email}.</p>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="order-row-head">
          <div>
            <span className="eyebrow">Order</span>
            <h2 className="mono">{order.id}</h2>
            <small className="muted">Placed {fmtTime(order.createdAt)}</small>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <StatusTracker order={order} />
        <p className="muted small">
          {order.fulfillment === 'delivery'
            ? 'Estimated delivery: 30–45 minutes.'
            : `Pickup at ${fullAddress()} — about 20 minutes.`}{' '}
          Questions? Call {RESTAURANT.phone}.
        </p>
      </div>

      <div className="detail-grid">
        <div className="panel">
          <h3>Items</h3>
          <ul className="summary-lines">
            {order.items.map((l) => (
              <li key={l.key}>
                <SmartImage src={l.image} alt={l.name} />
                <div>
                  <strong>{l.qty} × {l.name}</strong>
                  {l.size && <small>{l.size}</small>}
                </div>
                <span>{linePrice(l)}</span>
              </li>
            ))}
          </ul>
          <OrderTotals order={order} />
        </div>
        <div className="panel">
          <h3>{order.fulfillment === 'delivery' ? 'Delivering to' : 'Pickup'}</h3>
          <p>{order.customerName}<br />{order.phone}<br />{order.address ?? fullAddress()}</p>
          {order.notes && <p className="muted small">Note: {order.notes}</p>}
          <h3>Payment</h3>
          <p><PaymentLabel payment={order.payment} /></p>
          {order.refunded && <p className="alert alert-info">This order was refunded to your original payment method.</p>}
        </div>
      </div>

      <div className="row gap">
        <Link to={isStaff(user) ? '/admin' : '/orders'} className="btn btn-outline">
          ← {isStaff(user) ? 'Back to dashboard' : 'All my orders'}
        </Link>
        <Link to="/menu" className="btn btn-primary">Order more</Link>
      </div>
    </div>
  );
}
