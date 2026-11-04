import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  WEB_ORIGIN: z.string().url().default('http://localhost:5180'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  DEMO_PASSWORD: z.string().min(10).default('PinpointDemo123!'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().min(1).default('gemini-2.0-flash'),
  STORAGE_PROVIDER: z.enum(['local', 'cloudinary']).default('local'),
  UPLOAD_DIR: z.string().min(1).default('apps/api/uploads'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4100'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
}).superRefine((env, context) => {
  if (env.STORAGE_PROVIDER === 'cloudinary') {
    for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const) {
      if (!env[key]) context.addIssue({ code: 'custom', path: [key], message: `${key} is required with Cloudinary storage.` });
    }
  }
});

export const config = envSchema.parse(process.env);
export type Config = typeof config;
