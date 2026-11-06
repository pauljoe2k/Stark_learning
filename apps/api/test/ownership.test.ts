import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { OwnershipRepository } from '../src/repositories/ownership.repository.js';
import { PrismaExplanationsRepository } from '../src/repositories/explanations.repository.js';
import { PrismaTopicsRepository } from '../src/repositories/topics.repository.js';
import { PrismaPlacesRepository } from '../src/repositories/places.repository.js';
import { PrismaRecallRepository } from '../src/repositories/recall.repository.js';
import { PlacesService } from '../src/services/places.service.js';
import { UploadStorage } from '../src/services/upload-storage.js';

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
    const explanationsRepository = new PrismaExplanationsRepository(prisma);
    const topicsRepository = new PrismaTopicsRepository(prisma);
    const placesRepository = new PrismaPlacesRepository(prisma);
    const recallRepository = new PrismaRecallRepository(prisma);
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
    assert.equal(await explanationsRepository.findTopicForExplain(userB.id, topic.id), null);
    assert.equal(await explanationsRepository.createForTopic(userB.id, {
      topicId: topic.id,
      transcript: 'This explanation belongs to another account.',
      durationSec: 60,
      score: 100,
      points: [],
      summary: 'private result',
      nextFocus: [],
    }), null);

    const linkedTopic = await prisma.topic.create({
      data: {
        userId: userB.id,
        title: 'B private topic',
        keyPointsJson: [{ id: 1, text: 'Private point' }],
      },
    });
    assert.equal(await topicsRepository.updateTopic(userB.id, topic.id, { title: 'Changed by B' }), null);
    assert.equal(await topicsRepository.getTopicFileStats(userB.id, topic.id), null);
    assert.equal((await topicsRepository.deleteTopicFile(userB.id, topic.id, topicFile.id)).count, 0);
    assert.equal(await topicsRepository.findTopicFile(userB.id, topic.id, topicFile.id), null);

    assert.equal(await placesRepository.renamePlace(userB.id, place.id, 'Changed by B'), null);
    assert.equal((await placesRepository.deletePlace(userB.id, place.id)).count, 0);
    assert.equal(await placesRepository.findOwnedFlag(userB.id, flag.id), null);
    assert.equal(await placesRepository.updateFlag(userB.id, flag.id, { title: 'Changed by B' }), null);
    assert.equal((await placesRepository.deleteFlag(userB.id, flag.id)).count, 0);
    assert.equal(await placesRepository.createShare(userB.id, place.id, `hash-${marker}`), null);
    assert.equal((await recallRepository.finishRound(userB.id, round.id)).count, 0);
    assert.equal(await recallRepository.recordResult(userB.id, {
      roundId: round.id,
      placeId: place.id,
      flagId: flag.id,
      result: 'green',
      secondsTaken: 1,
    }), null);
    assert.deepEqual(await recallRepository.offlineReview(userB.id), []);
    const reviewRound = await prisma.recallRound.create({
      data: { userId: userA.id, placeId: place.id, timeLimitSec: 30 },
    });
    const recordedReview = await recallRepository.recordResult(userA.id, {
      roundId: reviewRound.id,
      placeId: place.id,
      flagId: flag.id,
      result: 'green',
      secondsTaken: 8,
      gradingSource: 'self',
    });
    assert.ok(recordedReview);
    const scheduledFlag = await prisma.flag.findUnique({ where: { id: flag.id } });
    assert.ok(scheduledFlag?.reviewIntervalDays && scheduledFlag.reviewIntervalDays > 0);
    assert.ok(scheduledFlag?.nextReviewAt && scheduledFlag.nextReviewAt > new Date());

    const placesService = new PlacesService({
      repository: placesRepository,
      storage: new UploadStorage({
        provider: 'local',
        uploadsDirectory: 'unused',
        publicUrl: 'http://localhost:4100',
        cloudinary: { cloudName: '', apiKey: '', apiSecret: '' },
      }),
      publish: async () => undefined,
    });
    await assert.rejects(placesService.createFlag(userB.id, {
      placeId: place.id, x: 10, y: 20, title: 'B cannot add here',
    }), { code: 'PLACE_NOT_FOUND' });
    await assert.rejects(placesService.createFlag(userA.id, {
      placeId: place.id, topicId: linkedTopic.id, keyPointId: 1,
      x: 10, y: 20, title: 'A cannot link B topic',
    }), { code: 'TOPIC_NOT_FOUND' });
    await assert.rejects(placesService.updateFlag(userA.id, flag.id, {
      topicId: linkedTopic.id, keyPointId: 1,
    }), { code: 'TOPIC_NOT_FOUND' });
    assert.equal((await prisma.topic.findUnique({ where: { id: topic.id } }))?.title, 'Private topic');
    assert.equal((await prisma.place.findUnique({ where: { id: place.id } }))?.name, 'Private place');
    assert.equal((await prisma.flag.findUnique({ where: { id: flag.id } }))?.title, 'Private flag');

    const firstShareToken = await placesService.createShare(userA.id, place.id);
    assert.equal(firstShareToken.length, 64);
    const firstShare = await prisma.placeShare.findUnique({
      where: { tokenHash: createHash('sha256').update(firstShareToken).digest('hex') },
    });
    assert.ok(firstShare);
    assert.notEqual(firstShare.tokenHash, firstShareToken);

    const secondShareToken = await placesService.createShare(userA.id, place.id);
    const rotatedShare = await prisma.placeShare.findUnique({ where: { id: firstShare.id } });
    assert.ok(rotatedShare?.revokedAt);
    await assert.rejects(placesService.getShared(firstShareToken), { code: 'SHARE_NOT_FOUND' });

    const sharedPlace = await placesService.getShared(secondShareToken);
    assert.deepEqual(Object.keys(sharedPlace).sort(), ['flags', 'id', 'imageUrl', 'name']);
    assert.deepEqual(Object.keys(sharedPlace.flags[0] ?? {}).sort(), ['emoji', 'id', 'note', 'title', 'x', 'y']);
    assert.equal(JSON.stringify(sharedPlace).includes('Private topic'), false);

    await placesService.revokeShare(userA.id, place.id);
    assert.deepEqual(await placesService.shareStatus(userA.id, place.id), { active: false });
    await assert.rejects(placesService.getShared(secondShareToken), { code: 'SHARE_NOT_FOUND' });
    await assert.rejects(placesService.getShared('a'.repeat(64)), { code: 'SHARE_NOT_FOUND' });
  } finally {
    const userIds = [userAId, userBId].filter((id): id is number => id !== undefined);
    if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }
});
