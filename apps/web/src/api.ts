const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  passMark: number;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : 'The request could not be completed.';
    throw new Error(message);
  }
  return body as T;
}

export const api = {
  signup: (input: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  login: (input: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  me: (token: string) => request<{ user: AuthUser }>('/me', {}, token),
};
