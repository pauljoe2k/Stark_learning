import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sharedPlaceTokenFromPath } from '../src/lib/shared-place-route.ts';

test('shared palace routes pass their token to the public page', () => {
  const token = 'a'.repeat(64);
  assert.equal(sharedPlaceTokenFromPath(`/shared/${token}`), token);
  assert.equal(sharedPlaceTokenFromPath('/shared/'), '');
  assert.equal(sharedPlaceTokenFromPath('/shared/token/extra'), '');
});
