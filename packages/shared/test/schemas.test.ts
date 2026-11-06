import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cloudinaryFinalizeSchema,
  createExamBodySchema,
  createFlagBodySchema,
  createPlaceBodySchema,
  createPlaceUploadBodySchema,
  createTopicBodySchema,
  createUnitBodySchema,
  explainBodySchema,
  explainPointResultSchema,
  explainResultSchema,
  extractionResultSchema,
  idParamsSchema,
  localUploadTicketSchema,
  loginBodySchema,
  positiveIdSchema,
  recallResultBodySchema,
  recallVoiceAnswerBodySchema,
  reviewFlagBodySchema,
  roundIdParamsSchema,
  shareTokenParamsSchema,
  signupBodySchema,
  startRecallBodySchema,
  topicExtractionJobSchema,
  topicFileIdParamsSchema,
  topicFileParamsSchema,
  updateFlagBodySchema,
  updateTopicBodySchema,
  updateTopicKeyPointSchema,
  updatePlaceBodySchema,
  uploadTicketRequestSchema,
  socketEventSchemas,
  workerSocketMessageSchema,
  type SocketEventName,
} from '../src/index.js';

const longTranscript = 'Students explain a topic with enough details to test their understanding in a useful way.';
const extraction = {
  title: 'Cell biology',
  notes: 'A short summary of cell structures.',
  keyPoints: ['One', 'Two', 'Three', 'Four', 'Five'],
};

test('every exported REST and job schema accepts a valid sample and rejects null', () => {
  const samples = [
    [positiveIdSchema, 1],
    [idParamsSchema, { id: 1 }],
    [roundIdParamsSchema, { roundId: 1 }],
    [signupBodySchema, { name: 'Alex', email: 'alex@example.com', password: 'secure-password-123' }],
    [loginBodySchema, { email: 'alex@example.com', password: 'x' }],
    [createUnitBodySchema, { title: 'Biology' }],
    [updateTopicKeyPointSchema, { id: 1, text: 'A key point' }],
    [createTopicBodySchema, { title: 'Cells', notes: '' }],
    [updateTopicBodySchema, { title: 'Updated cells' }],
    [topicFileParamsSchema, { id: 1 }],
    [topicFileIdParamsSchema, { id: 1, fileId: 2 }],
    [explainBodySchema, { transcript: longTranscript, durationSec: 60 }],
    [explainPointResultSchema, { keyPointId: 1, status: 'covered', evidence: '', feedback: '' }],
    [explainResultSchema, {
      id: 1, topicId: 2, transcript: longTranscript, durationSec: 60, score: 80,
      points: [{ keyPointId: 1, status: 'covered', evidence: '', feedback: '' }],
      summary: 'Good', nextFocus: [], source: 'keyword', createdAt: new Date().toISOString(),
    }],
    [extractionResultSchema, extraction],
    [localUploadTicketSchema, { uploadToken: 'x'.repeat(20) }],
    [uploadTicketRequestSchema, {}],
    [cloudinaryFinalizeSchema, {
      publicId: 'pinpoint/file', secureUrl: 'https://res.cloudinary.com/demo/image/upload/file.png',
      uploadNonce: '9d2dd2c8-f707-47b6-a71d-1d1c5cb9623c',
    }],
    [createPlaceBodySchema, { name: 'Home', imageUrl: 'https://example.test/home.jpg' }],
    [createPlaceUploadBodySchema, { name: 'Home' }],
    [updatePlaceBodySchema, { name: 'New home' }],
    [createFlagBodySchema, { placeId: 1, x: 0, y: 100, title: 'Recall point' }],
    [updateFlagBodySchema, { x: 50, topicId: null, keyPointId: null }],
    [startRecallBodySchema, { timeLimitSec: 30 }],
    [recallResultBodySchema, { flagId: 1, result: 'green', secondsTaken: 10 }],
    [recallVoiceAnswerBodySchema, { flagId: 1, transcript: 'A spoken response', secondsTaken: 10 }],
    [reviewFlagBodySchema, { grade: 'correct' }],
    [shareTokenParamsSchema, { token: 'a'.repeat(64) }],
    [createExamBodySchema, { title: 'Biology', examDate: new Date().toISOString() }],
    [topicExtractionJobSchema, {
      userId: 1, topicId: 2, fileId: 3, fileUrl: 'https://example.test/file.pdf', mediaType: 'application/pdf',
    }],
  ] as const;

  for (const [schema, sample] of samples) {
    assert.equal(schema.safeParse(sample).success, true, `valid sample failed for ${schema.constructor.name}`);
    assert.equal(schema.safeParse(null).success, false, `null unexpectedly passed ${schema.constructor.name}`);
  }
});

test('every REST schema rejects invalid or out-of-range values', () => {
  assert.equal(positiveIdSchema.safeParse(0).success, false);
  assert.equal(signupBodySchema.safeParse({ name: 'A', email: 'bad', password: 'short' }).success, false);
  assert.equal(createFlagBodySchema.safeParse({ placeId: 1, x: 101, y: 50, title: 'Idea' }).success, false);
  assert.equal(explainBodySchema.safeParse({ transcript: 'too few words', durationSec: 60 }).success, false);
  assert.equal(startRecallBodySchema.safeParse({ timeLimitSec: 4 }).success, false);
  assert.equal(topicExtractionJobSchema.safeParse({ userId: 1 }).success, false);
});

test('all socket events accept representative payloads and reject invalid payloads', () => {
  const events: Record<SocketEventName, unknown> = {
    'file:processing': { fileId: 1, topicId: 2 },
    'file:progress': { fileId: 1, stage: 'extracting', percent: 40 },
    'file:done': {
      fileId: 1, topicId: 2, extraction,
      keyPoints: Array.from({ length: 5 }, (_, index) => ({ id: index + 1, text: `Point ${index + 1}` })),
    },
    'file:error': { fileId: 1, message: 'Extraction failed' },
    'explain:analyzing': { topicId: 1 },
    'explain:result': {
      topicId: 1, index: 0, total: 1,
      point: { keyPointId: 1, status: 'covered', evidence: '', feedback: '' },
    },
    'explain:transcript': { topicId: 1, transcript: longTranscript },
    'recall:start': {
      roundId: 1, placeId: 2, flagIds: [3], startedAt: new Date().toISOString(), timeLimitSec: 30,
    },
    'recall:flagResult': { roundId: 1, flagId: 3, result: 'red', secondsTaken: 30 },
    'recall:finished': { roundId: 1, green: 0, red: 1, total: 1 },
    'recall:state': {
      roundId: 1, placeId: 2, timeLimitSec: 30, startedAt: new Date().toISOString(),
      flagIds: [3], results: [], finishedAt: null,
    },
    'recall:resume': { roundId: 1 },
    'dashboard:updated': { reason: 'recall', occurredAt: new Date().toISOString() },
  };

  assert.deepEqual(Object.keys(events).sort(), Object.keys(socketEventSchemas).sort());
  for (const [event, schema] of Object.entries(socketEventSchemas)) {
    assert.equal(schema.safeParse(events[event as SocketEventName]).success, true, `${event} valid payload failed`);
    assert.equal(schema.safeParse(null).success, false, `${event} accepted null`);
  }
});

test('worker socket envelope validates supported messages and rejects unknown events', () => {
  const supportedEvents = [
    'file:processing', 'file:progress', 'file:done', 'file:error',
    'explain:analyzing', 'explain:result', 'dashboard:updated',
  ] as const;
  for (const event of supportedEvents) {
    const payload = {
      'file:processing': { fileId: 1, topicId: 2 },
      'file:progress': { fileId: 1, stage: 'saving', percent: 90 },
      'file:done': {
        fileId: 1, topicId: 2, extraction,
        keyPoints: Array.from({ length: 5 }, (_, index) => ({ id: index + 1, text: `Point ${index + 1}` })),
      },
      'file:error': { fileId: 1, message: 'Failed' },
      'explain:analyzing': { topicId: 1 },
      'explain:result': {
        topicId: 1, index: 0, total: 1,
        point: { keyPointId: 1, status: 'missing', evidence: '', feedback: '' },
      },
      'dashboard:updated': { reason: 'topic', occurredAt: new Date().toISOString() },
    }[event];
    assert.equal(workerSocketMessageSchema.safeParse({ userId: 1, event, payload }).success, true, `${event} worker message failed`);
  }
  assert.equal(workerSocketMessageSchema.safeParse({ userId: 1, event: 'unknown', payload: {} }).success, false);
});
