import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type AuthUser } from './api';

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
    void api.me(token)
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        localStorage.removeItem('pinpoint.accessToken');
        if (active) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  async function authenticate(credentials: { name?: string; email: string; password: string }): Promise<void> {
    const result = 'name' in credentials && credentials.name
      ? await api.signup({ name: credentials.name, email: credentials.email, password: credentials.password })
      : await api.login({ email: credentials.email, password: credentials.password });
    localStorage.setItem('pinpoint.accessToken', result.token);
    setUser(result.user);
    setToken(result.token);
  }

  function logout(): void {
    localStorage.removeItem('pinpoint.accessToken');
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
