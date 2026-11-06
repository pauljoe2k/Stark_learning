import { z } from 'zod';
import { extractionResultSchema } from './rest.js';

const id = z.number().int().positive();
const percent = z.number().int().min(0).max(100);
const keyPointResult = z.object({
  keyPointId: id,
  status: z.enum(['covered', 'partial', 'incorrect', 'missing']),
  evidence: z.string().max(500),
  feedback: z.string().max(1000),
}).strict();

export const socketEventSchemas = {
  'file:processing': z.object({ fileId: id, topicId: id }).strict(),
  'file:progress': z.object({
    fileId: id,
    stage: z.enum(['validating', 'extracting', 'saving']),
    percent,
  }).strict(),
  'file:done': z.object({
    fileId: id,
    topicId: id,
    extraction: extractionResultSchema,
    keyPoints: z.array(z.object({ id, text: z.string().min(1).max(1000) }).strict()).min(5).max(8),
  }).strict(),
  'file:error': z.object({ fileId: id, message: z.string().min(1).max(500) }).strict(),
  'explain:analyzing': z.object({ topicId: id }).strict(),
  'explain:result': z.object({
    topicId: id,
    index: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    point: keyPointResult,
    score: z.number().min(0).max(100).optional(),
    summary: z.string().max(1000).optional(),
    nextFocus: z.array(id).max(2).optional(),
  }).strict(),
  'explain:transcript': z.object({ topicId: id, transcript: z.string().max(20_000) }).strict(),
  'recall:start': z.object({
    roundId: id,
    placeId: id,
    flagIds: z.array(id).min(1).max(100),
    startedAt: z.string().datetime(),
    timeLimitSec: z.number().int().min(5).max(300),
  }).strict(),
  'recall:flagResult': z.object({
    roundId: id,
    flagId: id,
    result: z.enum(['green', 'red']),
    secondsTaken: z.number().int().min(0).max(300),
  }).strict(),
  'recall:finished': z.object({
    roundId: id,
    green: z.number().int().nonnegative(),
    red: z.number().int().nonnegative(),
    total: z.number().int().positive(),
  }).strict(),
  'recall:state': z.object({
    roundId: id,
    placeId: id,
    timeLimitSec: z.number().int().min(5).max(300),
    startedAt: z.string().datetime(),
    flagIds: z.array(id),
    results: z.array(z.object({
      flagId: id,
      result: z.enum(['green', 'red']),
      secondsTaken: z.number().int().min(0).max(300),
    }).strict()),
    finishedAt: z.string().datetime().nullable(),
  }).strict(),
  'recall:resume': z.object({ roundId: id }).strict(),
  'dashboard:updated': z.object({
    reason: z.enum(['topic', 'explanation', 'place', 'recall', 'exam']),
    occurredAt: z.string().datetime(),
  }).strict(),
} as const;

export type SocketEventSchemas = typeof socketEventSchemas;
export type SocketEventName = keyof SocketEventSchemas;
export type SocketEventPayload<K extends SocketEventName> = z.infer<SocketEventSchemas[K]>;

export interface ServerToClientEvents {
  'file:processing': (payload: SocketEventPayload<'file:processing'>) => void;
  'file:progress': (payload: SocketEventPayload<'file:progress'>) => void;
  'file:done': (payload: SocketEventPayload<'file:done'>) => void;
  'file:error': (payload: SocketEventPayload<'file:error'>) => void;
  'explain:analyzing': (payload: SocketEventPayload<'explain:analyzing'>) => void;
  'explain:result': (payload: SocketEventPayload<'explain:result'>) => void;
  'explain:transcript': (payload: SocketEventPayload<'explain:transcript'>) => void;
  'recall:start': (payload: SocketEventPayload<'recall:start'>) => void;
  'recall:flagResult': (payload: SocketEventPayload<'recall:flagResult'>) => void;
  'recall:finished': (payload: SocketEventPayload<'recall:finished'>) => void;
  'recall:state': (payload: SocketEventPayload<'recall:state'>) => void;
  'dashboard:updated': (payload: SocketEventPayload<'dashboard:updated'>) => void;
}

export interface ClientToServerEvents {
  'recall:resume': (payload: SocketEventPayload<'recall:resume'>) => void;
}

export const workerSocketMessageSchema = z.discriminatedUnion('event', [
  z.object({ userId: id, event: z.literal('file:processing'), payload: socketEventSchemas['file:processing'] }).strict(),
  z.object({ userId: id, event: z.literal('file:progress'), payload: socketEventSchemas['file:progress'] }).strict(),
  z.object({ userId: id, event: z.literal('file:done'), payload: socketEventSchemas['file:done'] }).strict(),
  z.object({ userId: id, event: z.literal('file:error'), payload: socketEventSchemas['file:error'] }).strict(),
  z.object({ userId: id, event: z.literal('explain:analyzing'), payload: socketEventSchemas['explain:analyzing'] }).strict(),
  z.object({ userId: id, event: z.literal('explain:result'), payload: socketEventSchemas['explain:result'] }).strict(),
  z.object({ userId: id, event: z.literal('dashboard:updated'), payload: socketEventSchemas['dashboard:updated'] }).strict(),
]);

export type WorkerSocketMessage = z.infer<typeof workerSocketMessageSchema>;
