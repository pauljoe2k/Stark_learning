import { PDFDocument } from 'pdf-lib';
import { HttpError } from '../errors.js';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_TOPIC_PAGES = 100;
export const MAX_TOPIC_IMAGES = 20;

export type SupportedMediaType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';

const signatures: ReadonlyArray<{ mediaType: SupportedMediaType; matches: (bytes: Buffer) => boolean }> = [
  { mediaType: 'application/pdf', matches: (bytes) => bytes.subarray(0, 5).toString('ascii') === '%PDF-' },
  { mediaType: 'image/png', matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { mediaType: 'image/jpeg', matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { mediaType: 'image/webp', matches: (bytes) => bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP' },
];

export function sniffMediaType(bytes: Buffer): SupportedMediaType {
  const signature = signatures.find(({ matches }) => matches(bytes));
  if (!signature) throw new HttpError(400, 'Upload must be a PDF, JPEG, PNG, or WebP file.', 'UNSUPPORTED_FILE_TYPE');
  return signature.mediaType;
}

export async function validateUploadedFile(
  bytes: Buffer,
  declaredMimeType: string,
  existingFiles: ReadonlyArray<{ type: string; pageCount: number }>,
): Promise<{ mediaType: SupportedMediaType; pageCount: number }> {
  if (bytes.length === 0) throw new HttpError(400, 'Choose a non-empty file to upload.', 'EMPTY_FILE');
  if (bytes.length > MAX_UPLOAD_BYTES) throw new HttpError(413, 'Files must be 20 MB or smaller.', 'FILE_TOO_LARGE');

  const mediaType = sniffMediaType(bytes);
  if (declaredMimeType !== mediaType) {
    throw new HttpError(400, 'The file contents do not match the declared file type.', 'FILE_TYPE_MISMATCH');
  }

  let pageCount = 1;
  if (mediaType === 'application/pdf') {
    let document: PDFDocument;
    try {
      document = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    } catch {
      throw new HttpError(400, 'This PDF is damaged or could not be opened.', 'INVALID_PDF');
    }
    pageCount = document.getPageCount();
    if (pageCount < 1) throw new HttpError(400, 'PDF files must contain at least one page.', 'EMPTY_PDF');
  }

  const existingPageCount = existingFiles.reduce((sum, file) => sum + file.pageCount, 0);
  if (existingPageCount + pageCount > MAX_TOPIC_PAGES) {
    throw new HttpError(400, `A topic can contain a maximum of ${MAX_TOPIC_PAGES} pages in total.`, 'PAGE_LIMIT_EXCEEDED');
  }

  const imageCount = existingFiles.filter((file) => file.type.startsWith('image/')).length;
  if (mediaType.startsWith('image/') && imageCount >= MAX_TOPIC_IMAGES) {
    throw new HttpError(400, `A topic can contain a maximum of ${MAX_TOPIC_IMAGES} images.`, 'IMAGE_LIMIT_EXCEEDED');
  }

  return { mediaType, pageCount };
}
