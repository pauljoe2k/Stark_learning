import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { v2 as cloudinary } from 'cloudinary';
import { UploadStorage } from '../src/services/upload-storage.js';

const cloudinarySettings = {
  cloudName: 'test-cloud',
  apiKey: 'test-api-key',
  apiSecret: 'test-api-secret',
};

test('local upload storage saves, reads and removes files inside its configured directory', async () => {
  const uploadsDirectory = await mkdtemp(join(tmpdir(), 'pinpoint-storage-'));
  try {
    const storage = new UploadStorage({
      provider: 'local',
      uploadsDirectory,
      publicUrl: 'http://localhost:4100',
      cloudinary: cloudinarySettings,
    });
    const source = Buffer.from('local test file');
    const saved = await storage.saveLocal(source, 'application/pdf');
    assert.deepEqual(await storage.read(saved.fileUrl), source);
    assert.deepEqual(await readFile(saved.filePath), source);
    await storage.removeLocal(saved.filePath);
    await assert.rejects(readFile(saved.filePath), { code: 'ENOENT' });
  } finally {
    await rm(uploadsDirectory, { recursive: true, force: true });
  }
});

test('local storage rejects unrelated URLs and paths outside its directory', async () => {
  const uploadsDirectory = await mkdtemp(join(tmpdir(), 'pinpoint-storage-'));
  try {
    const storage = new UploadStorage({
      provider: 'local',
      uploadsDirectory,
      publicUrl: 'http://localhost:4100',
      cloudinary: cloudinarySettings,
    });
    await assert.rejects(storage.read('http://other.test/media/file.pdf'), { code: 'INVALID_STORAGE_URL' });
    await assert.rejects(storage.removeLocal(join(uploadsDirectory, '..', 'outside.pdf')), {
      code: 'INVALID_STORAGE_PATH',
    });
  } finally {
    await rm(uploadsDirectory, { recursive: true, force: true });
  }
});

test('Cloudinary tickets are scoped and signed without network access', () => {
  const storage = new UploadStorage({
    provider: 'cloudinary',
    uploadsDirectory: 'unused',
    publicUrl: 'http://localhost:4100',
    cloudinary: cloudinarySettings,
  });
  const ticket = storage.cloudinarySignature({
    userId: 7,
    topicId: 9,
    nonce: 'nonce-value',
    nowSeconds: 1_800_000_000,
  });
  assert.equal(ticket.folder, 'pinpoint/users/7/topics/9');
  assert.equal(ticket.timestamp, 1_800_000_000);
  assert.ok(ticket.signature.length > 10);
  assert.match(ticket.uploadUrl, /^https:\/\/api\.cloudinary\.com\//);
});

test('Cloudinary verification uses mocked metadata and mocked file download', async () => {
  const storage = new UploadStorage({
    provider: 'cloudinary',
    uploadsDirectory: 'unused',
    publicUrl: 'http://localhost:4100',
    cloudinary: cloudinarySettings,
  });
  const publicId = 'pinpoint/users/7/topics/9/file-id';
  const secureUrl = 'https://res.cloudinary.com/test-cloud/image/upload/file.png';
  const originalResource = Object.getOwnPropertyDescriptor(cloudinary.api, 'resource');
  const originalFetch = globalThis.fetch;
  Object.defineProperty(cloudinary.api, 'resource', {
    configurable: true,
    value: async () => ({
      public_id: publicId,
      secure_url: secureUrl,
      bytes: 8,
      format: 'png',
      context: { custom: { upload_nonce: 'nonce-value' } },
    }),
  });
  globalThis.fetch = async () => new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
  try {
    const result = await storage.verifyCloudinaryUpload({
      userId: 7,
      topicId: 9,
      nonce: 'nonce-value',
      publicId,
      secureUrl,
      resourceType: 'image',
    });
    assert.equal(result.declaredMimeType, 'image/png');
    assert.equal(result.fileUrl, secureUrl);
    assert.equal(result.bytes.length, 8);

    await assert.rejects(storage.verifyCloudinaryUpload({
      userId: 7,
      topicId: 9,
      nonce: 'wrong-nonce',
      publicId,
      secureUrl,
      resourceType: 'image',
    }), { code: 'CLOUD_UPLOAD_SIGNATURE_MISMATCH' });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalResource) Object.defineProperty(cloudinary.api, 'resource', originalResource);
    else Reflect.deleteProperty(cloudinary.api, 'resource');
  }
});
