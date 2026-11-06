import assert from 'node:assert/strict';
import { test } from 'node:test';
import { socketEventSchemas, workerSocketMessageSchema, type ServerToClientEvents } from '@pinpoint/shared';
import { emitUserEvent } from '../src/realtime.js';
import { parseWorkerSocketMessage, publishWorkerSocketMessage, SOCKET_EVENT_CHANNEL } from '../src/services/redis-events.js';

test('worker upload event payloads satisfy the shared socket contract', () => {
  const message = {
    userId: 7,
    event: 'file:done',
    payload: {
      fileId: 12,
      topicId: 4,
      extraction: {
        title: 'Cell membranes',
        notes: 'The membrane controls what enters and leaves a cell.',
        keyPoints: [
          'The phospholipid bilayer forms the membrane.',
          'Hydrophilic heads face the surrounding water.',
          'Hydrophobic tails face inward.',
          'Transport proteins move selected substances.',
          'Cholesterol helps regulate membrane fluidity.',
        ],
      },
      keyPoints: [
        { id: 1, text: 'The phospholipid bilayer forms the membrane.' },
        { id: 2, text: 'Hydrophilic heads face the surrounding water.' },
        { id: 3, text: 'Hydrophobic tails face inward.' },
        { id: 4, text: 'Transport proteins move selected substances.' },
        { id: 5, text: 'Cholesterol helps regulate membrane fluidity.' },
      ],
    },
  };
  assert.equal(workerSocketMessageSchema.safeParse(message).success, true);
  assert.equal(socketEventSchemas['file:done'].safeParse(message.payload).success, true);
});

test('socket payloads reject extra fields and invalid key-point counts', () => {
  const invalidMessage = {
    userId: 7,
    event: 'file:processing',
    payload: { fileId: 12, topicId: 4, userId: 7 },
  };
  assert.equal(workerSocketMessageSchema.safeParse(invalidMessage).success, false);
  assert.equal(
    socketEventSchemas['file:done'].safeParse({
      fileId: 12,
      topicId: 4,
      extraction: { title: 'A title', notes: 'Some notes', keyPoints: ['one'] },
      keyPoints: [{ id: 1, text: 'one' }],
    }).success,
    false,
  );
});

test('Explain socket events validate each streamed gap-map point', () => {
  const message = {
    userId: 7,
    event: 'explain:result',
    payload: {
      topicId: 4,
      index: 0,
      total: 5,
      point: {
        keyPointId: 12,
        status: 'partial',
        evidence: 'A short quote.',
        feedback: 'Add one more detail.',
      },
    },
  };
  assert.equal(workerSocketMessageSchema.safeParse(message).success, true);
  assert.equal(socketEventSchemas['explain:result'].safeParse(message.payload).success, true);
  assert.equal(socketEventSchemas['explain:result'].safeParse({
    ...message.payload,
    point: { ...message.payload.point, unexpected: true },
  }).success, false);
});

test('server event types match all server-side schema names', () => {
  const serverEvents: (keyof ServerToClientEvents)[] = [
    'file:processing', 'file:progress', 'file:done', 'file:error',
    'explain:analyzing', 'explain:result', 'explain:transcript',
    'recall:start', 'recall:flagResult', 'recall:finished', 'recall:state',
    'dashboard:updated',
  ];
  assert.deepEqual(
    serverEvents.sort(),
    Object.keys(socketEventSchemas).filter((event) => event !== 'recall:resume').sort(),
  );
});

test('Redis event publishing validates payloads and parsing rejects malformed messages', async () => {
  let published: { channel: string; value: string } | undefined;
  await publishWorkerSocketMessage(async (channel, value) => {
    published = { channel, value };
  }, {
    userId: 7,
    event: 'file:processing',
    payload: { fileId: 12, topicId: 4 },
  });
  assert.equal(published?.channel, SOCKET_EVENT_CHANNEL);
  assert.deepEqual(JSON.parse(published?.value ?? '{}'), {
    userId: 7,
    event: 'file:processing',
    payload: { fileId: 12, topicId: 4 },
  });
  assert.deepEqual(parseWorkerSocketMessage(published?.value ?? ''), JSON.parse(published?.value ?? '{}'));
  assert.equal(parseWorkerSocketMessage('{'), null);
  assert.equal(parseWorkerSocketMessage(JSON.stringify({ userId: 0, event: 'file:processing', payload: {} })), null);
  await assert.rejects(publishWorkerSocketMessage(async () => undefined, {
    userId: 0,
    event: 'file:processing',
    payload: { fileId: 12, topicId: 4 },
  } as never));
});

test('Socket.IO events are emitted only to the requested user room and validate outgoing data', () => {
  const delivered: Array<{ room: string; event: string; payload: unknown }> = [];
  const fakeIo = {
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          delivered.push({ room, event, payload });
        },
      };
    },
  } as unknown as Parameters<typeof emitUserEvent>[0];

  emitUserEvent(fakeIo, 7, 'dashboard:updated', {
    reason: 'recall',
    occurredAt: new Date().toISOString(),
  });
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0]?.room, 'user:7');
  assert.equal(delivered[0]?.event, 'dashboard:updated');
  assert.throws(() => emitUserEvent(fakeIo, 8, 'dashboard:updated', {
    reason: 'unknown',
    occurredAt: new Date().toISOString(),
  } as never));
  assert.equal(delivered.length, 1);
});
