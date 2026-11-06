import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { GoogleGenAI } from '@google/genai';
import { GeminiExtractionService } from '../src/services/gemini-extraction.js';

function serviceWithResponses(responses: string[]) {
  let calls = 0;
  const client = {
    models: {
      generateContent: async () => ({ text: responses[calls++] }),
    },
  } as unknown as GoogleGenAI;
  return { service: new GeminiExtractionService('test-key', 'test-model', client), calls: () => calls };
}

const validExtraction = JSON.stringify({
  title: 'Cell biology',
  notes: 'A short summary.',
  keyPoints: ['One', 'Two', 'Three', 'Four', 'Five'],
});

test('extraction validates and returns a mocked Gemini response', async () => {
  const { service, calls } = serviceWithResponses([validExtraction]);
  const result = await service.extract(Buffer.from('sample PDF bytes'), 'application/pdf');
  assert.equal(result.keyPoints.length, 5);
  assert.equal(calls(), 1);
});

test('malformed Gemini JSON is retried once before a clear failure', async () => {
  const { service, calls } = serviceWithResponses(['{', '{']);
  await assert.rejects(service.extract(Buffer.from('sample'), 'image/png'), {
    code: 'INVALID_GEMINI_RESPONSE',
  });
  assert.equal(calls(), 2);
});

test('missing Gemini API key fails explicitly without making a network request', async () => {
  const service = new GeminiExtractionService('', 'test-model');
  await assert.rejects(service.extract(Buffer.from('sample'), 'image/jpeg'), {
    code: 'GEMINI_NOT_CONFIGURED',
  });
});
