import type {
  CreateFlagBody,
  DashboardResponse,
  ExplainBody,
  ExplainResult,
  RecallResultBody,
  RecallVoiceAnswerBody,
  StartRecallBody,
  UpdateFlagBody,
} from '@pinpoint/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

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
  mastery: number;
  keyPoints: KeyPoint[];
  topicFiles: TopicFile[];
  unit: { id: number; title: string } | null;
  updatedAt: string;
}

export interface UnitRecord {
  id: number;
  title: string;
}

export interface FlagRecord {
  id: number;
  placeId: number;
  topicId: number | null;
  keyPointId: number | null;
  x: number;
  y: number;
  title: string;
  note: string | null;
  emoji: string | null;
  reviewIntervalDays: number;
  reviewEase: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceRecord {
  id: number;
  name: string;
  imageUrl: string;
  flagsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceDetail extends Omit<PlaceRecord, 'flagsCount'> {
  flags: FlagRecord[];
}

export interface SharedPlace {
  id: number;
  name: string;
  imageUrl: string;
  flags: Array<Pick<FlagRecord, 'id' | 'x' | 'y' | 'title' | 'note' | 'emoji'>>;
}

export interface OfflineReviewPlace {
  id: number;
  name: string;
  flags: Array<{ id: number; title: string; note: string | null; emoji: string | null }>;
}

export interface RecallRound {
  roundId: number;
  timeLimitSec: number;
  speedMode: boolean;
  place: { id: number; name: string; imageUrl: string };
  flags: Array<{ id: number; x: number; y: number }>;
}

export interface RecallCompletion {
  roundId: number;
  place: { id: number; name: string; imageUrl: string };
  flags: SharedPlace['flags'];
  results: Array<{
    flagId: number;
    result: 'green' | 'red';
    secondsTaken: number;
    aiFeedback: string | null;
    gradingSource: string | null;
  }>;
  summary: { green: number; red: number };
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

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
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
    throw new ApiError(message, response.status);
  }
  return body as T;
}

export const api = {
  dashboard: (token: string) => request<DashboardResponse>('/dashboard', {}, token),
  signup: (input: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  login: (input: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  me: (token: string, signal?: AbortSignal) =>
    request<{ user: AuthUser }>('/me', signal ? { signal } : {}, token),
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
  explain: (token: string, topicId: number, input: ExplainBody) =>
    request<{ explanation: ExplainResult }>(
      `/topics/${topicId}/explain`,
      { method: 'POST', body: JSON.stringify(input) },
      token,
    ),
  places: (token: string) => request<{ places: PlaceRecord[] }>('/places', {}, token),
  place: (token: string, id: number) => request<{ place: PlaceDetail }>(`/places/${id}`, {}, token),
  createPlace: (token: string, name: string, image: File) => {
    const body = new FormData();
    body.append('name', name);
    body.append('image', image);
    return request<{ place: PlaceRecord }>('/places', { method: 'POST', body }, token);
  },
  renamePlace: (token: string, id: number, name: string) =>
    request<{ place: Pick<PlaceRecord, 'id' | 'name' | 'imageUrl' | 'updatedAt'> }>(
      `/places/${id}`,
      { method: 'PATCH', body: JSON.stringify({ name }) },
      token,
    ),
  deletePlace: (token: string, id: number) =>
    request<void>(`/places/${id}`, { method: 'DELETE' }, token),
  createFlag: (token: string, input: CreateFlagBody) =>
    request<{ flag: FlagRecord }>('/flags', { method: 'POST', body: JSON.stringify(input) }, token),
  updateFlag: (token: string, id: number, input: UpdateFlagBody) =>
    request<{ flag: FlagRecord }>(`/flags/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  deleteFlag: (token: string, id: number) =>
    request<void>(`/flags/${id}`, { method: 'DELETE' }, token),
  dueFlags: (token: string) =>
    request<{ flags: Array<FlagRecord & { place: { id: number; name: string; imageUrl: string } }> }>('/flags/due', {}, token),
  reviewFlag: (token: string, id: number, grade: 'correct' | 'incorrect') =>
    request<{ flag: FlagRecord }>(`/flags/${id}/review`, { method: 'POST', body: JSON.stringify({ grade }) }, token),
  placeShareStatus: (token: string, id: number) =>
    request<{ share: { active: boolean; createdAt?: string } }>(`/places/${id}/share`, {}, token),
  createPlaceShare: (token: string, id: number) =>
    request<{ token: string }>(`/places/${id}/share`, { method: 'POST', body: '{}' }, token),
  revokePlaceShare: (token: string, id: number) =>
    request<void>(`/places/${id}/share`, { method: 'DELETE' }, token),
  sharedPlace: (shareToken: string) =>
    request<{ place: SharedPlace }>(`/shared/${encodeURIComponent(shareToken)}`),
  startRecall: (token: string, settings: StartRecallBody) =>
    request<RecallRound>('/recall/start', { method: 'POST', body: JSON.stringify(settings) }, token),
  revealRecallFlag: (token: string, roundId: number, flagId: number) =>
    request<{ flag: { id: number; title: string; note: string | null; emoji: string | null; timeLimitSec: number } }>(
      `/recall/${roundId}/reveal`,
      { method: 'POST', body: JSON.stringify({ flagId }) },
      token,
    ),
  saveRecallResult: (token: string, roundId: number, result: RecallResultBody) =>
    request<{ result: { flagId: number; result: 'green' | 'red'; secondsTaken: number } }>(
      `/recall/${roundId}/result`,
      { method: 'POST', body: JSON.stringify(result) },
      token,
    ),
  submitRecallVoiceAnswer: (token: string, roundId: number, input: RecallVoiceAnswerBody) =>
    request<{ result: { flagId: number; result: 'green' | 'red'; secondsTaken: number; feedback: string; source: 'ai' } }>(
      `/recall/${roundId}/voice-answer`,
      { method: 'POST', body: JSON.stringify(input) },
      token,
    ),
  finishRecall: (token: string, roundId: number) =>
    request<RecallCompletion>(`/recall/${roundId}/finish`, { method: 'POST', body: '{}' }, token),
  offlineReview: (token: string) =>
    request<{ places: OfflineReviewPlace[] }>('/recall/offline', {}, token),
};
