const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export interface KeyPoint {
  id: number;
  text: string;
}

export interface TopicFile {
  id: number;
  fileUrl: string;
  type: string;
  pageCount: number;
  createdAt: string;
}

export interface TopicRecord {
  id: number;
  unitId: number | null;
  title: string;
  notes: string;
  keyPoints: KeyPoint[];
  topicFiles: TopicFile[];
  unit: { id: number; title: string } | null;
  updatedAt: string;
}

export interface UnitRecord {
  id: number;
  title: string;
}

export interface ExtractionResult {
  title: string;
  notes: string;
  keyPoints: string[];
}

export type UploadTicket =
  | { provider: 'local'; token: string; nonce: string; expiresIn: number }
  | {
    provider: 'cloudinary';
    token: string;
    nonce: string;
    expiresIn: number;
    cloudName: string;
    apiKey: string;
    timestamp: number;
    folder: string;
    publicId: string;
    context: string;
    signature: string;
    uploadUrl: string;
  };

export interface ExtractionJobResult {
  extraction: ExtractionResult;
  keyPoints: KeyPoint[];
}

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
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
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
  topics: (token: string) => request<{ topics: TopicRecord[] }>('/topics', {}, token),
  units: (token: string) => request<{ units: UnitRecord[] }>('/units', {}, token),
  createTopic: (token: string, input: { title: string; unitId?: number }) =>
    request<{ topic: TopicRecord }>('/topics', { method: 'POST', body: JSON.stringify(input) }, token),
  updateTopic: (token: string, id: number, input: {
    title: string;
    notes: string;
    keyPoints: Array<{ id?: number; text: string }>;
  }) =>
    request<{ topic: TopicRecord }>(`/topics/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  createUploadTicket: (token: string, topicId: number) =>
    request<UploadTicket>(`/topics/${topicId}/upload-ticket`, { method: 'POST', body: '{}' }, token),
  uploadLocal: (token: string, topicId: number, ticket: UploadTicket, file: File) => {
    if (ticket.provider !== 'local') throw new Error('Local upload ticket is required.');
    const body = new FormData();
    body.append('file', file);
    body.append('uploadToken', ticket.token);
    return request<{ fileId: number; topicId: number; state: 'waiting' }>(
      `/topics/${topicId}/files/local`,
      { method: 'POST', body },
      token,
    );
  },
  uploadCloudinary: async (token: string, topicId: number, ticket: UploadTicket, file: File) => {
    if (ticket.provider !== 'cloudinary') throw new Error('Cloudinary upload ticket is required.');
    const upload = new FormData();
    upload.append('file', file);
    upload.append('api_key', ticket.apiKey);
    upload.append('timestamp', String(ticket.timestamp));
    upload.append('folder', ticket.folder);
    upload.append('public_id', ticket.publicId);
    upload.append('context', ticket.context);
    upload.append('signature', ticket.signature);

    const uploadResponse = await fetch(ticket.uploadUrl, { method: 'POST', body: upload });
    const uploaded: unknown = await uploadResponse.json().catch(() => null);
    if (!uploadResponse.ok) {
      const message = typeof uploaded === 'object' && uploaded !== null
        && 'error' in uploaded && typeof uploaded.error === 'object' && uploaded.error !== null
        && 'message' in uploaded.error && typeof uploaded.error.message === 'string'
        ? uploaded.error.message
        : 'Cloud storage could not accept this file.';
      throw new Error(message);
    }
    if (
      typeof uploaded !== 'object' || uploaded === null
      || !('public_id' in uploaded) || typeof uploaded.public_id !== 'string'
      || !('secure_url' in uploaded) || typeof uploaded.secure_url !== 'string'
      || !('resource_type' in uploaded) || !['image', 'raw'].includes(String(uploaded.resource_type))
    ) {
      throw new Error('Cloud storage returned an invalid upload response.');
    }
    return request<{ fileId: number; topicId: number; state: 'waiting' }>(
      `/topics/${topicId}/files/cloudinary`,
      {
        method: 'POST',
        body: JSON.stringify({
          publicId: uploaded.public_id,
          secureUrl: uploaded.secure_url,
          resourceType: uploaded.resource_type,
          uploadNonce: ticket.nonce,
        }),
      },
      token,
    );
  },
  fileStatus: (token: string, topicId: number, fileId: number) =>
    request<{
      fileId: number;
      state: string;
      progress?: unknown;
      result?: ExtractionJobResult;
      error?: string;
    }>(`/topics/${topicId}/files/${fileId}`, {}, token),
};
