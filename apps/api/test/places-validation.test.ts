import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFlagBodySchema, createPlaceUploadBodySchema, updateFlagBodySchema } from '@pinpoint/shared';

test('place upload requires a trimmed non-empty name within the limit', () => {
  assert.equal(createPlaceUploadBodySchema.safeParse({ name: '  Kitchen  ' }).success, true);
  assert.equal(createPlaceUploadBodySchema.safeParse({ name: '   ' }).success, false);
  assert.equal(createPlaceUploadBodySchema.safeParse({ name: 'x'.repeat(81) }).success, false);
});

test('flag creation enforces percentages and a non-empty title', () => {
  const valid = { placeId: 2, x: 25.5, y: 80, title: '  A key idea  ' };
  assert.equal(createFlagBodySchema.safeParse(valid).success, true);
  assert.equal(createFlagBodySchema.safeParse({ ...valid, x: 150 }).success, false);
  assert.equal(createFlagBodySchema.safeParse({ ...valid, title: '   ' }).success, false);
});

test('flag updates can unlink topic and key point references', () => {
  assert.equal(updateFlagBodySchema.safeParse({ topicId: null, keyPointId: null }).success, true);
  assert.equal(updateFlagBodySchema.safeParse({ topicId: 2, keyPointId: null }).success, true);
  assert.equal(updateFlagBodySchema.safeParse({ placeId: 3 }).success, false);
});
