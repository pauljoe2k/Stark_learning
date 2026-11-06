export const endpoints = {
  auth: {
    signup: () => '/auth/signup',
    login: () => '/auth/login',
    resetPassword: () => '/auth/reset-password',
    me: () => '/auth/me',
  },
  dashboard: {
    get: () => '/dashboard',
  },
  units: {
    list: () => '/units',
    create: () => '/units',
    one: (id) => `/units/${id}`,
  },
  topics: {
    list: () => '/topics',
    create: () => '/topics',
    one: (id) => `/topics/${id}`,
    files: (id) => `/topics/${id}/files`,
    extract: (id) => `/topics/${id}/extract`,
    file: (id, fileId) => `/topics/${id}/files/${fileId}`,
    explain: (id) => `/topics/${id}/explain`,
    explanations: (id) => `/topics/${id}/explanations`,
  },
  explanations: {
    one: (id) => `/explanations/${id}`,
  },
  places: {
    list: () => '/places',
    create: () => '/places',
    one: (id) => `/places/${id}`,
    rename: (id) => `/places/${id}`,
    remove: (id) => `/places/${id}`,
  },
  flags: {
    create: () => '/flags',
    update: (id) => `/flags/${id}`,
    remove: (id) => `/flags/${id}`,
  },
  recall: {
    start: () => '/recall/start',
    history: () => '/recall/history',
    reveal: (roundId) => `/recall/${roundId}/reveal`,
    result: (roundId) => `/recall/${roundId}/result`,
    finish: (roundId) => `/recall/${roundId}/finish`,
  },
  exams: {
    list: () => '/exams',
    create: () => '/exams',
    one: (id) => `/exams/${id}`,
  },
};
