/**
 * Small browser-storage helpers. The cart and the sign-in token live here;
 * everything else (menu, users, orders) comes from the ASP.NET Core API.
 */

const KEYS = {
  cart: 'jp_cart',
  token: 'jp_token',
} as const;

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — keep in memory only */
  }
}

export const db = {
  getCart: <T,>(fallback: T) => read<T>(KEYS.cart, fallback),
  saveCart: <T,>(c: T) => write(KEYS.cart, c),
  getToken: () => read<string | null>(KEYS.token, null),
  setToken: (t: string | null) => write(KEYS.token, t),
  KEYS,
};

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
