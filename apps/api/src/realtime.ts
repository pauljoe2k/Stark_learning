import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import type { Server as HttpServer } from 'node:http';
import type { ClientToServerEvents, ServerToClientEvents, SocketEventPayload, WorkerSocketMessage } from '@pinpoint/shared';
import { socketEventSchemas } from '@pinpoint/shared';
import { AuthService } from './services/auth.service.js';
import { logger } from './logger.js';
import { parseWorkerSocketMessage, publishWorkerSocketMessage, SOCKET_EVENT_CHANNEL } from './services/redis-events.js';

type RedisClient = ReturnType<typeof createClient>;

export interface Realtime {
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  publisher: RedisClient;
  subscriber: RedisClient;
  publish(message: WorkerSocketMessage): Promise<void>;
  close(): Promise<void>;
}

export async function createRealtime(
  server: HttpServer,
  redisUrl: string,
  authService: AuthService,
  webOrigin: string,
): Promise<Realtime> {
  const publisher = createClient({ url: redisUrl });
  const subscriber = publisher.duplicate();
  const eventSubscriber = publisher.duplicate();
  publisher.on('error', (error) => logger.error({ err: error }, 'Socket Redis publisher error'));
  subscriber.on('error', (error) => logger.error({ err: error }, 'Socket Redis subscriber error'));
  eventSubscriber.on('error', (error) => logger.error({ err: error }, 'Socket event subscriber error'));
  await Promise.all([publisher.connect(), subscriber.connect(), eventSubscriber.connect()]);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: { origin: webOrigin, methods: ['GET', 'POST'] },
  });
  io.adapter(createAdapter(publisher, subscriber));
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (typeof token !== 'string') throw new Error('Missing access token.');
      socket.data.userId = authService.verifyToken(token);
      next();
    } catch {
      next(new Error('Authentication required.'));
    }
  });
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    logger.info({ userId }, 'Authenticated socket connected');
  });
  await eventSubscriber.subscribe(SOCKET_EVENT_CHANNEL, (raw) => {
    const message = parseWorkerSocketMessage(raw);
    if (!message) return;
    switch (message.event) {
      case 'file:processing':
        emitUserEvent(io, message.userId, message.event, message.payload);
        break;
      case 'file:progress':
        emitUserEvent(io, message.userId, message.event, message.payload);
        break;
      case 'file:done':
        emitUserEvent(io, message.userId, message.event, message.payload);
        break;
      case 'file:error':
        emitUserEvent(io, message.userId, message.event, message.payload);
        break;
    }
  });

  return {
    io,
    publisher,
    subscriber,
    publish: async (message) => {
      await publishWorkerSocketMessage(publisher.publish.bind(publisher), message);
    },
    async close() {
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await Promise.all([publisher.quit(), subscriber.quit(), eventSubscriber.quit()]);
    },
  };
}

type UserEventArgs = {
  [K in keyof ServerToClientEvents]: [userId: number, event: K, payload: SocketEventPayload<K>];
}[keyof ServerToClientEvents];

export function emitUserEvent(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  ...args: UserEventArgs
): void {
  const [userId, event, payload] = args;
  const room = io.to(`user:${userId}`);
  switch (event) {
    case 'file:processing':
      room.emit(event, socketEventSchemas[event].parse(payload));
      break;
    case 'file:progress':
      room.emit(event, socketEventSchemas[event].parse(payload));
      break;
    case 'file:done':
      room.emit(event, socketEventSchemas[event].parse(payload));
      break;
    case 'file:error':
      room.emit(event, socketEventSchemas[event].parse(payload));
      break;
    case 'explain:analyzing':
      room.emit(event, socketEventSchemas[event].parse(payload));
      break;
    case 'explain:result':
      room.emit(event, socketEventSchemas[event].parse(payload));
      break;
    case 'explain:transcript':
      room.emit(event, socketEventSchemas[event].parse(payload));
      break;
    case 'recall:start':
      room.emit(event, socketEventSchemas[event].parse(payload));
      break;
    case 'recall:flagResult':
      room.emit(event, socketEventSchemas[event].parse(payload));
      break;
    case 'recall:finished':
      room.emit(event, socketEventSchemas[event].parse(payload));
      break;
    case 'recall:state':
      room.emit(event, socketEventSchemas[event].parse(payload));
      break;
    case 'dashboard:updated':
      room.emit(event, socketEventSchemas[event].parse(payload));
      break;
  }
}
