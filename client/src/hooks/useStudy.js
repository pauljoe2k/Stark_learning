import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { endpoints } from '../lib/endpoints.js';
import { placeKeys } from './usePlaces.js';

export const studyKeys = {
  dashboard: ['dashboard'],
  topics: ['topics'],
  topic: (id) => ['topic', String(id)],
  explanations: (id) => ['explanations', String(id)],
  units: ['units'],
  exams: ['exams'],
  recallHistory: ['recall-history'],
};

function useInvalidate(keys) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };
}

export function useDashboard() {
  return useQuery({ queryKey: studyKeys.dashboard, queryFn: () => api.get(endpoints.dashboard.get()) });
}

export function useTopics() {
  return useQuery({ queryKey: studyKeys.topics, queryFn: () => api.get(endpoints.topics.list()) });
}

export function useTopic(id) {
  return useQuery({
    queryKey: studyKeys.topic(id),
    queryFn: () => api.get(endpoints.topics.one(id)),
    enabled: Boolean(id),
  });
}

export function useCreateTopic() {
  const invalidate = useInvalidate([studyKeys.topics, studyKeys.dashboard]);
  return useMutation({ mutationFn: (data) => api.post(endpoints.topics.create(), data), onSuccess: invalidate });
}

export function useSaveTopic(id) {
  const invalidate = useInvalidate([studyKeys.topics, studyKeys.topic(id), studyKeys.dashboard]);
  return useMutation({ mutationFn: (data) => api.patch(endpoints.topics.one(id), data), onSuccess: invalidate });
}

export function useUploadTopicFiles() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ topicId, files, reextract = false }) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post(reextract ? endpoints.topics.extract(topicId) : endpoints.topics.files(topicId), formData);
  }, onSuccess: async (_result, { topicId }) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: studyKeys.topics }),
      queryClient.invalidateQueries({ queryKey: studyKeys.topic(topicId) }),
      queryClient.invalidateQueries({ queryKey: studyKeys.dashboard }),
    ]);
  } });
}

export function useDeleteTopic(id) {
  const invalidate = useInvalidate([studyKeys.topics, studyKeys.dashboard]);
  return useMutation({ mutationFn: () => api.delete(endpoints.topics.one(id)), onSuccess: invalidate });
}

export function useExplainTopic(id) {
  const invalidate = useInvalidate([studyKeys.topics, studyKeys.topic(id), studyKeys.explanations(id), studyKeys.dashboard]);
  return useMutation({ mutationFn: (data) => api.post(endpoints.topics.explain(id), data), onSuccess: invalidate });
}

export function useExplanations(id) {
  return useQuery({
    queryKey: studyKeys.explanations(id),
    queryFn: () => api.get(endpoints.topics.explanations(id)),
    enabled: Boolean(id),
  });
}

export function useUnits() {
  return useQuery({ queryKey: studyKeys.units, queryFn: () => api.get(endpoints.units.list()) });
}

export function useCreateUnit() {
  const invalidate = useInvalidate([studyKeys.units, studyKeys.dashboard]);
  return useMutation({ mutationFn: (data) => api.post(endpoints.units.create(), data), onSuccess: invalidate });
}

export function useExams() {
  return useQuery({ queryKey: studyKeys.exams, queryFn: () => api.get(endpoints.exams.list()) });
}

export function useCreateExam() {
  const invalidate = useInvalidate([studyKeys.exams, studyKeys.dashboard]);
  return useMutation({ mutationFn: (data) => api.post(endpoints.exams.create(), data), onSuccess: invalidate });
}

export function useUpdateExam() {
  const invalidate = useInvalidate([studyKeys.exams, studyKeys.dashboard]);
  return useMutation({ mutationFn: ({ id, data }) => api.patch(endpoints.exams.one(id), data), onSuccess: invalidate });
}

export function useDeleteExam() {
  const invalidate = useInvalidate([studyKeys.exams, studyKeys.dashboard]);
  return useMutation({ mutationFn: (id) => api.delete(endpoints.exams.one(id)), onSuccess: invalidate });
}

export function useStartRecall() {
  return useMutation({ mutationFn: (data) => api.post(endpoints.recall.start(), data) });
}

export function useRevealRecall(roundId) {
  return useMutation({ mutationFn: (flagId) => api.post(endpoints.recall.reveal(roundId), { flag_id: flagId }) });
}

export function useSaveRecallResult(roundId) {
  const invalidate = useInvalidate([studyKeys.recallHistory, studyKeys.dashboard]);
  return useMutation({
    mutationFn: (data) => api.post(endpoints.recall.result(roundId), data),
    onSuccess: invalidate,
  });
}

export function useFinishRecall(roundId) {
  const invalidate = useInvalidate([studyKeys.recallHistory, studyKeys.dashboard]);
  return useMutation({
    mutationFn: () => api.post(endpoints.recall.finish(roundId), {}),
    onSuccess: invalidate,
  });
}

export function useRecallHistory() {
  return useQuery({ queryKey: studyKeys.recallHistory, queryFn: () => api.get(endpoints.recall.history()) });
}

export function usePinGaps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ placeId, keyPoints }) => {
      const positions = [[20, 25], [50, 25], [80, 25], [20, 70], [50, 70], [80, 70], [35, 48], [65, 48]];
      const created = [];
      for (const [index, point] of keyPoints.entries()) {
        const [x, y] = positions[index % positions.length];
        created.push(await api.post(endpoints.flags.create(), {
          placeId,
          keyPointId: Number(point.id),
          x,
          y,
          title: point.text,
          note: 'Pinned from your Explain gaps.',
        }));
      }
      return created;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: placeKeys.all }),
        queryClient.invalidateQueries({ queryKey: studyKeys.dashboard }),
      ]);
    },
  });
}
