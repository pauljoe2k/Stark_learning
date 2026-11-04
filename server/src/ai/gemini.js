import { createHash } from 'node:crypto';
import { extractionSchema, explanationSchema } from './validate.js';

const cache = new Map();
const cacheTtlMs = 5 * 60 * 1000;

async function generate(prompt, file) {
  if (!process.env.GEMINI_API_KEY) throw new Error('Gemini is not configured.');
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const parts = [{ text: prompt }];
  if (file) parts.push({ inlineData: { mimeType: file.mimetype, data: file.buffer.toString('base64') } });
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || `Gemini returned HTTP ${response.status}.`);
  const text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
  if (!text) throw new Error('Gemini returned an empty response.');
  return JSON.parse(text);
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