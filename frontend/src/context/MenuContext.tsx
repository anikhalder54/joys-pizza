import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MenuItem, MenuItemInput } from '../types';
import { isAvailable } from '../data/menu';
import { api, errorMessage } from '../lib/api';
import { useAuth } from './AuthContext';
import { isStaff } from '../lib/roles';

/**
 * Menu loaded from the API. Customers receive available items only; admins also
 * receive hidden (unavailable) items so they can manage them.
 */
interface MenuCtx {
  /** Everything the API returned (includes unavailable items for admins). */
  items: MenuItem[];
  /** Only items customers can see and order. */
  available: MenuItem[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  findItem: (id: string) => MenuItem | undefined;
  addItem: (item: MenuItemInput) => Promise<MenuItem>;
  updateItem: (id: string, item: MenuItemInput) => Promise<MenuItem>;
  setAvailable: (id: string, available: boolean) => Promise<MenuItem>;
  deleteItem: (id: string) => Promise<void>;
  resetMenu: () => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
}

const Ctx = createContext<MenuCtx | null>(null);
const REFRESH_MS = 60_000;

export function MenuProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const staff = isStaff(user);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setItems(await api.menu.list(staff));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [staff]);

  // Load on start / when switching between customer and admin, and refresh periodically
  // so items an admin hides disappear for customers without a page reload.
  useEffect(() => {
    reload();
    const t = setInterval(reload, REFRESH_MS);
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [reload]);

  const replace = (item: MenuItem) => setItems((prev) => prev.map((m) => (m.id === item.id ? item : m)));

  const value = useMemo<MenuCtx>(
    () => ({
      items,
      available: items.filter(isAvailable),
      loading,
      error,
      reload,
      findItem: (id) => items.find((m) => m.id === id),
      async addItem(input) {
        const created = await api.menu.create(input);
        setItems((prev) => [...prev, created]);
        return created;
      },
      async updateItem(id, input) {
        const updated = await api.menu.update(id, input);
        replace(updated);
        return updated;
      },
      async setAvailable(id, available) {
        // Optimistic toggle, rolled back if the API refuses.
        setItems((prev) => prev.map((m) => (m.id === id ? { ...m, available } : m)));
        try {
          const updated = await api.menu.setAvailability(id, available);
          replace(updated);
          return updated;
        } catch (e) {
          setItems((prev) => prev.map((m) => (m.id === id ? { ...m, available: !available } : m)));
          throw e;
        }
      },
      async deleteItem(id) {
        await api.menu.remove(id);
        setItems((prev) => prev.filter((m) => m.id !== id));
      },
      async resetMenu() {
        setItems(await api.menu.reset());
      },
      async uploadImage(file) {
        return (await api.menu.uploadImage(file)).url;
      },
    }),
    [items, loading, error, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMenu() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMenu must be used inside <MenuProvider>');
  return c;
}
