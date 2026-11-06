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

export const updateTopicKeyPointSchema = z.object({
  id: positiveIdSchema.optional(),
  text: z.string().trim().min(1).max(1000),
}).strict();

export const createTopicBodySchema = z.object({
  unitId: positiveIdSchema.optional(),
  title: z.string().trim().min(1).max(160),
  notes: z.string().max(20_000).default(''),
}).strict();

export const updateTopicBodySchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  notes: z.string().max(20_000).optional(),
  keyPoints: z.array(updateTopicKeyPointSchema).min(1).max(30).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one topic field is required.');

export const topicFileParamsSchema = z.object({ id: positiveIdSchema }).strict();
export const topicFileIdParamsSchema = z.object({
  id: positiveIdSchema,
  fileId: positiveIdSchema,
}).strict();
export const explainBodySchema = z.object({
  transcript: z.string().trim().min(1).max(20_000)
    .refine((value) => value.split(/\s+/).filter(Boolean).length >= 15, 'Explain for at least 15 words before submitting.'),
  durationSec: z.union([z.literal(60), z.literal(120), z.literal(180), z.literal(300)]),
}).strict();

export const explainPointResultSchema = z.object({
  keyPointId: positiveIdSchema,
  status: z.enum(['covered', 'partial', 'incorrect', 'missing']),
  evidence: z.string().max(500),
  feedback: z.string().max(1000),
}).strict();

export const explainResultSchema = z.object({
  id: positiveIdSchema,
  topicId: positiveIdSchema,
  transcript: z.string().max(20_000),
  durationSec: z.union([z.literal(60), z.literal(120), z.literal(180), z.literal(300)]),
  score: z.number().int().min(0).max(100),
  points: z.array(explainPointResultSchema).min(1).max(30),
  summary: z.string().max(1000),
  nextFocus: z.array(positiveIdSchema).max(2),
  source: z.enum(['ai', 'keyword']),
  createdAt: z.string().datetime(),
}).strict();

export const extractionResultSchema = z.object({
  title: z.string().trim().min(1).max(160),
  notes: z.string().trim().min(1).max(20_000),
  keyPoints: z.array(z.string().trim().min(1).max(1000)).min(5).max(8),
}).strict();

export const localUploadTicketSchema = z.object({
  uploadToken: z.string().min(20).max(2048),
}).strict();
export const uploadTicketRequestSchema = z.object({}).strict();

export const cloudinaryFinalizeSchema = z.object({
  publicId: z.string().min(1).max(512),
  secureUrl: z.string().url().max(2048),
  resourceType: z.enum(['image', 'raw']).default('image'),
  uploadNonce: z.string().uuid(),
}).strict();

export const createPlaceBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  imageUrl: z.string().url().max(2048),
}).strict();
export const createPlaceUploadBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
}).strict();
export const updatePlaceBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
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
  topicId: positiveIdSchema.nullable().optional(),
  keyPointId: positiveIdSchema.nullable().optional(),
}).strict();

export const startRecallBodySchema = z.object({
  timeLimitSec: z.number().int().min(5).max(600),
  speedMode: z.boolean().default(false),
}).strict();

export const recallResultBodySchema = z.object({
  flagId: positiveIdSchema,
  result: z.enum(['green', 'red']),
  secondsTaken: z.number().int().min(0).max(600),
}).strict();

export const recallVoiceAnswerBodySchema = z.object({
  flagId: positiveIdSchema,
  transcript: z.string().trim().min(1).max(3000),
  secondsTaken: z.number().int().min(0).max(600),
}).strict();

export const reviewFlagBodySchema = z.object({
  grade: z.enum(['correct', 'incorrect']),
}).strict();

export const shareTokenParamsSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
}).strict();

export const createExamBodySchema = z.object({
  unitId: positiveIdSchema.optional(),
  title: z.string().trim().min(1).max(160),
  examDate: z.string().datetime(),
}).strict();

export const topicTasksSchema = z.object({
  addMaterial: z.boolean(),
  explain: z.boolean(),
  pin: z.boolean(),
  recall: z.boolean(),
}).strict();

export const dashboardTopicSchema = z.object({
  topicId: z.number().int(),
  title: z.string(),
  tasks: topicTasksSchema,
}).strict();

export const dashboardResponseSchema = z.object({
  topics: z.array(dashboardTopicSchema),
}).strict();

export type SignupBody = z.infer<typeof signupBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type CreateUnitBody = z.infer<typeof createUnitBodySchema>;
export type CreateTopicBody = z.infer<typeof createTopicBodySchema>;
export type UpdateTopicBody = z.infer<typeof updateTopicBodySchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
export type ExplainBody = z.infer<typeof explainBodySchema>;
export type ExplainResult = z.infer<typeof explainResultSchema>;
export type CreatePlaceBody = z.infer<typeof createPlaceBodySchema>;
export type CreateFlagBody = z.infer<typeof createFlagBodySchema>;
export type UpdateFlagBody = z.infer<typeof updateFlagBodySchema>;
export type StartRecallBody = z.infer<typeof startRecallBodySchema>;
export type RecallResultBody = z.infer<typeof recallResultBodySchema>;
export type RecallVoiceAnswerBody = z.infer<typeof recallVoiceAnswerBodySchema>;
export type CreateExamBody = z.infer<typeof createExamBodySchema>;
export type TopicTasks = z.infer<typeof topicTasksSchema>;
export type DashboardTopic = z.infer<typeof dashboardTopicSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
