import assert from 'node:assert/strict';
import { test } from 'node:test';
import { socketEventSchemas, workerSocketMessageSchema } from '@pinpoint/shared';

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
