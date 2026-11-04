import { workerSocketMessageSchema, type WorkerSocketMessage } from '@pinpoint/shared';
import { logger } from '../logger.js';

export const SOCKET_EVENT_CHANNEL = 'pinpoint:socket-events';

export async function publishWorkerSocketMessage(
  publish: (channel: string, value: string) => Promise<unknown>,
  message: WorkerSocketMessage,
): Promise<void> {
  const validated = workerSocketMessageSchema.parse(message);
  await publish(SOCKET_EVENT_CHANNEL, JSON.stringify(validated));
}

export function parseWorkerSocketMessage(raw: string): WorkerSocketMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    logger.warn('Discarded malformed internal socket event JSON.');
    return null;
  }
  const parsed = workerSocketMessageSchema.safeParse(value);
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, 'Discarded invalid internal socket event.');
    return null;
  }
  return parsed.data;
}
