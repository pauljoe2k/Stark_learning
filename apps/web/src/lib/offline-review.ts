import type { OfflineReviewPlace } from '../api';

export interface OfflineReviewSnapshot {
  savedAt: string;
  places: OfflineReviewPlace[];
}

export function offlineReviewKey(userId: number): string {
  return `pinpoint.offlineReview.v1.${userId}`;
}

export function parseOfflineReviewSnapshot(value: string | null): OfflineReviewSnapshot | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== 'object'
      || parsed === null
      || !('savedAt' in parsed)
      || typeof parsed.savedAt !== 'string'
      || Number.isNaN(Date.parse(parsed.savedAt))
      || !('places' in parsed)
      || !Array.isArray(parsed.places)
      || !parsed.places.every(isOfflinePlace)
    ) return null;
    return { savedAt: parsed.savedAt, places: parsed.places };
  } catch {
    return null;
  }
}

function isOfflinePlace(value: unknown): value is OfflineReviewPlace {
  if (typeof value !== 'object' || value === null || !('id' in value) || !Number.isInteger(value.id)
    || !('name' in value) || typeof value.name !== 'string'
    || !('flags' in value) || !Array.isArray(value.flags)) return false;
  return value.flags.every((flag: unknown) => typeof flag === 'object'
    && flag !== null
    && 'id' in flag
    && Number.isInteger(flag.id)
    && 'title' in flag
    && typeof flag.title === 'string'
    && 'note' in flag
    && (typeof flag.note === 'string' || flag.note === null)
    && 'emoji' in flag
    && (typeof flag.emoji === 'string' || flag.emoji === null));
}
