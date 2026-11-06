import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { HttpError } from '../src/errors.js';
import { MAX_UPLOAD_BYTES, validateUploadedFile } from '../src/services/upload-validation.js';

async function createPdf(pageCount: number): Promise<Buffer> {
  const document = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) document.addPage();
  return Buffer.from(await document.save());
}

test('accepts a two-page PDF when the topic has no existing material', async () => {
  const result = await validateUploadedFile(await createPdf(2), 'application/pdf', []);
  assert.deepEqual(result, { mediaType: 'application/pdf', pageCount: 2 });
});

test('rejects uploads that would exceed the two-page topic limit', async () => {
  const pdf = await createPdf(2);
  await assert.rejects(
    validateUploadedFile(pdf, 'application/pdf', [{ type: 'image/png', pageCount: 1 }]),
    (error: unknown) => error instanceof HttpError && error.code === 'PAGE_LIMIT_EXCEEDED',
  );
});

test('rejects a PDF with more than two pages', async () => {
  await assert.rejects(
    validateUploadedFile(await createPdf(3), 'application/pdf', []),
    (error: unknown) => error instanceof HttpError && error.code === 'PAGE_LIMIT_EXCEEDED',
  );
});

test('rejects declared MIME types that do not match the file signature', async () => {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  await assert.rejects(
    validateUploadedFile(pngSignature, 'image/jpeg', []),
    (error: unknown) => error instanceof HttpError && error.code === 'FILE_TYPE_MISMATCH',
  );
});

test('rejects files larger than 20 MB before format parsing', async () => {
  await assert.rejects(
    validateUploadedFile(Buffer.alloc(MAX_UPLOAD_BYTES + 1), 'application/pdf', []),
    (error: unknown) => error instanceof HttpError && error.code === 'FILE_TOO_LARGE',
  );
});

test('allows two image pages and rejects a third image at the topic page limit', async () => {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual(await validateUploadedFile(pngSignature, 'image/png', [
    { type: 'image/png', pageCount: 1 },
  ]), { mediaType: 'image/png', pageCount: 1 });
  await assert.rejects(
    validateUploadedFile(pngSignature, 'image/png', [
      { type: 'image/png', pageCount: 1 },
      { type: 'image/jpeg', pageCount: 1 },
    ]),
    (error: unknown) => error instanceof HttpError && error.code === 'PAGE_LIMIT_EXCEEDED',
  );
});

test('rejects a corrupt PDF with a PDF signature', async () => {
  await assert.rejects(
    validateUploadedFile(Buffer.from('%PDF-not-a-valid-document'), 'application/pdf', []),
    (error: unknown) => error instanceof HttpError && error.code === 'INVALID_PDF',
  );
});
