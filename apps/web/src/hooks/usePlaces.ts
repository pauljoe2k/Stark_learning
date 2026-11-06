import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateFlagBody, UpdateFlagBody } from '@pinpoint/shared';
import { api, type PlaceDetail } from '../api';
import { useAuth } from '../auth';

const placesQueryKey = (token: string | null) => ['places', token] as const;
const placeQueryKey = (token: string | null, id: number | string | undefined) => ['place', token, id] as const;

async function invalidatePlaceData(
  queryClient: ReturnType<typeof useQueryClient>,
  token: string | null,
  placeId?: number,
): Promise<void> {
  const invalidations = [queryClient.invalidateQueries({ queryKey: placesQueryKey(token) })];
  if (placeId !== undefined) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: placeQueryKey(token, placeId) }));
  }
  await Promise.all(invalidations);
}

export function usePlaces() {
  const { token } = useAuth();
  return useQuery({
    queryKey: placesQueryKey(token),
    queryFn: async () => {
      if (!token) throw new Error('Sign in to load places.');
      return (await api.places(token)).places;
    },
    enabled: Boolean(token),
  });
}

export function usePlace(id: number | string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: placeQueryKey(token, id),
    queryFn: async () => {
      if (!token || !id) throw new Error('Choose a place to view.');
      return (await api.place(token, Number(id))).place;
    },
    enabled: Boolean(token && id),
  });
}

export function useCreatePlace() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; image: File }) => {
      if (!token) throw new Error('Sign in to add a place.');
      return (await api.createPlace(token, input.name, input.image)).place;
    },
    onSuccess: () => invalidatePlaceData(queryClient, token),
  });
}

export function useRenamePlace(id: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!token) throw new Error('Sign in to rename this place.');
      return (await api.renamePlace(token, id, name)).place;
    },
    onSuccess: () => invalidatePlaceData(queryClient, token, id),
  });
}

export function useDeletePlace(id: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Sign in to delete this place.');
      await api.deletePlace(token, id);
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: placeQueryKey(token, id) });
      await invalidatePlaceData(queryClient, token);
    },
  });
}

export function useCreateFlag(placeId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<CreateFlagBody, 'placeId'>) => {
      if (!token) throw new Error('Sign in to add a flag.');
      return (await api.createFlag(token, { ...input, placeId })).flag;
    },
    onSuccess: () => invalidatePlaceData(queryClient, token, placeId),
  });
}

export function useUpdateFlag(placeId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = placeQueryKey(token, placeId);
  return useMutation({
    mutationFn: async (input: { id: number; changes: UpdateFlagBody }) => {
      if (!token) throw new Error('Sign in to edit this flag.');
      return (await api.updateFlag(token, input.id, input.changes)).flag;
    },
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PlaceDetail>(queryKey);
      if (previous) {
        queryClient.setQueryData<PlaceDetail>(queryKey, {
          ...previous,
          flags: previous.flags.map((flag) => flag.id === id ? {
            ...flag,
            x: changes.x ?? flag.x,
            y: changes.y ?? flag.y,
            title: changes.title ?? flag.title,
            note: changes.note === undefined ? flag.note : changes.note,
            emoji: changes.emoji === undefined ? flag.emoji : changes.emoji,
            topicId: changes.topicId === undefined ? flag.topicId : changes.topicId,
            keyPointId: changes.keyPointId === undefined ? flag.keyPointId : changes.keyPointId,
          } : flag),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => invalidatePlaceData(queryClient, token, placeId),
  });
}

export function useDeleteFlag(placeId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!token) throw new Error('Sign in to delete this flag.');
      await api.deleteFlag(token, id);
    },
    onSuccess: () => invalidatePlaceData(queryClient, token, placeId),
  });
}
