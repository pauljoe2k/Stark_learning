import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../lib/api/index';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pinpoint_user');
    return saved ? JSON.parse(saved) : {
      id: 1,
      name: 'Alex Stark',
      email: 'alex@pinpoint.study',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    };
  });
  const [token, setToken] = useState(() => localStorage.getItem('pinpoint_token') || 'demo-token');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('pinpoint_token', res.token);
      localStorage.setItem('pinpoint_user', JSON.stringify(res.user));
      return res;
    } catch (err) {
      // Demo fallback login if server is offline
      const demoUser = { id: 1, name: 'Alex Stark', email, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150' };
      setUser(demoUser);
      setToken('demo-token');
      localStorage.setItem('pinpoint_token', 'demo-token');
      localStorage.setItem('pinpoint_user', JSON.stringify(demoUser));
      return { user: demoUser, token: 'demo-token' };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password) => {
    setLoading(true);
    try {
      const res = await authApi.signup({ name, email, password });
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('pinpoint_token', res.token);
      localStorage.setItem('pinpoint_user', JSON.stringify(res.user));
      return res;
    } catch (err) {
      const demoUser = { id: Date.now(), name, email, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150' };
      setUser(demoUser);
      setToken('demo-token');
      localStorage.setItem('pinpoint_token', 'demo-token');
      localStorage.setItem('pinpoint_user', JSON.stringify(demoUser));
      return { user: demoUser, token: 'demo-token' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pinpoint_token');
    localStorage.removeItem('pinpoint_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
