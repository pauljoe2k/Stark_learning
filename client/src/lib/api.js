import { mockApi } from './mockApi.js';

const useMock = import.meta.env.VITE_USE_MOCK === 'true';
const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

async function request(method, path, data) {
  if (useMock) return mockApi.request(method, path, data);

  const isForm = data instanceof FormData;
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('pinpoint-token');
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (data && !isForm) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: data ? (isForm ? data : JSON.stringify(data)) : undefined,
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem('pinpoint-token');
    }
    throw new Error(body?.error || `Request failed with status ${response.status}.`);
  }
  return body;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, data) => request('POST', path, data),
  patch: (path, data) => request('PATCH', path, data),
  delete: (path) => request('DELETE', path),
};