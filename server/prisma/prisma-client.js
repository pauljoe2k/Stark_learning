// Single Prisma Client instance for the whole API.
//
// Prisma ORM 7 requires a driver adapter — the client no longer talks to Postgres
// through a bundled Rust engine. `PrismaPg` wraps node-postgres (`pg`).
//
// Import it everywhere as:  import { prisma } from "./lib/prisma.js";
// Never call `new PrismaClient()` in a route file: each instance opens its own pool.

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

const adapter = new PrismaPg({
  connectionString,
  // v7 uses pg's pool defaults, which have NO connect timeout (v6 used 5s).
  // Keep a finite one so a dead DB fails fast instead of hanging a request.
  connectionTimeoutMillis: 5_000,
});

export const prisma = new PrismaClient({ adapter });
