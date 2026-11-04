import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cloudinary from 'cloudinary';

const uploadsDirectory = fileURLToPath(new URL('../../uploads/', import.meta.url));

function extensionFor(mimetype, originalName = '') {
  const known = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
  };
  return known[mimetype] ?? (path.extname(originalName).toLowerCase() || '.img');
}

export async function saveFile(file) {
  if (!file?.buffer) {
    throw new Error('An image file is required.');
  }

  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream(
        { resource_type: 'auto', folder: 'pinpoint/files' },
        (error, uploaded) => (error ? reject(error) : resolve(uploaded)),
      );
      stream.end(file.buffer);
    });
    return { secure_url: result.secure_url };
  }

  await mkdir(uploadsDirectory, { recursive: true });
  const filename = `${randomUUID()}${extensionFor(file.mimetype, file.originalname)}`;
  await writeFile(path.join(uploadsDirectory, filename), file.buffer, { flag: 'wx' });
  const publicUrl = (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/+$/, '');
  return { secure_url: `${publicUrl}/uploads/${filename}` };
}

export async function saveImage(file) {
  const result = await saveFile(file);
  return result;
}