import { GoogleGenAI } from '@google/genai';
import { extractionResultSchema, type ExtractionResult } from '@pinpoint/shared';
import { HttpError } from '../errors.js';
import type { SupportedMediaType } from './upload-validation.js';

const extractionPrompt = [
  'Study the attached learning material and return JSON only.',
  'Do not include student/account details or invent facts not supported by the material.',
  'Return exactly this shape: {"title":"...","notes":"...","keyPoints":["..."]}.',
  'Write a concise title and short notes summary.',
  'Include 5 to 8 distinct, concise, testable key points, each grounded in the uploaded material.',
].join(' ');

const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
];

export class GeminiExtractionService {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly client = apiKey ? new GoogleGenAI({ apiKey }) : undefined,
  ) {}

  async extract(bytes: Buffer, mediaType: SupportedMediaType): Promise<ExtractionResult> {
    if (!this.client) {
      throw new HttpError(503, 'Document extraction needs a GEMINI_API_KEY in apps/api/.env.', 'GEMINI_NOT_CONFIGURED');
    }

    const models = Array.from(new Set([this.model, ...FALLBACK_MODELS].filter(Boolean)));
    let lastError: unknown;

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await this.client.models.generateContent({
            model,
            contents: [{
              role: 'user',
              parts: [
                { text: extractionPrompt },
                { inlineData: { mimeType: mediaType, data: bytes.toString('base64') } },
              ],
            }],
            config: { responseMimeType: 'application/json' },
          });

          const content = response.text;
          if (!content) throw new Error('Gemini returned an empty response.');
          const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          return extractionResultSchema.parse(JSON.parse(cleaned));
        } catch (error) {
          lastError = error;
          if (attempt === 1) break;
        }
      }
    }

    throw new HttpError(
      502,
      lastError instanceof Error ? lastError.message : 'Document extraction returned invalid data. Try the upload again.',
      'INVALID_GEMINI_RESPONSE',
    );
  }
}
