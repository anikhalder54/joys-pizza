import { useEffect, useMemo, useState } from 'react';
import AdminTabs, { StaffOnly, useAdminGuard } from '../components/AdminTabs';
import { useAdminOrders } from '../context/OrdersContext';
import { errorMessage } from '../lib/api';
import { Link } from '../lib/router';
import { money } from '../lib/storage';
import type { Order, OrderStatus } from '../types';
import { PaymentLabel, StatusBadge, timeAgo, fmtTime } from '../components/OrderBits';
import { PhoneIcon, PinIcon, SearchIcon } from '../components/Icons';

type Tab = 'Active' | OrderStatus | 'All';
const TABS: Tab[] = ['Active', 'Received', 'Preparing', 'Ready', 'Out for delivery', 'Completed', 'Cancelled', 'All'];

const nextStep = (o: Order): { label: string; to: OrderStatus } | null => {
  switch (o.status) {
    case 'Received':
      return { label: 'Start preparing', to: 'Preparing' };
    case 'Preparing':
      return { label: 'Mark ready', to: 'Ready' };
    case 'Ready':
      return o.fulfillment === 'delivery'
        ? { label: 'Send out for delivery', to: 'Out for delivery' }
        : { label: 'Picked up', to: 'Completed' };
    case 'Out for delivery':
      return { label: 'Mark delivered', to: 'Completed' };
    default:
      return null;
  }
};

export default function AdminPage() {
  const { user, isStaff } = useAdminGuard('/admin');
  const { orders, updateStatus, error: loadError, loading } = useAdminOrders(isStaff);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const changeStatus = async (id: string, status: OrderStatus) => {
    setBusy(id);
    setActionError(null);
    try {
      await updateStatus(id, status);
      setConfirmCancel(null);
    } catch (e) {
      setActionError(`${id}: ${errorMessage(e)}`);
    } finally {
      setBusy(null);
    }
  };
  const [tab, setTab] = useState<Tab>('Active');
  const [q, setQ] = useState('');
  const [, tick] = useState(0);

  // refresh "x min ago" labels
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toDateString();
  const stats = useMemo(() => {
    const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today && o.status !== 'Cancelled');
    return {
      newCount: orders.filter((o) => o.status === 'Received').length,
      inKitchen: orders.filter((o) => o.status === 'Preparing').length,
      ready: orders.filter((o) => o.status === 'Ready' || o.status === 'Out for delivery').length,
      revenue: todays.reduce((s, o) => s + o.total, 0),
      todayCount: todays.length,
    };
  }, [orders, today]);

  if (!user) return null;
  if (!isStaff) return <StaffOnly />;

  const term = q.trim().toLowerCase();
  const list = orders
    .filter((o) => {
      if (tab === 'All') return true;
      if (tab === 'Active') return !['Completed', 'Cancelled'].includes(o.status);
      return o.status === tab;
    })
    .filter(
      (o) =>
        !term ||
        o.id.toLowerCase().includes(term) ||
        o.customerName.toLowerCase().includes(term) ||
        o.phone.includes(term),
    )
    // Active queue: oldest first (FIFO for the kitchen). Other tabs: newest first.
    .sort((a, b) => (+new Date(a.createdAt) - +new Date(b.createdAt)) * (tab === 'Active' ? 1 : -1));

  const countFor = (t: Tab) =>
    t === 'All'
      ? orders.length
      : t === 'Active'
        ? orders.filter((o) => !['Completed', 'Cancelled'].includes(o.status)).length
        : orders.filter((o) => o.status === t).length;

  return (
    <div className="page admin">
      <div className="container">
        <AdminTabs newOrders={stats.newCount} />
        <div className="page-title-row">
          <div>
            <span className="eyebrow">Kitchen dashboard</span>
            <h1>Orders</h1>
          </div>
          <span className="live"><span className="pulse" /> Live · updates across tabs</span>
        </div>

        <div className="stat-row">
          <div className="stat"><span>New orders</span><strong>{stats.newCount}</strong></div>
          <div className="stat"><span>In the kitchen</span><strong>{stats.inKitchen}</strong></div>
          <div className="stat"><span>Ready / on the road</span><strong>{stats.ready}</strong></div>
          <div className="stat"><span>Today's sales ({stats.todayCount})</span><strong>{money(stats.revenue)}</strong></div>
        </div>

        <div className="admin-toolbar">
          <div className="chips">
            {TABS.map((t) => (
              <button key={t} className={`chip ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t} <span className="chip-count">{countFor(t)}</span>
              </button>
            ))}
          </div>
          <label className="search">
            <SearchIcon width={16} height={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order #, name or phone" />
          </label>
        </div>

        {loadError && <p className="alert alert-error">Couldn't refresh orders: {loadError}</p>}
        {actionError && <p className="alert alert-error">{actionError}</p>}

        {list.length === 0 ? (
          <div className="panel center-page"><p className="muted">{loading ? 'Loading orders…' : 'No orders here right now.'}</p></div>
        ) : (
          <div className="ticket-grid">
            {list.map((o) => {
              const step = nextStep(o);
              const urgent = o.status === 'Received' && Date.now() - +new Date(o.createdAt) > 10 * 60_000;
              return (
                <article key={o.id} className={`ticket ${urgent ? 'urgent' : ''} ticket-${o.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  <header>
                    <div>
                      <strong className="mono">{o.id}</strong>
                      <small title={fmtTime(o.createdAt)}>{timeAgo(o.createdAt)}</small>
                    </div>
                    <div className="ticket-tags">
                      <span className={`pill ${o.fulfillment === 'delivery' ? 'pill-red' : 'pill-dark'}`}>
                        {o.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                  </header>

                  <ul className="ticket-items">
                    {o.items.map((l) => (
                      <li key={l.key}>
                        <span className="qty-badge">{l.qty}</span>
                        <span>{l.name}{l.size && <small> — {l.size}</small>}</span>
                      </li>
                    ))}
                  </ul>
                  {o.notes && <p className="ticket-note">“{o.notes}”</p>}

                  <div className="ticket-customer">
                    <strong>{o.customerName}</strong>
                    <span><PhoneIcon width={13} height={13} /> {o.phone}</span>
                    {o.address && <span><PinIcon width={13} height={13} /> {o.address}</span>}
                  </div>

                  <footer>
                    <div>
                      <strong>{money(o.total)}</strong>
                      <PaymentLabel payment={o.payment} />
                    </div>
                    <div className="ticket-actions">
                      {step && (
                        <button className="btn btn-primary btn-sm" disabled={busy === o.id} onClick={() => changeStatus(o.id, step.to)}>
                          {step.label}
                        </button>
                      )}
                      {!['Completed', 'Cancelled'].includes(o.status) &&
                        (confirmCancel === o.id ? (
                          <>
                            <button className="btn btn-danger btn-sm" disabled={busy === o.id} onClick={() => changeStatus(o.id, 'Cancelled')}>
                              Cancel &amp; refund
                            </button>
                            <button className="btn btn-ghost-dark btn-sm" onClick={() => setConfirmCancel(null)}>Keep</button>
                          </>
                        ) : (
                          <button className="btn btn-ghost-dark btn-sm" onClick={() => setConfirmCancel(o.id)}>
                            Cancel
                          </button>
                        ))}
                      <Link to={`/order/${o.id}`} className="btn btn-outline btn-sm">Details</Link>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
