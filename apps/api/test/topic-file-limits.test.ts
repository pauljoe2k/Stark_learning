import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaTopicsRepository } from '../src/repositories/topics.repository.js';

test('concurrent topic uploads cannot exceed the two-page limit', {
  skip: process.env.DATABASE_URL ? false : 'Set DATABASE_URL to run the database upload-limit test.',
}, async () => {
  const prisma = new PrismaClient();
  const repository = new PrismaTopicsRepository(prisma);
  const marker = randomUUID();
  let userId: number | undefined;

  try {
    await prisma.$connect();
    const user = await prisma.user.create({
      data: { name: 'Upload Limit', email: `upload-limit-${marker}@test.pinpoint`, passwordHash: 'test-hash' },
    });
    userId = user.id;
    const topic = await prisma.topic.create({
      data: { userId: user.id, title: 'Two-page limit', keyPointsJson: [] },
    });

    const results = await Promise.all([
      repository.createTopicFileWithinLimits(user.id, {
        topicId: topic.id,
        fileUrl: `https://example.test/${marker}-two-pages.pdf`,
        type: 'application/pdf',
        pageCount: 2,
      }),
      repository.createTopicFileWithinLimits(user.id, {
        topicId: topic.id,
        fileUrl: `https://example.test/${marker}-one-page.pdf`,
        type: 'application/pdf',
        pageCount: 1,
      }),
    ]);

    assert.equal(results.filter((result) => result.status === 'created').length, 1);
    assert.equal(results.filter((result) => result.status === 'page_limit').length, 1);
    assert.equal(await prisma.topicFile.count({ where: { topicId: topic.id } }), 1);

    const imageTopic = await prisma.topic.create({
      data: { userId: user.id, title: 'Image limit', keyPointsJson: [] },
    });
    const firstImage = await repository.createTopicFileWithinLimits(user.id, {
      topicId: imageTopic.id,
      fileUrl: `https://example.test/${marker}-one.png`,
      type: 'image/png',
      pageCount: 1,
    });
    const secondImage = await repository.createTopicFileWithinLimits(user.id, {
      topicId: imageTopic.id,
      fileUrl: `https://example.test/${marker}-two.png`,
      type: 'image/png',
      pageCount: 1,
    });
    const thirdImage = await repository.createTopicFileWithinLimits(user.id, {
      topicId: imageTopic.id,
      fileUrl: `https://example.test/${marker}-three.png`,
      type: 'image/png',
      pageCount: 1,
    });
    assert.equal(firstImage.status, 'created');
    assert.equal(secondImage.status, 'created');
    assert.notEqual(thirdImage.status, 'created');
  } finally {
    if (userId !== undefined) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
