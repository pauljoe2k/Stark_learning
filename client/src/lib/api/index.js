import { apiClient } from '../api';

export const authApi = {
  login: (credentials) => apiClient('/auth/login', { body: credentials }),
  signup: (userData) => apiClient('/auth/signup', { body: userData }),
  getMe: () => apiClient('/me'),
  updateMe: (data) => apiClient('/me', { method: 'PATCH', body: data }),
};

export const dashboardApi = {
  getDashboard: () => apiClient('/dashboard'),
};

export const unitsApi = {
  getAll: () => apiClient('/units'),
  create: (data) => apiClient('/units', { body: data }),
  update: (id, data) => apiClient(`/units/${id}`, { method: 'PATCH', body: data }),
  delete: (id) => apiClient(`/units/${id}`, { method: 'DELETE' }),
};

export const topicsApi = {
  getAll: () => apiClient('/topics'),
  getById: (id) => apiClient(`/topics/${id}`),
  create: (data) => apiClient('/topics', { body: data }),
  update: (id, data) => apiClient(`/topics/${id}`, { method: 'PATCH', body: data }),
  delete: (id) => apiClient(`/topics/${id}`, { method: 'DELETE' }),
  uploadFiles: (topicId, formData) => apiClient(`/topics/${topicId}/files`, { method: 'POST', body: formData }),
  extractKeyPoints: (topicId) => apiClient(`/topics/${topicId}/extract`, { method: 'POST' }),
  deleteFile: (topicId, fileId) => apiClient(`/topics/${topicId}/files/${fileId}`, { method: 'DELETE' }),
};

export const explainApi = {
  submit: (topicId, data) => apiClient(`/topics/${topicId}/explain`, { body: data }),
  getTopicExplanations: (topicId) => apiClient(`/topics/${topicId}/explanations`),
  getExplanationById: (id) => apiClient(`/explanations/${id}`),
};

export const placesApi = {
  getAll: () => apiClient('/places'),
  getById: (id) => apiClient(`/places/${id}`),
  create: (data) => apiClient('/places', { body: data }),
  update: (id, data) => apiClient(`/places/${id}`, { method: 'PATCH', body: data }),
  delete: (id) => apiClient(`/places/${id}`, { method: 'DELETE' }),
};

export const flagsApi = {
  create: (data) => apiClient('/flags', { body: data }),
  update: (id, data) => apiClient(`/flags/${id}`, { method: 'PATCH', body: data }),
  delete: (id) => apiClient(`/flags/${id}`, { method: 'DELETE' }),
};

export const recallApi = {
  start: (data) => apiClient('/recall/start', { body: data }),
  reveal: (roundId, flagId) => apiClient(`/recall/${roundId}/reveal`, { body: { flagId } }),
  recordResult: (roundId, data) => apiClient(`/recall/${roundId}/result`, { body: data }),
  finish: (roundId) => apiClient(`/recall/${roundId}/finish`, { method: 'POST' }),
  getHistory: () => apiClient('/recall/history'),
};

export const examsApi = {
  getAll: () => apiClient('/exams'),
  create: (data) => apiClient('/exams', { body: data }),
  update: (id, data) => apiClient(`/exams/${id}`, { method: 'PATCH', body: data }),
  delete: (id) => apiClient(`/exams/${id}`, { method: 'DELETE' }),
  getCalendar: (from, to) => apiClient(`/calendar?from=${from}&to=${to}`).catch(() => null),
};

