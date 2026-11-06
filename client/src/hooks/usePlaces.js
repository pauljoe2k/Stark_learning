import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { endpoints } from '../lib/endpoints.js';

export const placeKeys = {
  all: ['places'],
  detail: (id) => ['place', String(id)],
};

export function usePlaces() {
  return useQuery({
    queryKey: placeKeys.all,
    queryFn: () => api.get(endpoints.places.list()),
  });
}

export function usePlace(id) {
  return useQuery({
    queryKey: placeKeys.detail(id),
    queryFn: () => api.get(endpoints.places.one(id)),
    enabled: Boolean(id),
  });
}

function useInvalidatePlaces(id) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: placeKeys.all }),
      ...(id ? [queryClient.invalidateQueries({ queryKey: placeKeys.detail(id) })] : []),
    ]);
  };
}

export function useCreatePlace() {
  const invalidate = useInvalidatePlaces();
  return useMutation({
    mutationFn: (formData) => api.post(endpoints.places.create(), formData),
    onSuccess: invalidate,
  });
}

export function useRenamePlace(id) {
  const invalidate = useInvalidatePlaces(id);
  return useMutation({
    mutationFn: (data) => api.patch(endpoints.places.rename(id), data),
    onSuccess: invalidate,
  });
}

export function useDeletePlace(id) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidatePlaces();
  return useMutation({
    mutationFn: () => api.delete(endpoints.places.remove(id)),
    onSuccess: async () => {
      await invalidate();
      queryClient.removeQueries({ queryKey: placeKeys.detail(id) });
    },
  });
}

export function useCreateFlag(placeId) {
  const invalidate = useInvalidatePlaces(placeId);
  return useMutation({
    mutationFn: (data) => api.post(endpoints.flags.create(), { ...data, placeId: Number(placeId) }),
    onSuccess: invalidate,
  });
}

export function useUpdateFlag(placeId) {
  const invalidate = useInvalidatePlaces(placeId);
  return useMutation({
    mutationFn: ({ id, data }) => api.patch(endpoints.flags.update(id), data),
    onSuccess: invalidate,
  });
}

export function useDeleteFlag(placeId) {
  const invalidate = useInvalidatePlaces(placeId);
  return useMutation({
    mutationFn: (id) => api.delete(endpoints.flags.remove(id)),
    onSuccess: invalidate,
  });
}