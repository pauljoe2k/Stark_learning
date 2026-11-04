import { z } from 'zod';

export const topicExtractionJobSchema = z.object({
  userId: z.number().int().positive(),
  topicId: z.number().int().positive(),
  fileId: z.number().int().positive(),
  fileUrl: z.string().url().max(2048),
  mediaType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
}).strict();

export type TopicExtractionJob = z.infer<typeof topicExtractionJobSchema>;
