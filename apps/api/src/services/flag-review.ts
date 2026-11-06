export type FlagReviewGrade = 'correct' | 'incorrect';

export interface FlagReviewState {
  reviewIntervalDays: number;
  reviewEase: number;
  nextReviewAt: Date | null;
}

export interface ScheduledFlagReview {
  reviewIntervalDays: number;
  reviewEase: number;
  nextReviewAt: Date;
}

export function scheduleFlagReview(
  current: FlagReviewState,
  grade: FlagReviewGrade,
  reviewedAt = new Date(),
): ScheduledFlagReview {
  const reviewEase = grade === 'correct'
    ? Math.min(3, current.reviewEase + 0.1)
    : Math.max(1.3, current.reviewEase - 0.2);
  const reviewIntervalDays = grade === 'incorrect'
    ? 1
    : current.reviewIntervalDays === 0
      ? 1
      : current.reviewIntervalDays === 1
        ? 3
        : Math.max(1, Math.round(current.reviewIntervalDays * current.reviewEase));
  const nextReviewAt = new Date(reviewedAt);
  nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + reviewIntervalDays);
  return { reviewIntervalDays, reviewEase, nextReviewAt };
}
