import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore } from '../src/services/scoring.js';
import { daysUntil, countdownTone } from '../src/services/countdown.js';
import { buildTopicTasks } from '../src/services/tasks.js';
import { fallbackAnalysis } from '../src/ai/keywordFallback.js';
import { extractionSchema } from '../src/ai/validate.js';

test('explanation scoring uses covered, partial, incorrect and missing weights', () => {
  assert.equal(calculateScore([
    { status: 'covered' },
    { status: 'partial' },
    { status: 'incorrect' },
    { status: 'missing' },
  ]), 38);
  assert.throws(() => calculateScore([]), /At least one/);
});

test('exam countdown uses calendar days and urgency thresholds', () => {
  const now = new Date('2026-11-04T20:00:00.000Z');
  assert.equal(daysUntil(new Date('2026-11-05T00:01:00.000Z'), now), 1);
  assert.equal(daysUntil(new Date('2026-11-20T00:00:00.000Z'), now), 16);
  assert.equal(countdownTone(30), 'calm');
  assert.equal(countdownTone(10), 'amber');
  assert.equal(countdownTone(2), 'red');
});

test('dashboard tasks reflect material, score, linked flags and a mostly-green recall', () => {
  const topic = {
    id: 1,
    title: 'Cell biology',
    topicFiles: [{}],
    explanations: [{ score: 75 }],
    flags: [{ topicId: 1 }],
  };
  const rounds = [{ results: [
    { flag: { topicId: 1 }, result: 'green' },
    { flag: { topicId: 1 }, result: 'red' },
    { flag: { topicId: 1 }, result: 'green' },
  ] }];
  const tasks = buildTopicTasks([topic], rounds, 70)[0].tasks;
  assert.deepEqual(tasks.map((task) => task.done), [true, true, true, true]);
});

test('keyword fallback returns one result per point and identifies gaps', () => {
  const result = fallbackAnalysis([
    { id: 1, text: 'Chlorophyll absorbs sunlight in the chloroplast.' },
    { id: 2, text: 'The Calvin cycle fixes carbon dioxide into glucose.' },
  ], 'Chlorophyll absorbs sunlight in the chloroplast.');
  assert.equal(result.points.length, 2);
  assert.equal(result.points[0].status, 'covered');
  assert.equal(result.points[1].status, 'missing');
  assert.deepEqual(result.next_focus, [2]);
});

test('extraction schema accepts five numeric-keyed points and rejects fewer', () => {
  const valid = {
    title: 'Photosynthesis',
    notes: 'Plants convert light into chemical energy.',
    keyPoints: Array.from({ length: 5 }, (_, index) => ({ id: index + 1, text: `Idea ${index + 1}` })),
  };
  assert.equal(extractionSchema.parse(valid).keyPoints.length, 5);
  assert.throws(() => extractionSchema.parse({ ...valid, keyPoints: valid.keyPoints.slice(0, 4) }));
});
