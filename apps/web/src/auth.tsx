import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, api, type AuthUser } from './api';

const userCacheKey = 'pinpoint.cachedUser';

function readCachedUser(): AuthUser | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(userCacheKey) ?? 'null');
    if (typeof value !== 'object' || value === null
      || !('id' in value) || typeof value.id !== 'number'
      || !('name' in value) || typeof value.name !== 'string'
      || !('email' in value) || typeof value.email !== 'string'
      || !('passMark' in value) || typeof value.passMark !== 'number') return null;
    return {
      id: value.id,
      name: value.name,
      email: value.email,
      passMark: value.passMark,
    };
  } catch {
    return null;
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  authenticate: (credentials: { name?: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pinpoint.accessToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    void api.me(token, controller.signal)
      .then(({ user: currentUser }) => {
        if (active) {
          localStorage.setItem(userCacheKey, JSON.stringify(currentUser));
          setUser(currentUser);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          localStorage.removeItem('pinpoint.accessToken');
          localStorage.removeItem(userCacheKey);
          setToken(null);
          setUser(null);
          return;
        }
        setUser(readCachedUser());
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [token]);

  async function authenticate(credentials: { name?: string; email: string; password: string }): Promise<void> {
    const result = 'name' in credentials && credentials.name
      ? await api.signup({ name: credentials.name, email: credentials.email, password: credentials.password })
      : await api.login({ email: credentials.email, password: credentials.password });
    localStorage.setItem('pinpoint.accessToken', result.token);
    localStorage.setItem(userCacheKey, JSON.stringify(result.user));
    setUser(result.user);
    setToken(result.token);
  }

  function logout(): void {
    localStorage.removeItem('pinpoint.accessToken');
    localStorage.removeItem(userCacheKey);
    setToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ user, token, loading, authenticate, logout }), [user, token, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
