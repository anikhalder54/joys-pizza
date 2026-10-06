import { useCallback, useEffect, useRef, useState } from 'react';
import type { Order, OrderStatus } from '../types';
import { api, errorMessage } from '../lib/api';

/**
 * Data hooks for orders. Each polls the API so status changes made in the kitchen
 * show up for customers (and new orders show up for the kitchen) automatically.
 */
function usePolling<T>(load: (() => Promise<T>) | null, intervalMs: number, key = '') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!load);
  const loadRef = useRef(load);
  loadRef.current = load;

  const refresh = useCallback(async () => {
    const fn = loadRef.current;
    if (!fn) return;
    try {
      setData(await fn());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const enabled = !!load;
  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    refresh();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, intervalMs);
    return () => clearInterval(t);
  }, [enabled, intervalMs, refresh, key]);

  return { data, setData, error, loading, refresh };
}

/** Signed-in customer's orders. */
export function useMyOrders(enabled: boolean) {
  const { data, error, loading, refresh } = usePolling(enabled ? api.orders.mine : null, 20_000);
  return { orders: data ?? [], error, loading, refresh };
}

/** One order (customer's own, or any order for admins). Polls while the order is in progress. */
export function useOrder(id: string, enabled: boolean) {
  const load = useCallback(() => api.orders.get(id), [id]);
  const { data, setData, error, loading } = usePolling(enabled ? load : null, 15_000, id);
  return { order: data, setOrder: setData, error, loading };
}

/** Kitchen dashboard feed. */
export function useAdminOrders(enabled: boolean) {
  const { data, setData, error, loading, refresh } = usePolling(enabled ? () => api.admin.orders(3) : null, 10_000);

  const updateStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const updated = await api.admin.setStatus(id, status);
      setData((prev: Order[] | null) => (prev ?? []).map((o) => (o.id === id ? updated : o)));
      return updated;
    },
    [setData],
  );

  return { orders: data ?? [], error, loading, refresh, updateStatus };
}
