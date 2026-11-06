export const queryKeys = {
  auth: ['auth'],
  dashboard: ['dashboard'],
  units: ['units'],
  topics: {
    all: ['topics'],
    detail: (id) => ['topics', id],
  },
  explanations: {
    byTopic: (topicId) => ['explanations', 'topic', topicId],
    detail: (id) => ['explanations', id],
  },
  places: {
    all: ['places'],
    detail: (id) => ['places', id],
  },
  exams: ['exams'],
  calendar: (from, to) => ['calendar', from, to],
  recall: {
    history: ['recall', 'history'],
    round: (id) => ['recall', 'round', id],
  },
};

