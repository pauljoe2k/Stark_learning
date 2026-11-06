import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { HttpError } from '../errors.js';
import type { SupportedMediaType } from './upload-validation.js';

const extensions: Record<SupportedMediaType, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export interface CloudinarySettings {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface UploadStorageSettings {
  provider: 'local' | 'cloudinary';
  uploadsDirectory: string;
  publicUrl: string;
  cloudinary: CloudinarySettings;
}

export class UploadStorage {
  constructor(private readonly settings: UploadStorageSettings) {
    if (settings.provider === 'cloudinary') {
      cloudinary.config({
        cloud_name: settings.cloudinary.cloudName,
        api_key: settings.cloudinary.apiKey,
        api_secret: settings.cloudinary.apiSecret,
        secure: true,
      });
    }
  }

  get provider(): UploadStorageSettings['provider'] {
    return this.settings.provider;
  }

  async saveLocal(bytes: Buffer, mediaType: SupportedMediaType): Promise<{ fileUrl: string; filePath: string }> {
    await mkdir(this.settings.uploadsDirectory, { recursive: true });
    const filename = `${randomUUID()}${extensions[mediaType]}`;
    const filePath = join(this.settings.uploadsDirectory, filename);
    await writeFile(filePath, bytes, { flag: 'wx' });
    return {
      fileUrl: `${this.settings.publicUrl}/media/${filename}`,
      filePath,
    };
  }

  async read(fileUrl: string): Promise<Buffer> {
    const parsedUrl = new URL(fileUrl);
    if (parsedUrl.protocol === 'https:' && this.isCloudinaryHost(parsedUrl.hostname)) {
      const response = await fetch(parsedUrl, { redirect: 'error' });
      if (!response.ok) throw new HttpError(502, 'Stored upload could not be retrieved.', 'UPLOAD_READ_FAILED');
      const contentLength = Number(response.headers.get('content-length') ?? 0);
      if (contentLength > 20 * 1024 * 1024) throw new HttpError(413, 'Stored upload exceeds 20 MB.', 'FILE_TOO_LARGE');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 20 * 1024 * 1024) throw new HttpError(413, 'Stored upload exceeds 20 MB.', 'FILE_TOO_LARGE');
      return bytes;
    }

    if (parsedUrl.origin !== this.settings.publicUrl || !parsedUrl.pathname.startsWith('/media/')) {
      throw new HttpError(400, 'Stored upload URL is not managed by this storage provider.', 'INVALID_STORAGE_URL');
    }
    const filename = basename(decodeURIComponent(parsedUrl.pathname.slice('/media/'.length)));
    if (!filename || filename === '.' || filename === '..') {
      throw new HttpError(400, 'Stored upload path is invalid.', 'INVALID_STORAGE_URL');
    }
    return readFile(join(this.settings.uploadsDirectory, filename));
  }

  async removeLocal(filePath: string): Promise<void> {
    const uploadsDirectory = resolve(this.settings.uploadsDirectory);
    const resolvedPath = resolve(filePath);
    const pathFromUploads = relative(uploadsDirectory, resolvedPath);
    if (pathFromUploads.startsWith('..') || isAbsolute(pathFromUploads)) {
      throw new HttpError(400, 'Upload file path is outside the configured storage directory.', 'INVALID_STORAGE_PATH');
    }
    await rm(resolvedPath, { force: true });
  }

  async removeCloudinaryUpload(publicId: string, resourceType: 'image' | 'raw'): Promise<void> {
    if (this.settings.provider !== 'cloudinary') {
      throw new HttpError(400, 'Cloudinary uploads are not enabled.', 'STORAGE_PROVIDER_MISMATCH');
    }
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: 'upload',
      invalidate: true,
    });
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new HttpError(502, 'Cloudinary could not remove the rejected upload.', 'CLOUD_UPLOAD_CLEANUP_FAILED');
    }
  }

  cloudinarySignature(input: { userId: number; topicId: number; nonce: string; nowSeconds: number }) {
    if (this.settings.provider !== 'cloudinary') {
      throw new HttpError(400, 'Cloudinary uploads are not enabled.', 'STORAGE_PROVIDER_MISMATCH');
    }
    const folder = `pinpoint/users/${input.userId}/topics/${input.topicId}`;
    const publicId = randomUUID();
    const context = `upload_nonce=${input.nonce}`;
    const params = {
      context,
      folder,
      public_id: publicId,
      timestamp: input.nowSeconds,
    };
    const signature = cloudinary.utils.api_sign_request(params, this.settings.cloudinary.apiSecret);
    return {
      cloudName: this.settings.cloudinary.cloudName,
      apiKey: this.settings.cloudinary.apiKey,
      timestamp: input.nowSeconds,
      folder,
      publicId,
      context,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.settings.cloudinary.cloudName}/auto/upload`,
    };
  }

  async verifyCloudinaryUpload(input: {
    userId: number;
    topicId: number;
    nonce: string;
    publicId: string;
    secureUrl: string;
    resourceType: 'image' | 'raw';
  }): Promise<{ bytes: Buffer; declaredMimeType: string; fileUrl: string }> {
    if (this.settings.provider !== 'cloudinary') {
      throw new HttpError(400, 'Cloudinary uploads are not enabled.', 'STORAGE_PROVIDER_MISMATCH');
    }
    const expectedFolder = `pinpoint/users/${input.userId}/topics/${input.topicId}/`;
    if (!input.publicId.startsWith(expectedFolder)) {
      throw new HttpError(403, 'Uploaded file does not belong to this topic.', 'CLOUD_UPLOAD_SCOPE_MISMATCH');
    }
    const url = new URL(input.secureUrl);
    if (url.protocol !== 'https:' || !this.isCloudinaryHost(url.hostname)) {
      throw new HttpError(400, 'Only secure URLs from this Cloudinary account are accepted.', 'INVALID_CLOUD_UPLOAD_URL');
    }

    let resource: {
      secure_url?: string;
      public_id?: string;
      bytes?: number;
      format?: string;
      context?: { custom?: Record<string, string> };
    };
    try {
      resource = await cloudinary.api.resource(input.publicId, {
        resource_type: input.resourceType,
        type: 'upload',
        context: true,
      });
    } catch {
      throw new HttpError(400, 'Uploaded file could not be verified in Cloudinary.', 'CLOUD_UPLOAD_NOT_FOUND');
    }
    if (
      resource.public_id !== input.publicId
      || resource.secure_url !== input.secureUrl
      || resource.context?.custom?.upload_nonce !== input.nonce
    ) {
      throw new HttpError(403, 'Cloudinary upload signature or owner does not match.', 'CLOUD_UPLOAD_SIGNATURE_MISMATCH');
    }
    if (typeof resource.bytes === 'number' && resource.bytes > 20 * 1024 * 1024) {
      throw new HttpError(413, 'Files must be 20 MB or smaller.', 'FILE_TOO_LARGE');
    }

    const response = await fetch(url, { redirect: 'error' });
    if (!response.ok) throw new HttpError(502, 'Uploaded file could not be downloaded for validation.', 'CLOUD_UPLOAD_READ_FAILED');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 20 * 1024 * 1024) throw new HttpError(413, 'Files must be 20 MB or smaller.', 'FILE_TOO_LARGE');
    return {
      bytes,
      declaredMimeType: input.resourceType === 'raw' || resource.format === 'pdf'
        ? 'application/pdf'
        : this.mimeFromFormat(resource.format),
      fileUrl: resource.secure_url,
    };
  }

  private isCloudinaryHost(hostname: string): boolean {
    return hostname === 'res.cloudinary.com'
      || hostname === `res-${this.settings.cloudinary.cloudName}.cloudinary.com`;
  }

  private mimeFromFormat(format: string | undefined): string {
    switch (format?.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }
}
