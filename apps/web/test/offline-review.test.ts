import assert from 'node:assert/strict';
import { test } from 'node:test';
import { offlineReviewKey, parseOfflineReviewSnapshot } from '../src/lib/offline-review.ts';

test('offline review storage keys are unique per user', () => {
  assert.equal(offlineReviewKey(1), 'pinpoint.offlineReview.v1.1');
  assert.notEqual(offlineReviewKey(1), offlineReviewKey(2));
});

test('offline snapshot parser accepts a valid snapshot and rejects invalid data', () => {
  const savedAt = new Date().toISOString();
  const valid = JSON.stringify({
    savedAt,
    places: [{
      id: 1,
      name: 'Kitchen',
      flags: [{ id: 2, title: 'Key idea', note: null, emoji: '💡' }],
    }],
  });
  assert.deepEqual(parseOfflineReviewSnapshot(valid), JSON.parse(valid));
  assert.equal(parseOfflineReviewSnapshot(null), null);
  assert.equal(parseOfflineReviewSnapshot('{'), null);
  assert.equal(parseOfflineReviewSnapshot(JSON.stringify({ savedAt: 'not-a-date', places: [] })), null);
  assert.equal(parseOfflineReviewSnapshot(JSON.stringify({ savedAt, places: [{ id: 1, name: 'Room', flags: [{ id: 2 }] }] })), null);
});
