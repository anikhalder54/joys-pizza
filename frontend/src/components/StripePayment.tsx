import { useMemo, useState, type FormEvent } from 'react';
import { loadStripe, type Appearance, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { errorMessage } from '../lib/api';
import { LockIcon } from './Icons';

/**
 * Stripe Payment Element: card (credit/debit), Apple Pay and Google Pay in one secure
 * iframe. Apple Pay shows in Safari on Apple devices once your domain is registered
 * in the Stripe Dashboard (Settings → Payment method domains).
 */

const stripeCache = new Map<string, Promise<Stripe | null>>();
const getStripe = (key: string) => {
  if (!stripeCache.has(key)) stripeCache.set(key, loadStripe(key));
  return stripeCache.get(key)!;
};

const appearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#d6452f',
    colorText: '#1f1a17',
    colorDanger: '#b3341f',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '10px',
  },
};

interface Props {
  clientSecret: string;
  publishableKey: string;
  amountLabel: string;
  /** Where Stripe sends the customer back after a redirect-based method. */
  returnUrl: string;
  /** Called after Stripe confirms the payment in the browser. */
  onPaid: () => Promise<void>;
}

export default function StripePayment({ clientSecret, publishableKey, ...rest }: Props) {
  const stripePromise = useMemo(() => getStripe(publishableKey), [publishableKey]);
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
      <PayForm {...rest} />
    </Elements>
  );
}

function PayForm({ amountLabel, returnUrl, onPaid }: Omit<Props, 'clientSecret' | 'publishableKey'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: returnUrl },
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Your payment could not be processed.');
      setBusy(false);
      return;
    }

    try {
      await onPaid();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="stripe-form">
      <PaymentElement options={{ layout: 'tabs' }} onReady={() => setReady(true)} />
      {!ready && <p className="muted small">Loading secure payment form…</p>}
      {error && <p className="alert alert-error">{error}</p>}
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={!stripe || !ready || busy}>
        {busy ? 'Processing payment…' : `Pay ${amountLabel}`}
      </button>
      <p className="secure"><LockIcon width={14} height={14} /> Secured by Stripe · Card, Apple Pay & Google Pay</p>
    </form>
  );
}
