import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { OwnershipRepository } from '../src/repositories/ownership.repository.js';

test('database resources are invisible to a different authenticated user', {
  skip: process.env.DATABASE_URL ? false : 'Set DATABASE_URL to run the database ownership integration test.',
}, async () => {
  const prisma = new PrismaClient();
  const marker = randomUUID();
  let userAId: number | undefined;
  let userBId: number | undefined;

  try {
    await prisma.$connect();
    const [userA, userB] = await Promise.all([
      prisma.user.create({ data: { name: 'Owner A', email: `owner-a-${marker}@test.pinpoint`, passwordHash: 'test-hash' } }),
      prisma.user.create({ data: { name: 'Owner B', email: `owner-b-${marker}@test.pinpoint`, passwordHash: 'test-hash' } }),
    ]);
    userAId = userA.id;
    userBId = userB.id;

    const unit = await prisma.unit.create({ data: { userId: userA.id, title: 'Private unit' } });
    const topic = await prisma.topic.create({
      data: { userId: userA.id, unitId: unit.id, title: 'Private topic', keyPointsJson: [] },
    });
    const [topicFile, explanation, place] = await Promise.all([
      prisma.topicFile.create({ data: { topicId: topic.id, fileUrl: 'https://example.test/file.pdf', type: 'application/pdf', pageCount: 1 } }),
      prisma.explanation.create({
        data: { topicId: topic.id, transcript: 'private transcript', durationSec: 60, score: 0, pointsJson: [], summary: '', nextFocus: [] },
      }),
      prisma.place.create({ data: { userId: userA.id, name: 'Private place', imageUrl: 'https://example.test/place.jpg' } }),
    ]);
    const flag = await prisma.flag.create({
      data: { placeId: place.id, x: 50, y: 50, title: 'Private flag' },
    });
    const round = await prisma.recallRound.create({ data: { userId: userA.id, placeId: place.id, timeLimitSec: 30 } });
    const result = await prisma.recallResult.create({
      data: { roundId: round.id, flagId: flag.id, result: 'red', secondsTaken: 30 },
    });
    const exam = await prisma.exam.create({
      data: { userId: userA.id, unitId: unit.id, title: 'Private exam', examDate: new Date() },
    });

    const repository = new OwnershipRepository(prisma);
    const lookups = [
      repository.findUnitForUser(userB.id, unit.id),
      repository.findTopicForUser(userB.id, topic.id),
      repository.findTopicFileForUser(userB.id, topicFile.id),
      repository.findExplanationForUser(userB.id, explanation.id),
      repository.findPlaceForUser(userB.id, place.id),
      repository.findFlagForUser(userB.id, flag.id),
      repository.findRecallRoundForUser(userB.id, round.id),
      repository.findRecallResultForUser(userB.id, result.id),
      repository.findExamForUser(userB.id, exam.id),
    ];
    const inaccessible = await Promise.all(lookups);
    assert.deepEqual(inaccessible, Array.from({ length: 9 }, () => null));
    assert.equal((await repository.findPlaceForUser(userA.id, place.id))?.flags.length, 1);
  } finally {
    const userIds = [userAId, userBId].filter((id): id is number => id !== undefined);
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }
});
