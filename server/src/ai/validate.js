import { z } from 'zod';

export const keyPointSchema = z.object({
  id: z.number().int().positive(),
  text: z.string().trim().min(1).max(500),
});

export const extractionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(8000),
  keyPoints: z.array(keyPointSchema).min(5).max(8),
});

export const explanationSchema = z.object({
  summary: z.string().trim().min(1).max(1000),
  points: z.array(z.object({
    id: z.number().int().positive(),
    status: z.enum(['covered', 'partial', 'incorrect', 'missing']),
    evidence: z.string().max(500).optional().default(''),
    feedback: z.string().trim().min(1).max(500),
  })).min(1),
  next_focus: z.array(z.number().int().positive()).max(2),
});