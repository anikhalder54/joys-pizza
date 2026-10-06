import { useEffect, useState, type FormEvent } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useMenu } from '../context/MenuContext';
import { isAvailable } from '../data/menu';
import { Link, navigate } from '../lib/router';
import { money } from '../lib/storage';
import { api, ApiError, errorMessage } from '../lib/api';
import { RESTAURANT, fullAddress } from '../data/restaurant';
import type { CreateOrderResponse, FulfillmentType } from '../types';
import { LockIcon } from '../components/Icons';
import SmartImage from '../components/SmartImage';
import StripePayment from '../components/StripePayment';
import { OrderTotals, linePrice } from '../components/OrderBits';
import { PROMO, applyPromo } from '../lib/promo';

const digits = (s: string) => s.replace(/\D/g, '');
const fmtPhone = (v: string) => {
  const d = digits(v).slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

const TIP_OPTIONS = [0.15, 0.18, 0.2, 0];

export default function CheckoutPage() {
  const cart = useCart();
  const { user, checking } = useAuth();
  const { findItem, reload: reloadMenu } = useMenu();

  // ---- step 1: details ----
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery');
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [street, setStreet] = useState('');
  const [apt, setApt] = useState('');
  const [city, setCity] = useState('New York');
  const [stateCode, setStateCode] = useState('NY');
  const [zip, setZip] = useState('');
  const [notes, setNotes] = useState('');
  const [tipPct, setTipPct] = useState(0.18);
  const [submitted, setSubmitted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ---- step 2: payment ----
  const [session, setSession] = useState<CreateOrderResponse | null>(null);
  const [demoPaying, setDemoPaying] = useState(false);

  useEffect(() => {
    if (!user && !checking) navigate('/login?next=/checkout');
  }, [user, checking]);

  // Prefill once the signed-in user is known.
  useEffect(() => {
    if (!user) return;
    setName((v) => v || user.name);
    setEmail((v) => v || user.email);
    setPhone((v) => v || (user.phone ? fmtPhone(user.phone) : ''));
  }, [user]);

  if (!user) return null;

  if (cart.lines.length === 0 && !session) {
    return (
      <div className="page container narrow center-page">
        <h1>Your cart is empty</h1>
        <p className="muted">Add something delicious before checking out.</p>
        <Link to="/menu" className="btn btn-primary">Browse the menu</Link>
      </div>
    );
  }

  // Items an admin marked unavailable after they were added to the cart.
  const soldOut = cart.lines.filter((l) => {
    const m = findItem(l.itemId);
    return !m || !isAvailable(m);
  });
  const removeSoldOut = () => soldOut.forEach((l) => cart.remove(l.key));

  // Estimate shown before the order exists; the API calculates the real totals.
  // No sales tax. Deal discount previewed here; the API applies the same rule.
  const promo = applyPromo(cart.lines);
  const subtotal = +(cart.subtotal - promo.discount).toFixed(2);
  const deliveryFee = fulfillment === 'pickup' || subtotal >= RESTAURANT.freeDeliveryOver ? 0 : RESTAURANT.deliveryFee;
  const tip = +(subtotal * tipPct).toFixed(2);
  const total = +(subtotal + deliveryFee + tip).toFixed(2);

  const computeErrors = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email';
    if (digits(phone).length !== 10) e.phone = 'Enter a 10-digit US phone number';
    if (fulfillment === 'delivery') {
      if (!street.trim()) e.street = 'Enter a street address';
      if (!city.trim()) e.city = 'Required';
      if (!/^[A-Za-z]{2}$/.test(stateCode)) e.state = '2-letter code';
      if (!/^\d{5}$/.test(zip)) e.zip = '5-digit ZIP';
    }
    return e;
  };
  const errors = submitted ? computeErrors() : {};
  const Err = ({ k }: { k: string }) => (errors[k] ? <span className="field-error">{errors[k]}</span> : null);
  const cls = (k: string) => (errors[k] ? 'invalid' : '');

  const continueToPayment = async (ev: FormEvent) => {
    ev.preventDefault();
    setSubmitted(true);
    setApiError(null);
    if (soldOut.length || Object.keys(computeErrors()).length) {
      setTimeout(() => document.querySelector('.field-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
      return;
    }
    setCreating(true);
    try {
      const res = await api.orders.create({
        items: cart.lines.map((l) => ({ menuItemId: l.itemId, size: l.size, quantity: l.qty })),
        fulfillment,
        customerName: name.trim(),
        email: email.trim(),
        phone,
        address:
          fulfillment === 'delivery'
            ? `${street.trim()}${apt.trim() ? `, ${apt.trim()}` : ''}, ${city.trim()}, ${stateCode.toUpperCase()} ${zip}`
            : undefined,
        notes: notes.trim() || undefined,
        tipPercent: tipPct,
      });
      setSession(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setApiError(errorMessage(e));
      if (e instanceof ApiError && e.status === 409) reloadMenu(); // an item went unavailable
    } finally {
      setCreating(false);
    }
  };

  /** After the browser-side payment succeeds: let the API verify it, then show the order. */
  const finish = async (orderId: string) => {
    try {
      await api.orders.confirmPayment(orderId);
    } catch (e) {
      // 402 = the provider hasn't reported success yet (e.g. still processing); the order page keeps checking.
      if (!(e instanceof ApiError && e.status === 402)) throw e;
    }
    cart.clear();
    navigate(`/order/${orderId}?placed=1`);
  };

  // =================== Step 2: pay ===================
  if (session) {
    const { order, payment } = session;
    const returnUrl = `${window.location.origin}${window.location.pathname}#/order/${order.id}?placed=1`;
    return (
      <div className="page container checkout">
        <div className="checkout-steps">
          <span className="done">1. Details</span>
          <span className="active">2. Payment</span>
        </div>
        <h1>Payment</h1>
        <div className="checkout-grid">
          <div className="checkout-main">
            <section className="panel">
              <div className="row between">
                <h3>Pay for order <span className="mono">{order.id}</span></h3>
                <button type="button" className="btn btn-ghost-dark btn-sm" onClick={() => setSession(null)}>← Edit details</button>
              </div>

              {payment.mode === 'stripe' && payment.clientSecret && payment.publishableKey ? (
                <StripePayment
                  clientSecret={payment.clientSecret}
                  publishableKey={payment.publishableKey}
                  amountLabel={money(order.total)}
                  returnUrl={returnUrl}
                  onPaid={() => finish(order.id)}
                />
              ) : (
                <div className="demo-pay">
                  <p className="alert alert-info">
                    <strong>Demo payment mode.</strong> The API has no Stripe keys configured, so no real charge is made.
                    Add your Stripe test keys to the API to take card, Apple Pay and Google Pay payments.
                  </p>
                  {apiError && <p className="alert alert-error">{apiError}</p>}
                  <button
                    type="button"
                    className="btn btn-primary btn-block btn-lg"
                    disabled={demoPaying}
                    onClick={async () => {
                      setDemoPaying(true);
                      setApiError(null);
                      try {
                        await finish(order.id);
                      } catch (e) {
                        setApiError(errorMessage(e));
                        setDemoPaying(false);
                      }
                    }}
                  >
                    {demoPaying ? 'Processing…' : `Pay ${money(order.total)} (demo)`}
                  </button>
                </div>
              )}
            </section>
          </div>

          <aside className="checkout-summary panel">
            <h3>Order summary</h3>
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
            <p className="muted small">
              {order.fulfillment === 'delivery' ? `Delivering to ${order.address}` : `Pickup at ${fullAddress()}`}
            </p>
          </aside>
        </div>
      </div>
    );
  }

  // =================== Step 1: details ===================
  return (
    <div className="page container checkout">
      <div className="checkout-steps">
        <span className="active">1. Details</span>
        <span>2. Payment</span>
      </div>
      <h1>Checkout</h1>
      <form className="checkout-grid" onSubmit={continueToPayment} noValidate>
        <div className="checkout-main">
          <section className="panel">
            <h3>1. How would you like it?</h3>
            <div className="seg">
              {(['delivery', 'pickup'] as FulfillmentType[]).map((f) => (
                <button type="button" key={f} className={fulfillment === f ? 'active' : ''} onClick={() => setFulfillment(f)}>
                  <strong>{f === 'delivery' ? 'Delivery' : 'Pickup'}</strong>
                  <small>{f === 'delivery' ? '30–45 min' : 'Ready in ~20 min'}</small>
                </button>
              ))}
            </div>
            {fulfillment === 'pickup' && <p className="muted small">Pick up at {fullAddress()}</p>}
          </section>

          <section className="panel">
            <h3>2. Contact details</h3>
            <div className="form-grid">
              <label className="span-2">Full name<input className={cls('name')} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /><Err k="name" /></label>
              <label>Email<input className={cls('email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /><Err k="email" /></label>
              <label>Phone<input className={cls('phone')} value={phone} onChange={(e) => setPhone(fmtPhone(e.target.value))} placeholder="(555) 555-5555" autoComplete="tel" inputMode="tel" /><Err k="phone" /></label>
            </div>
          </section>

          {fulfillment === 'delivery' && (
            <section className="panel">
              <h3>3. Delivery address</h3>
              <div className="form-grid">
                <label className="span-2">Street address<input className={cls('street')} value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="address-line1" /><Err k="street" /></label>
                <label className="span-2">Apt, suite, floor (optional)<input value={apt} onChange={(e) => setApt(e.target.value)} autoComplete="address-line2" /></label>
                <label>City<input className={cls('city')} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" /><Err k="city" /></label>
                <div className="form-grid tight">
                  <label>State<input className={cls('state')} value={stateCode} maxLength={2} onChange={(e) => setStateCode(e.target.value.toUpperCase())} autoComplete="address-level1" /><Err k="state" /></label>
                  <label>ZIP<input className={cls('zip')} value={zip} inputMode="numeric" onChange={(e) => setZip(digits(e.target.value).slice(0, 5))} autoComplete="postal-code" /><Err k="zip" /></label>
                </div>
                <label className="span-2">Delivery instructions (optional)<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, leave at door, etc." /></label>
              </div>
            </section>
          )}

          <section className="panel pay-preview">
            <h3>{fulfillment === 'delivery' ? '4' : '3'}. Payment</h3>
            <p className="muted">
              Next you'll pay securely with a <strong>credit or debit card</strong>, <strong>Apple Pay</strong> or{' '}
              <strong>Google Pay</strong>. Card details are handled by Stripe and never touch our servers.
            </p>
          </section>
        </div>

        <aside className="checkout-summary panel">
          <h3>Order summary</h3>
          {soldOut.length > 0 && (
            <div className="alert alert-error sold-out-alert">
              <span>
                Sorry — <strong>{soldOut.map((l) => l.name).join(', ')}</strong>{' '}
                {soldOut.length === 1 ? 'is' : 'are'} no longer available.
              </span>
              <button type="button" className="btn btn-sm btn-outline" onClick={removeSoldOut}>
                Remove {soldOut.length === 1 ? 'it' : 'them'}
              </button>
            </div>
          )}
          <ul className="summary-lines">
            {cart.lines.map((l) => (
              <li key={l.key} className={soldOut.includes(l) ? 'is-sold-out' : ''}>
                <SmartImage src={l.image} alt={l.name} />
                <div>
                  <strong>{l.qty} × {l.name}</strong>
                  {l.size && <small>{l.size}</small>}
                  {soldOut.includes(l) && <small className="sold-out-text">Unavailable</small>}
                </div>
                <span>{money(l.unitPrice * l.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="tip-row">
            <span>Tip for the team</span>
            <div className="tip-opts">
              {TIP_OPTIONS.map((t) => (
                <button type="button" key={t} className={tipPct === t ? 'active' : ''} onClick={() => setTipPct(t)}>
                  {t === 0 ? 'None' : `${Math.round(t * 100)}%`}
                </button>
              ))}
            </div>
          </div>

          <dl className="totals">
            {promo.discount > 0 && (
              <div className="promo-line"><dt>{PROMO.title}</dt><dd>−{money(promo.discount)}</dd></div>
            )}
            <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
            {fulfillment === 'delivery' && <div><dt>Delivery fee</dt><dd>{deliveryFee === 0 ? 'Free' : money(deliveryFee)}</dd></div>}
            <div><dt>Tip</dt><dd>{money(tip)}</dd></div>
            <div className="grand"><dt>Total</dt><dd>{money(total)}</dd></div>
          </dl>

          {apiError && <p className="alert alert-error">{apiError}</p>}
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={creating || soldOut.length > 0}>
            {creating ? 'Creating order…' : 'Continue to payment'}
          </button>
          <p className="secure"><LockIcon width={14} height={14} /> Prices are confirmed by the restaurant before payment</p>
        </aside>
      </form>
    </div>
  );
}
