import { createHash } from 'node:crypto';
import { extractionSchema, explanationSchema } from './validate.js';

const cache = new Map();
const cacheTtlMs = 5 * 60 * 1000;

const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
];

async function callGemini(model, prompt, file) {
  const parts = [{ text: prompt }];
  if (file) parts.push({ inlineData: { mimeType: file.mimetype, data: file.buffer.toString('base64') } });
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Gemini returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  let text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
  if (!text) throw new Error('Gemini returned an empty response.');
  text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(text);
}

async function generate(prompt, file) {
  if (!process.env.GEMINI_API_KEY) throw new Error('Gemini is not configured.');
  const configured = (process.env.GEMINI_MODEL || '').trim();
  const models = Array.from(new Set([configured, ...FALLBACK_MODELS].filter(Boolean)));

  let lastError;
  for (const model of models) {
    try {
      return await callGemini(model, prompt, file);
    } catch (error) {
      lastError = error;
      const isQuotaOrAvailability =
        error.status === 429 ||
        error.status === 404 ||
        error.status === 503 ||
        error.message?.includes('quota') ||
        error.message?.includes('high demand') ||
        error.message?.includes('no longer available');

      if (isQuotaOrAvailability) {
        console.warn(`Gemini model "${model}" unavailable (${error.message?.slice(0, 70)}...), trying fallback...`);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function generateValidated(prompt, schema, file) {
  const cacheKey = createHash('sha256')
    .update(prompt)
    .update(file?.buffer ?? Buffer.alloc(0))
    .digest('hex');
  if (process.env.NODE_ENV !== 'production') {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return structuredClone(cached.result);
    if (cached) cache.delete(cacheKey);
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = schema.parse(await generate(prompt, file));
      if (process.env.NODE_ENV !== 'production') {
        cache.set(cacheKey, { result: structuredClone(result), expiresAt: Date.now() + cacheTtlMs });
      }
      return result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function extractMaterial(prompt, file) {
  return generateValidated(prompt, extractionSchema, file);
}

export function analyzeExplanation(prompt) {
  return generateValidated(prompt, explanationSchema);
}

export async function transcribeAudio(audioBuffer, mimetype = 'audio/webm') {
  if (!process.env.GEMINI_API_KEY) throw new Error('Gemini is not configured.');
  const cleanMime = (mimetype || 'audio/webm').split(';')[0].trim().toLowerCase();
  const configured = (process.env.GEMINI_MODEL || '').trim();
  const models = Array.from(new Set([configured, ...FALLBACK_MODELS].filter(Boolean)));
  const prompt = 'Transcribe this audio recording verbatim. Return only the plain spoken text transcript without any commentary, conversational intro/outro, or markdown formatting.';
  const file = { mimetype: cleanMime, buffer: audioBuffer };

  let lastError;
  for (const model of models) {
    try {
      const parts = [{ text: prompt }];
      parts.push({ inlineData: { mimeType: file.mimetype, data: file.buffer.toString('base64') } });
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
          }),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(body?.error?.message || `Gemini returned HTTP ${response.status}.`);
        error.status = response.status;
        throw error;
      }
      const text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
      return text?.trim() || '';
    } catch (error) {
      lastError = error;
      if (error.status === 429 || error.status === 404 || error.status === 503) continue;
      throw error;
    }
  }
  throw lastError;
}