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

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{
          role: 'user',
          parts: [
            { text: extractionPrompt },
            { inlineData: { mimeType: mediaType, data: bytes.toString('base64') } },
          ],
        }],
        config: { responseMimeType: 'application/json' },
      });

      try {
        const content = response.text;
        if (!content) throw new Error('Gemini returned an empty response.');
        return extractionResultSchema.parse(JSON.parse(content));
      } catch {
        if (attempt === 1) break;
      }
    }

    throw new HttpError(
      502,
      'Document extraction returned invalid data twice. Try the upload again.',
      'INVALID_GEMINI_RESPONSE',
    );
  }
}
