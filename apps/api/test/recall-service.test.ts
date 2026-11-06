import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PrismaRecallRepository } from '../src/repositories/recall.repository.js';
import { RecallService } from '../src/services/recall.service.js';

function createRecallFixture() {
  const flag = {
    id: 21,
    x: 25,
    y: 75,
    title: 'Mitochondria',
    note: 'Produces cellular energy.',
    emoji: '🔋',
    keyPointId: 5,
    topic: { title: 'Cell biology', notes: '', keyPointsJson: [{ id: 5, text: 'Mitochondria produce energy' }] },
  };
  const place = { id: 11, name: 'Kitchen', imageUrl: 'https://example.test/kitchen.jpg', flags: [flag] };
  const records: Array<Record<string, unknown>> = [];
  let finishedAt: Date | null = null;
  const repository = {
    listPlacesWithFlags: async () => [place],
    createRound: async (_userId: number, placeId: number, timeLimitSec: number, speedMode: boolean) => ({
      id: 31, placeId, timeLimitSec, speedMode,
    }),
    findRound: async (userId: number, roundId: number) => userId === 7 && roundId === 31 ? ({
      id: 31,
      placeId: 11,
      timeLimitSec: 30,
      speedMode: false,
      finishedAt,
      place,
      results: records,
    }) : null,
    recordResult: async (_userId: number, input: Record<string, unknown>) => {
      const saved = { ...input };
      records.push(saved);
      return saved;
    },
    finishRound: async () => {
      finishedAt = new Date();
      return { count: 1 };
    },
    offlineReview: async () => [{ id: 11, name: 'Kitchen', flags: [{ id: 21, title: 'Mitochondria', note: 'Energy', emoji: '🔋' }] }],
  } as unknown as PrismaRecallRepository;
  const checkerInputs: unknown[] = [];
  const service = new RecallService({
    repository,
    checker: {
      check: async (input) => {
        checkerInputs.push(input);
        return { correct: true, feedback: 'Correct.' };
      },
    },
    random: () => 0,
  });
  return { service, records, checkerInputs, place };
}

test('Recall start chooses an owned place and does not return answer text', async () => {
  const { service } = createRecallFixture();
  const round = await service.start(7, 30, false);
  assert.equal(round.roundId, 31);
  assert.deepEqual(round.flags, [{ id: 21, x: 25, y: 75 }]);
  assert.equal(JSON.stringify(round).includes('Mitochondria'), false);
});

test('Recall reveal returns answer only after explicit request and checks round membership', async () => {
  const { service } = createRecallFixture();
  assert.deepEqual(await service.reveal(7, 31, 21), {
    id: 21,
    title: 'Mitochondria',
    note: 'Produces cellular energy.',
    emoji: '🔋',
    timeLimitSec: 30,
  });
  await assert.rejects(service.reveal(8, 31, 21), { code: 'ROUND_NOT_FOUND' });
  await assert.rejects(service.reveal(7, 31, 99), { code: 'FLAG_NOT_FOUND' });
});

test('self-grading records a result, and duplicate or finished flags cannot be graded again', async () => {
  const { service, records } = createRecallFixture();
  assert.deepEqual(await service.answerBySelfGrade(7, {
    roundId: 31, flagId: 21, result: 'green', secondsTaken: 10,
  }), { flagId: 21, result: 'green', secondsTaken: 10 });
  assert.equal(records[0]?.gradingSource, 'self');
  await assert.rejects(service.reveal(7, 31, 21), { code: 'FLAG_ALREADY_RECORDED' });
});

test('late self-grade counts as missed and voice grading uses the mocked checker', async () => {
  const late = createRecallFixture();
  const lateResult = await late.service.answerBySelfGrade(7, {
    roundId: 31, flagId: 21, result: 'green', secondsTaken: 31,
  });
  assert.equal(lateResult.result, 'red');

  const voice = createRecallFixture();
  const voiceResult = await voice.service.answerByVoice(7, {
    roundId: 31, flagId: 21, transcript: 'Mitochondria produce energy', secondsTaken: 12,
  });
  assert.equal(voiceResult.result, 'green');
  assert.deepEqual(voice.checkerInputs, [{
    flagTitle: 'Mitochondria',
    flagNote: 'Produces cellular energy.',
    topicTitle: 'Cell biology',
    keyPoint: 'Mitochondria produce energy',
    transcript: 'Mitochondria produce energy',
  }]);
  assert.equal(voice.records[0]?.gradingSource, 'ai');
});

test('finishing a round records unanswered flags as timeout misses; offline snapshot is scoped', async () => {
  const { service, records } = createRecallFixture();
  const snapshot = await service.offlineReview(7);
  assert.deepEqual(snapshot[0]?.flags[0], { id: 21, title: 'Mitochondria', note: 'Energy', emoji: '🔋' });
  const completion = await service.finish(7, 31);
  assert.equal(records[0]?.result, 'red');
  assert.equal(records[0]?.gradingSource, 'timeout');
  assert.deepEqual(completion.summary, { green: 0, red: 1 });
  await assert.rejects(service.finish(8, 31), { code: 'ROUND_NOT_FOUND' });
});
