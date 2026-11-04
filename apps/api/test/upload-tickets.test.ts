import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UploadTickets } from '../src/services/upload-tickets.js';

test('upload tickets are scoped to one user and topic and can be consumed only once', async () => {
  const entries = new Map<string, { userId: number; topicId: number }>();
  const tickets = new UploadTickets('test-secret-with-more-than-thirty-two-characters', {
    issue: async (ticketId, userId, topicId) => {
      entries.set(ticketId, { userId, topicId });
    },
    consume: async (ticketId, userId, topicId) => {
      const entry = entries.get(ticketId);
      entries.delete(ticketId);
      return entry?.userId === userId && entry.topicId === topicId;
    },
  });
  const issued = await tickets.issue(3, 9);

  await assert.rejects(
    tickets.consumeToken(issued.token, 4, 9),
    (error: unknown) => error instanceof Error && error.message.includes('does not match'),
  );
  await tickets.consumeToken(issued.token, 3, 9);
  await assert.rejects(
    tickets.consumeToken(issued.token, 3, 9),
    (error: unknown) => error instanceof Error && error.message.includes('invalid, expired, or already used'),
  );
});
