// Prisma CLI configuration (Prisma ORM 7).
// Replaces the `url` / `directUrl` fields that used to live in schema.prisma,
// plus the `prisma` block that used to live in package.json.
//
// .mjs so you don't need TypeScript just to run the CLI. `prisma.config.ts` works too.
// The CLI does NOT load .env automatically in v7 — hence the dotenv import on line 1.

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `npx prisma db seed` runs this. Auto-seeding after `migrate dev` is gone in v7.
    seed: "node prisma/seed.js",
  },
  datasource: {
    // Neon/Supabase: point this at the DIRECT (unpooled) connection string.
    // The CLI uses this URL for migrations; the app uses the pooled one via the adapter.
    //
    // Using process.env rather than the env() helper on purpose: env() throws when the
    // variable is missing, which breaks `prisma generate` in CI where no DB is needed.
    url: process.env.DATABASE_URL ?? "",
    // Shadow DB for `migrate dev` against a cloud Postgres. Omit on Neon free tier,
    // which creates a shadow database automatically.
    ...(process.env.SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
      : {}),
  },
});
