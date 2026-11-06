import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import type { PlacesService } from '../src/services/places.service.js';
import type { RecallService } from '../src/services/recall.service.js';
import type { TopicsService } from '../src/services/topics.service.js';
import type { ExplainService } from '../src/services/explain.service.js';
import type { UploadTicketQuota } from '../src/services/upload-tickets.js';
import type { AuthRepository, PublicUser } from '../src/repositories/auth.repository.js';
import { AuthService } from '../src/services/auth.service.js';
import { createApp } from '../src/app.js';

const publicUser: PublicUser = { id: 1, name: 'Test User', email: 'test@example.com', passMark: 70 };
const samplePlace = {
  id: 2,
  name: 'Kitchen',
  imageUrl: 'https://example.test/kitchen.jpg',
  flagsCount: 1,
  flags: [{ id: 3, x: 20, y: 30, title: 'Key idea', note: 'Recall me', emoji: null }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function createRouteTestApp() {
  const authRepository: AuthRepository = {
    findByEmail: async () => null,
    findById: async () => publicUser,
    create: async () => publicUser,
  };
  const authService = new AuthService(authRepository, 'test-secret-with-more-than-thirty-two-characters');
  const topicsService = {
    listUnits: async () => [{ id: 1, title: 'Biology' }],
    createUnit: async (_userId: number, title: string) => ({ id: 1, title }),
    listTopics: async () => [{ id: 4, title: 'Cells' }],
    getTopic: async () => ({ id: 4, title: 'Cells' }),
    createTopic: async (_userId: number, input: { title: string }) => ({ id: 4, ...input }),
    updateTopic: async (_userId: number, _id: number, input: object) => ({ id: 4, ...input }),
    createUploadTicket: async () => ({ uploadToken: 'x'.repeat(20) }),
    acceptLocalUpload: async () => ({ fileId: 5, status: 'queued' }),
    acceptCloudinaryUpload: async () => ({ fileId: 6, status: 'queued' }),
    getFileStatus: async () => ({ fileId: 5, status: 'done' }),
  } as unknown as TopicsService;
  const placesService = {
    list: async () => [samplePlace],
    get: async () => samplePlace,
    create: async (_userId: number, name: string) => ({ ...samplePlace, name }),
    rename: async (_userId: number, _id: number, name: string) => ({ ...samplePlace, name }),
    delete: async () => undefined,
    shareStatus: async () => ({ active: false }),
    createShare: async () => 'a'.repeat(64),
    revokeShare: async () => undefined,
    dueFlags: async () => [samplePlace.flags[0]],
    reviewFlag: async () => samplePlace.flags[0],
    createFlag: async (_userId: number, input: object) => ({ id: 3, ...input }),
    updateFlag: async (_userId: number, _id: number, input: object) => ({ id: 3, ...input }),
    deleteFlag: async () => undefined,
    getShared: async () => ({
      id: 2,
      name: samplePlace.name,
      imageUrl: samplePlace.imageUrl,
      flags: samplePlace.flags,
    }),
  } as unknown as PlacesService;
  const recallService = {
    start: async () => ({ roundId: 8, timeLimitSec: 30, speedMode: false, place: { id: 2 }, flags: [{ id: 3, x: 20, y: 30 }] }),
    offlineReview: async () => [{ id: 2, name: 'Kitchen', flags: [{ id: 3, title: 'Key idea', note: 'Recall me', emoji: null }] }],
    reveal: async () => ({ id: 3, title: 'Key idea', note: 'Recall me', timeLimitSec: 30 }),
    answerBySelfGrade: async () => ({ flagId: 3, result: 'green', secondsTaken: 5 }),
    answerByVoice: async () => ({ flagId: 3, result: 'green', secondsTaken: 5, feedback: 'Correct', source: 'ai' }),
    finish: async () => ({ roundId: 8, results: [], summary: { green: 1, red: 0 } }),
  } as unknown as RecallService;
  const explainService = {
    submit: async () => ({ id: 9, score: 80, source: 'keyword' }),
  } as unknown as ExplainService;
  const quota: UploadTicketQuota = { consume: async () => true };
  const app = createApp({
    authService,
    readiness: { database: async () => undefined, redis: async () => undefined },
    topics: { service: topicsService, uploadTicketQuota: quota, uploadsDirectory: 'unused' },
    explain: explainService,
    palace: placesService,
    recall: recallService,
    webOrigin: 'http://localhost:5180',
  });
  return { app, token: authService.createToken(1) };
}

test('units, topics, upload and Explain routes validate requests and return service results', async () => {
  const { app, token } = createRouteTestApp();
  const auth = { Authorization: `Bearer ${token}` };
  assert.equal((await request(app).get('/units').set(auth)).status, 200);
  assert.equal((await request(app).post('/units').set(auth).send({ title: 'Biology' })).status, 201);
  assert.equal((await request(app).get('/topics').set(auth)).status, 200);
  assert.equal((await request(app).post('/topics').set(auth).send({ title: 'Cells' })).status, 201);
  assert.equal((await request(app).get('/topics/4').set(auth)).status, 200);
  assert.equal((await request(app).patch('/topics/4').set(auth).send({ title: 'Cell biology' })).status, 200);
  assert.equal((await request(app).post('/topics/4/upload-ticket').set(auth).send({})).status, 201);
  assert.equal((await request(app).post('/topics/4/files/local').set(auth)
    .field('uploadToken', 'x'.repeat(20)).attach('file', Buffer.from('test'), 'file.pdf')).status, 202);
  assert.equal((await request(app).post('/topics/4/files/cloudinary').set(auth).send({
    publicId: 'file', secureUrl: 'https://res.cloudinary.com/demo/file.pdf',
    uploadNonce: '9d2dd2c8-f707-47b6-a71d-1d1c5cb9623c',
  })).status, 202);
  assert.equal((await request(app).get('/topics/4/files/5').set(auth)).status, 200);
  assert.equal((await request(app).post('/topics/4/explain').set(auth).send({
    transcript: 'Learners explain a topic with enough detail to show what they have understood so far.',
    durationSec: 60,
  })).status, 200);
  assert.equal((await request(app).post('/topics/4/upload-ticket').set(auth).send({ unexpected: true })).status, 400);
  assert.equal((await request(app).get('/topics')).status, 401);
});

test('place, flag, review and share routes cover CRUD and public read-only access', async () => {
  const { app, token } = createRouteTestApp();
  const auth = { Authorization: `Bearer ${token}` };
  assert.equal((await request(app).get('/places').set(auth)).status, 200);
  assert.equal((await request(app).post('/places').set(auth).field('name', 'Kitchen')
    .attach('image', Buffer.from('image'), 'photo.png')).status, 201);
  assert.equal((await request(app).get('/places/2').set(auth)).status, 200);
  assert.equal((await request(app).patch('/places/2').set(auth).send({ name: 'New kitchen' })).status, 200);
  assert.equal((await request(app).get('/places/2/share').set(auth)).status, 200);
  const tokenResult = await request(app).post('/places/2/share').set(auth);
  assert.equal(tokenResult.status, 201);
  assert.equal(tokenResult.body.token.length, 64);
  assert.equal((await request(app).delete('/places/2/share').set(auth)).status, 204);
  assert.equal((await request(app).delete('/places/2').set(auth)).status, 204);
  assert.equal((await request(app).get('/flags/due').set(auth)).status, 200);
  assert.equal((await request(app).post('/flags').set(auth).send({
    placeId: 2, x: 20, y: 30, title: 'Key idea',
  })).status, 201);
  assert.equal((await request(app).patch('/flags/3').set(auth).send({ x: 30, y: 40 })).status, 200);
  assert.equal((await request(app).post('/flags/3/review').set(auth).send({ grade: 'correct' })).status, 200);
  assert.equal((await request(app).delete('/flags/3').set(auth)).status, 204);
  assert.equal((await request(app).get(`/shared/${'a'.repeat(64)}`)).status, 200);
  assert.equal((await request(app).get('/shared/not-a-share-token')).status, 404);
});

test('Recall routes validate request shapes and expose offline/start/reveal/result/finish flows', async () => {
  const { app, token } = createRouteTestApp();
  const auth = { Authorization: `Bearer ${token}` };
  assert.equal((await request(app).get('/recall/offline').set(auth)).status, 200);
  assert.equal((await request(app).post('/recall/start').set(auth).send({ timeLimitSec: 30 })).status, 201);
  assert.equal((await request(app).post('/recall/8/reveal').set(auth).send({ flagId: 3 })).status, 200);
  assert.equal((await request(app).post('/recall/8/result').set(auth).send({
    flagId: 3, result: 'green', secondsTaken: 5,
  })).status, 201);
  assert.equal((await request(app).post('/recall/8/voice-answer').set(auth).send({
    flagId: 3, transcript: 'My answer', secondsTaken: 5,
  })).status, 201);
  assert.equal((await request(app).post('/recall/8/finish').set(auth)).status, 200);
  assert.equal((await request(app).post('/recall/start').set(auth).send({ timeLimitSec: 2 })).status, 400);
});

test('health and readiness endpoints report process and dependency state', async () => {
  const { app } = createRouteTestApp();
  assert.deepEqual((await request(app).get('/health')).body, { status: 'ok' });
  const readiness = await request(app).get('/ready');
  assert.equal(readiness.status, 200);
  assert.deepEqual(readiness.body, {
    status: 'ready',
    checks: { database: true, redis: true },
  });
});
