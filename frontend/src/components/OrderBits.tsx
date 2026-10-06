import type { Order, OrderStatus } from '../types';
import { money } from '../lib/storage';
import { AppleIcon, CardIcon, CheckIcon } from './Icons';

export const STATUS_FLOW: OrderStatus[] = ['Received', 'Preparing', 'Ready', 'Out for delivery', 'Completed'];

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status status-${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span>;
}

export function StatusTracker({ order }: { order: Order }) {
  if (order.status === 'Cancelled')
    return <p className="alert alert-error">This order was cancelled{order.refunded ? ' and refunded' : ''}.</p>;
  if (order.status === 'Awaiting payment')
    return <p className="alert alert-info">We're waiting for the payment to be confirmed…</p>;
  const steps = order.fulfillment === 'pickup' ? STATUS_FLOW.filter((s) => s !== 'Out for delivery') : STATUS_FLOW;
  const at = steps.indexOf(order.status);
  return (
    <ol className="tracker">
      {steps.map((s, i) => (
        <li key={s} className={i < at ? 'done' : i === at ? 'current' : ''}>
          <span className="dot">{i < at ? <CheckIcon width={12} height={12} /> : null}</span>
          <span className="label">{s === 'Ready' && order.fulfillment === 'pickup' ? 'Ready for pickup' : s}</span>
        </li>
      ))}
    </ol>
  );
}

export function PaymentLabel({ payment }: { payment: Order['payment'] }) {
  if (!payment) return <span className="pay-label muted">Awaiting payment</span>;
  if (payment.method === 'apple_pay' || payment.method === 'google_pay')
    return (
      <span className="pay-label">
        {payment.method === 'apple_pay' ? <AppleIcon width={14} height={14} /> : <CardIcon width={14} height={14} />}
        {payment.method === 'apple_pay' ? 'Apple Pay' : 'Google Pay'}
        {payment.last4 && <span className="muted"> ••{payment.last4}</span>}
      </span>
    );
  const kind = payment.method === 'debit' ? 'debit' : payment.method === 'credit' ? 'credit' : '';
  return (
    <span className="pay-label">
      <CardIcon width={14} height={14} /> {payment.brand ?? 'Card'} {kind} {payment.last4 && `••${payment.last4}`}
    </span>
  );
}

/** Price shown for an order line — free deal items show "FREE". */
export const linePrice = (l: { unitPrice: number; qty: number }) => (l.unitPrice === 0 ? 'FREE' : money(l.unitPrice * l.qty));

export function OrderTotals({ order }: { order: Order }) {
  return (
    <dl className="totals">
      <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
      {order.fulfillment === 'delivery' && (
        <div><dt>Delivery</dt><dd>{order.deliveryFee === 0 ? 'Free' : money(order.deliveryFee)}</dd></div>
      )}
      <div><dt>Tip</dt><dd>{money(order.tip)}</dd></div>
      <div className="grand"><dt>Total</dt><dd>{money(order.total)}</dd></div>
    </dl>
  );
}

export const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hr ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
