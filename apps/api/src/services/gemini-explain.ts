import { GoogleGenAI } from '@google/genai';
import { HttpError } from '../errors.js';
import {
  explainAnalysisSchema,
  validateAnalysisForKeyPoints,
  type ExplainAnalysis,
  type ExplainAnalysisInput,
} from './explain-analysis.js';

export class GeminiExplainAnalyzer {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly client = apiKey ? new GoogleGenAI({ apiKey }) : undefined,
  ) {}

  async analyze(input: ExplainAnalysisInput): Promise<ExplainAnalysis> {
    if (!this.client) {
      throw new HttpError(503, 'Gemini is not configured; using the keyword-based estimate.', 'GEMINI_NOT_CONFIGURED');
    }

    const content = JSON.stringify({
      topic: input.topicTitle,
      notes: input.notes,
      keyPoints: input.keyPoints,
      transcript: input.transcript,
    });
    const prompt = [
      'Evaluate a student explanation against only the supplied study material and numbered key points.',
      'The transcript may contain speech recognition errors. Judge meaning rather than exact wording.',
      'Do not invent facts or use outside knowledge. Do not infer identity or repeat personal details.',
      'For every key point return its exact keyPointId, status (covered, partial, incorrect, or missing), a short exact evidence quote or empty string, and one sentence of helpful feedback.',
      'Return one concise summary and up to two keyPointIds that are the most important gaps.',
      'Return JSON only with exactly this shape: {"points":[{"keyPointId":1,"status":"covered","evidence":"...","feedback":"..."}],"summary":"...","nextFocus":[1]}.',
      'Study material:',
      content,
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
        return validateAnalysisForKeyPoints(explainAnalysisSchema.parse(JSON.parse(text) as unknown), input.keyPoints);
      } catch {
        if (attempt === 1) break;
      }
    }

    throw new HttpError(
      502,
      'Explain analysis returned invalid data twice; using the keyword-based estimate.',
      'INVALID_GEMINI_RESPONSE',
    );
  }
}
