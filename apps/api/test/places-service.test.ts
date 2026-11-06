import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaPlacesRepository } from '../src/repositories/places.repository.js';
import { PlacesService } from '../src/services/places.service.js';
import { UploadStorage } from '../src/services/upload-storage.js';

test('database Palace service covers place, flag, review and share lifecycles', {
  skip: process.env.DATABASE_URL ? false : 'Set DATABASE_URL to run the Palace integration test.',
}, async () => {
  const prisma = new PrismaClient();
  const marker = randomUUID();
  const uploadsDirectory = await mkdtemp(join(tmpdir(), 'pinpoint-palace-'));
  let userId: number | undefined;
  const events: Array<{ userId: number; reason: string }> = [];
  const storage = new UploadStorage({
    provider: 'local',
    uploadsDirectory,
    publicUrl: 'http://localhost:4100',
    cloudinary: { cloudName: '', apiKey: '', apiSecret: '' },
  });
  const service = new PlacesService({
    repository: new PrismaPlacesRepository(prisma),
    storage,
    publish: async (message) => {
      events.push({ userId: message.userId, reason: message.payload.reason });
    },
  });

  try {
    await prisma.$connect();
    const user = await prisma.user.create({
      data: { name: 'Palace test', email: `palace-${marker}@test.pinpoint`, passwordHash: 'test-hash' },
    });
    userId = user.id;
    const topic = await prisma.topic.create({
      data: {
        userId: user.id,
        title: 'Private test topic',
        notes: 'Private topic notes must not be shared.',
        keyPointsJson: [{ id: 1, text: 'A linked key point' }],
      },
    });

    await assert.rejects(service.create(user.id, 'Invalid image', {
      buffer: Buffer.from('not an image'),
      mimetype: 'image/png',
    }), { code: 'PLACE_IMAGE_SIGNATURE_MISMATCH' });

    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const place = await service.create(user.id, 'Study room', { buffer: pngSignature, mimetype: 'image/png' });
    assert.equal(place.flagsCount, 0);
    assert.equal((await service.list(user.id)).length, 1);
    assert.equal((await service.get(user.id, place.id)).name, 'Study room');
    assert.ok(events.some((event) => event.userId === user.id && event.reason === 'place'));

    const flag = await service.createFlag(user.id, {
      placeId: place.id,
      x: 25,
      y: 75,
      title: 'Remember this',
      note: 'A small note.',
      topicId: topic.id,
      keyPointId: 1,
    });
    assert.equal(flag.title, 'Remember this');
    await assert.rejects(service.createFlag(user.id, {
      placeId: place.id,
      x: 10,
      y: 10,
      title: 'Invalid linked point',
      topicId: topic.id,
      keyPointId: 2,
    }), { code: 'KEY_POINT_NOT_FOUND' });

    const repositioned = await service.updateFlag(user.id, flag.id, { x: 50, y: 60, title: 'Updated idea' });
    assert.equal(repositioned?.x, 50);
    assert.equal(repositioned?.y, 60);
    const unlinked = await service.updateFlag(user.id, flag.id, { topicId: null });
    assert.equal(unlinked?.topicId, null);
    assert.equal(unlinked?.keyPointId, null);

    assert.equal((await service.dueFlags(user.id)).length, 1);
    const reviewed = await service.reviewFlag(user.id, flag.id, 'correct');
    assert.ok(reviewed?.nextReviewAt && reviewed.nextReviewAt > new Date());
    assert.equal((await service.dueFlags(user.id)).length, 0);

    const firstToken = await service.createShare(user.id, place.id);
    const secondToken = await service.createShare(user.id, place.id);
    assert.equal(firstToken.length, 64);
    assert.equal(secondToken.length, 64);
    await assert.rejects(service.getShared(firstToken), { code: 'SHARE_NOT_FOUND' });
    const shared = await service.getShared(secondToken);
    assert.deepEqual(Object.keys(shared).sort(), ['flags', 'id', 'imageUrl', 'name']);
    assert.equal(JSON.stringify(shared).includes('Private test topic'), false);
    assert.equal(JSON.stringify(shared).includes('Private topic notes'), false);
    assert.equal((await service.shareStatus(user.id, place.id)).active, true);

    await service.revokeShare(user.id, place.id);
    assert.deepEqual(await service.shareStatus(user.id, place.id), { active: false });
    await assert.rejects(service.getShared(secondToken), { code: 'SHARE_NOT_FOUND' });

    const renamed = await service.rename(user.id, place.id, 'Study room renamed');
    assert.equal(renamed.name, 'Study room renamed');
    await service.deleteFlag(user.id, flag.id);
    assert.equal((await service.get(user.id, place.id)).flags.length, 0);

    await prisma.recallRound.create({ data: { userId: user.id, placeId: place.id, timeLimitSec: 30 } });
    await service.delete(user.id, place.id);
    assert.equal(await prisma.place.count({ where: { id: place.id } }), 0);
    assert.equal(await prisma.placeShare.count({ where: { placeId: place.id } }), 0);
    assert.equal(await prisma.recallRound.count({ where: { placeId: place.id } }), 0);
    await assert.rejects(service.get(user.id, place.id), { code: 'PLACE_NOT_FOUND' });
  } finally {
    if (userId !== undefined) await prisma.user.deleteMany({ where: { id: userId } });
    await rm(uploadsDirectory, { recursive: true, force: true });
    await prisma.$disconnect();
  }
});
