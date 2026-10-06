import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthResponse, PublicUser } from '../types';
import { api, errorMessage, setUnauthorizedHandler } from '../lib/api';
import { db, read, write } from '../lib/storage';

type Result = { ok: true; user: PublicUser } | { ok: false; error: string };

interface AuthCtx {
  user: PublicUser | null;
  /** True while the stored token is being checked on first load. */
  checking: boolean;
  login: (email: string, password: string) => Promise<Result>;
  signup: (data: { name: string; email: string; phone?: string; password: string }) => Promise<Result>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const USER_KEY = 'jp_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Show the cached user immediately, then confirm the token with the API.
  const [user, setUser] = useState<PublicUser | null>(() => (db.getToken() ? read<PublicUser | null>(USER_KEY, null) : null));
  const [checking, setChecking] = useState(() => !!db.getToken());

  const clear = () => {
    db.setToken(null);
    write(USER_KEY, null);
    setUser(null);
  };

  useEffect(() => {
    setUnauthorizedHandler(clear);
    if (!db.getToken()) return;
    api.auth
      .me()
      .then((u) => {
        setUser(u);
        write(USER_KEY, u);
      })
      .catch((e) => {
        // Only sign out if the token was rejected — not when the API is just unreachable.
        if (e?.status === 401) clear();
      })
      .finally(() => setChecking(false));
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AuthCtx>(() => {
    const accept = (res: AuthResponse): Result => {
      db.setToken(res.token);
      write(USER_KEY, res.user);
      setUser(res.user);
      return { ok: true, user: res.user };
    };
    return {
      user,
      checking,
      async login(email, password) {
        try {
          return accept(await api.auth.login(email.trim(), password));
        } catch (e) {
          return { ok: false, error: errorMessage(e) };
        }
      },
      async signup(data) {
        try {
          return accept(await api.auth.register({ ...data, phone: data.phone?.trim() || undefined }));
        } catch (e) {
          return { ok: false, error: errorMessage(e) };
        }
      },
      logout: clear,
    };
  }, [user, checking]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
}
