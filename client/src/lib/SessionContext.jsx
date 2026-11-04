import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { endpoints } from './endpoints.js';

const SessionContext = createContext(null);
const tokenKey = 'pinpoint-token';
const userKey = 'pinpoint-user';
const loggedOutKey = 'pinpoint-logged-out';

export function SessionProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(userKey) || 'null');
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(loggedOutKey) === 'true') {
      setReady(true);
      return;
    }
    api.get(endpoints.auth.me())
      .then((result) => {
        setUser(result);
        localStorage.setItem(userKey, JSON.stringify(result));
      })
      .catch(() => {
        if (!localStorage.getItem(tokenKey)) setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const authenticate = useCallback(async (action, data) => {
    const result = await api.post(action === 'signup' ? endpoints.auth.signup() : endpoints.auth.login(), data);
    localStorage.setItem(tokenKey, result.token);
    localStorage.setItem(userKey, JSON.stringify(result.user));
    localStorage.removeItem(loggedOutKey);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    localStorage.setItem(loggedOutKey, 'true');
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    login: (data) => authenticate('login', data),
    signup: (data) => authenticate('signup', data),
    logout,
  }), [user, ready, authenticate, logout]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider.');
  return context;
}
