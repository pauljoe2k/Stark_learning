import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scheduleFlagReview } from '../src/services/flag-review.js';

test('flag review advances correct answers and schedules a future due date', () => {
  const reviewedAt = new Date('2026-11-05T12:00:00.000Z');
  const first = scheduleFlagReview({ reviewIntervalDays: 0, reviewEase: 2.5, nextReviewAt: null }, 'correct', reviewedAt);
  assert.equal(first.reviewIntervalDays, 1);
  assert.ok(first.nextReviewAt);
  assert.equal(first.nextReviewAt.toISOString(), '2026-11-06T12:00:00.000Z');
  const second = scheduleFlagReview({ ...first, reviewIntervalDays: 1 }, 'correct', reviewedAt);
  assert.equal(second.reviewIntervalDays, 3);
  const third = scheduleFlagReview({ ...second, reviewIntervalDays: 3 }, 'correct', reviewedAt);
  assert.equal(third.reviewIntervalDays, 8);
});

test('missed flags return to a one-day interval without reducing ease below its floor', () => {
  const result = scheduleFlagReview(
    { reviewIntervalDays: 12, reviewEase: 1.35, nextReviewAt: null },
    'incorrect',
    new Date('2026-11-05T12:00:00.000Z'),
  );
  assert.equal(result.reviewIntervalDays, 1);
  assert.equal(result.reviewEase, 1.3);
});
