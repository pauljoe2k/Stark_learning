import assert from 'node:assert/strict';
import { test } from 'node:test';
import { socketEventSchemas } from '../src/socket.js';

test('socket contracts accept valid file progress and reject malformed payloads', () => {
  assert.equal(socketEventSchemas['file:progress'].parse({
    fileId: 1,
    stage: 'extracting',
    percent: 45,
  }).percent, 45);
  assert.equal(socketEventSchemas['file:progress'].safeParse({
    fileId: 1,
    stage: 'extracting',
    percent: 145,
  }).success, false);
});

test('socket event payloads cannot carry a user identity', () => {
  const parsed = socketEventSchemas['dashboard:updated'].safeParse({
    reason: 'exam',
    occurredAt: '2026-03-01T10:00:00.000Z',
    userId: 1,
  });
  assert.equal(parsed.success, false);
});
