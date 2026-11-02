const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function apiClient(endpoint, { body, ...customConfig } = {}) {
  const token = localStorage.getItem('pinpoint_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customConfig.headers,
  };

  const config = {
    method: customConfig.method || (body ? 'POST' : 'GET'),
    headers,
    ...customConfig,
  };

  if (body && !(body instanceof FormData)) {
    config.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    delete headers['Content-Type']; // Let browser set boundary
    config.body = body;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);

    if (res.status === 401) {
      localStorage.removeItem('pinpoint_token');
      localStorage.removeItem('pinpoint_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw new Error('Session expired. Please sign in again.');
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const error = (data && data.message) || res.statusText || 'Request failed';
      return Promise.reject(new Error(error));
    }

    return data;
  } catch (err) {
    // If backend is offline, return fallback indicator or rethrow
    return Promise.reject(err);
  }
}

