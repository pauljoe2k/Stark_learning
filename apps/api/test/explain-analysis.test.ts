import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';
import { explainBodySchema } from '@pinpoint/shared';
import {
  calculateExplainScore,
  keywordExplain,
  validateAnalysisForKeyPoints,
  type ExplainAnalysis,
} from '../src/services/explain-analysis.js';
import { ExplainService, type ExplanationsRepository } from '../src/services/explain.service.js';

const keyPoints: Prisma.JsonArray = [
  { id: 1, text: 'Mitochondria produce cellular energy' },
  { id: 2, text: 'Ribosomes synthesize proteins' },
  { id: 3, text: 'Nucleus stores genetic information' },
  { id: 4, text: 'Cell membrane controls entry' },
  { id: 5, text: 'Cytoplasm supports chemical reactions' },
];

const transcript = [
  'Mitochondria produce cellular energy for the cell.',
  'Ribosomes synthesize proteins.',
  'The nucleus stores genetic information.',
  'I am explaining the other ideas again in my own words today.',
].join(' ');

function createRepository(): { repository: ExplanationsRepository; saved: () => { score: number } | null } {
  let savedScore: number | null = null;
  const repository: ExplanationsRepository = {
    findTopicForExplain: async () => ({
      id: 12,
      title: 'Cell structure',
      notes: 'Cells contain membrane-bound and other structures.',
      keyPointsJson: keyPoints,
    }),
    createForTopic: async (_userId, input) => {
      savedScore = input.score;
      return {
        id: 40,
        topicId: input.topicId,
        transcript: input.transcript,
        durationSec: input.durationSec,
        score: input.score,
        pointsJson: input.points as Prisma.JsonValue,
        summary: input.summary,
        nextFocus: input.nextFocus as Prisma.JsonValue,
        createdAt: new Date('2026-11-04T12:00:00.000Z'),
      };
    },
  };
  return { repository, saved: () => (savedScore === null ? null : { score: savedScore }) };
}

test('score awards covered=1, partial=0.5, and incorrect or missing=0', () => {
  assert.equal(calculateExplainScore([
    { keyPointId: 1, status: 'covered', evidence: '', feedback: '' },
    { keyPointId: 2, status: 'partial', evidence: '', feedback: '' },
    { keyPointId: 3, status: 'incorrect', evidence: '', feedback: '' },
    { keyPointId: 4, status: 'missing', evidence: '', feedback: '' },
  ]), 38);
  assert.equal(calculateExplainScore([
    { keyPointId: 1, status: 'covered', evidence: '', feedback: '' },
    { keyPointId: 2, status: 'covered', evidence: '', feedback: '' },
    { keyPointId: 3, status: 'covered', evidence: '', feedback: '' },
    { keyPointId: 4, status: 'partial', evidence: '', feedback: '' },
    { keyPointId: 5, status: 'partial', evidence: '', feedback: '' },
  ]), 80);
});

test('Explain requests reject transcripts shorter than fifteen words', () => {
  assert.equal(explainBodySchema.safeParse({ transcript: 'Only a few words here.', durationSec: 60 }).success, false);
  assert.equal(explainBodySchema.safeParse({ transcript, durationSec: 60 }).success, true);
});

test('keyword fallback is grounded in key points and reports uncovered ideas', () => {
  const analysis = keywordExplain({
    topicTitle: 'Cell structure',
    notes: 'Study notes.',
    keyPoints: keyPoints.map((point) => point as { id: number; text: string }),
    transcript,
  });
  assert.deepEqual(analysis.points.map((point) => point.status), ['covered', 'covered', 'covered', 'partial', 'missing']);
  assert.deepEqual(analysis.nextFocus, [4, 5]);
  assert.ok(analysis.points[0]?.evidence.includes('Mitochondria'));
});

test('analysis rejects missing or duplicate key-point results', () => {
  assert.throws(() => validateAnalysisForKeyPoints({
    points: [{ keyPointId: 1, status: 'covered', evidence: '', feedback: '' }],
    summary: '',
    nextFocus: [],
  }, [{ id: 1, text: 'one' }, { id: 2, text: 'two' }]));
});

test('Explain service persists a scored keyword fallback when Gemini is unavailable', async () => {
  const { repository, saved } = createRepository();
  const events: string[] = [];
  const service = new ExplainService({
    repository,
    analyzer: { analyze: async () => { throw new Error('Gemini is unavailable.'); } },
    quota: { consume: async () => true },
    cache: { get: async () => null, set: async () => undefined },
    publish: async (message) => { events.push(message.event); },
    nodeEnv: 'test',
  });

  const result = await service.submit(3, 12, { transcript, durationSec: 60 });
  assert.equal(result.source, 'keyword');
  assert.equal(result.score, 70);
  assert.equal(result.points.length, 5);
  assert.deepEqual(result.nextFocus, [4, 5]);
  assert.deepEqual(saved(), { score: 70 });
  assert.equal(events[0], 'explain:analyzing');
  assert.equal(events.filter((event) => event === 'explain:result').length, 5);
});

test('Explain service caches valid Gemini analysis in development', async () => {
  const { repository } = createRepository();
  const analysis: ExplainAnalysis = {
    points: [
      { keyPointId: 1, status: 'covered', evidence: 'Mitochondria produce energy.', feedback: 'Clear.' },
      { keyPointId: 2, status: 'covered', evidence: 'Ribosomes make proteins.', feedback: 'Clear.' },
      { keyPointId: 3, status: 'covered', evidence: 'The nucleus stores information.', feedback: 'Clear.' },
      { keyPointId: 4, status: 'partial', evidence: 'Cell membrane.', feedback: 'Add how it controls entry.' },
      { keyPointId: 5, status: 'missing', evidence: '', feedback: 'Explain the cytoplasm.' },
    ],
    summary: 'Three key points were covered clearly.',
    nextFocus: [4, 5],
  };
  let analyzed = 0;
  let cached = '';
  const service = new ExplainService({
    repository,
    analyzer: { analyze: async () => { analyzed += 1; return analysis; } },
    quota: { consume: async () => true },
    cache: {
      get: async () => cached || null,
      set: async (_key, value) => { cached = value; },
    },
    nodeEnv: 'development',
  });

  const first = await service.submit(3, 12, { transcript, durationSec: 60 });
  const second = await service.submit(3, 12, { transcript, durationSec: 60 });
  assert.equal(first.source, 'ai');
  assert.equal(first.score, 70);
  assert.equal(second.source, 'ai');
  assert.equal(analyzed, 1);
});

test('Explain service does not analyze a topic that is not owned by the user', async () => {
  const repository: ExplanationsRepository = {
    findTopicForExplain: async () => null,
    createForTopic: async () => null,
  };
  let analyzed = false;
  const service = new ExplainService({
    repository,
    analyzer: { analyze: async () => { analyzed = true; throw new Error('Should not run.'); } },
    quota: { consume: async () => true },
    cache: { get: async () => null, set: async () => undefined },
    nodeEnv: 'test',
  });

  await assert.rejects(service.submit(8, 12, { transcript, durationSec: 60 }), { status: 404 });
  assert.equal(analyzed, false);
});
