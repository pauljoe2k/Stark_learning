import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { HttpError } from '../errors.js';

const recallCheckSchema = z.object({
  correct: z.boolean(),
  feedback: z.string().trim().min(1).max(500),
}).strict();

export interface RecallCheckInput {
  flagTitle: string;
  flagNote: string | null;
  topicTitle: string | null;
  keyPoint: string | null;
  transcript: string;
}

export interface RecallChecker {
  check(input: RecallCheckInput): Promise<z.infer<typeof recallCheckSchema>>;
}

export class GeminiRecallChecker implements RecallChecker {
  private readonly client?: GoogleGenAI;

  constructor(apiKey: string, private readonly model: string) {
    if (apiKey) this.client = new GoogleGenAI({ apiKey });
  }

  async check(input: RecallCheckInput): Promise<z.infer<typeof recallCheckSchema>> {
    if (!this.client) {
      throw new HttpError(503, 'Voice answer checking is unavailable because Gemini is not configured.', 'GEMINI_NOT_CONFIGURED');
    }
    const prompt = [
      'Check whether a student voice transcription accurately recalls the supplied idea.',
      'Judge meaning rather than exact wording. Be encouraging but do not count vague or unrelated answers as correct.',
      'Use only the supplied flag, note, topic and key point. Do not invent facts or ask for personal information.',
      'Return JSON only with exactly this shape: {"correct":true,"feedback":"Short helpful feedback."}.',
      JSON.stringify(input),
    ].join('\n');

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      });
      try {
        const text = response.text;
        if (!text) throw new Error('Gemini returned an empty response.');
        return recallCheckSchema.parse(JSON.parse(text) as unknown);
      } catch {
        if (attempt === 1) break;
      }
    }
    throw new HttpError(502, 'Voice answer checking returned invalid data twice.', 'INVALID_GEMINI_RESPONSE');
  }
}
