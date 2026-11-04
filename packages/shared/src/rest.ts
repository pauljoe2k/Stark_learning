import { z } from 'zod';

export const positiveIdSchema = z.coerce.number().int().positive();
export const idParamsSchema = z.object({ id: positiveIdSchema }).strict();
export const roundIdParamsSchema = z.object({ roundId: positiveIdSchema }).strict();

export const signupBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
}).strict();

export const loginBodySchema = z.object({
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();

export const createUnitBodySchema = z.object({
  title: z.string().trim().min(1).max(120),
}).strict();

export const createTopicBodySchema = z.object({
  unitId: positiveIdSchema.optional(),
  title: z.string().trim().min(1).max(160),
  notes: z.string().max(20_000).default(''),
  keyPoints: z.array(z.object({
    id: positiveIdSchema,
    text: z.string().trim().min(1).max(1000),
  }).strict()).max(30).default([]),
}).strict();

export const topicFileParamsSchema = z.object({ id: positiveIdSchema }).strict();
export const explainBodySchema = z.object({
  transcript: z.string().trim().min(1).max(20_000),
  durationSec: z.union([z.literal(60), z.literal(120), z.literal(180), z.literal(300)]),
}).strict();

export const createPlaceBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  imageUrl: z.string().url().max(2048),
}).strict();

export const createFlagBodySchema = z.object({
  placeId: positiveIdSchema,
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  title: z.string().trim().min(1).max(120),
  note: z.string().max(2000).optional(),
  emoji: z.string().max(8).optional(),
  topicId: positiveIdSchema.optional(),
  keyPointId: positiveIdSchema.optional(),
}).strict();

export const updateFlagBodySchema = createFlagBodySchema.partial().extend({
  placeId: z.never().optional(),
}).strict();

export const startRecallBodySchema = z.object({
  timeLimitSec: z.number().int().min(5).max(300),
}).strict();

export const recallResultBodySchema = z.object({
  flagId: positiveIdSchema,
  result: z.enum(['green', 'red']),
  secondsTaken: z.number().int().min(0).max(300),
}).strict();

export const createExamBodySchema = z.object({
  unitId: positiveIdSchema.optional(),
  title: z.string().trim().min(1).max(160),
  examDate: z.string().datetime(),
}).strict();

export type SignupBody = z.infer<typeof signupBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type CreateUnitBody = z.infer<typeof createUnitBodySchema>;
export type CreateTopicBody = z.infer<typeof createTopicBodySchema>;
export type ExplainBody = z.infer<typeof explainBodySchema>;
export type CreatePlaceBody = z.infer<typeof createPlaceBodySchema>;
export type CreateFlagBody = z.infer<typeof createFlagBodySchema>;
export type UpdateFlagBody = z.infer<typeof updateFlagBodySchema>;
export type StartRecallBody = z.infer<typeof startRecallBodySchema>;
export type RecallResultBody = z.infer<typeof recallResultBodySchema>;
export type CreateExamBody = z.infer<typeof createExamBodySchema>;
