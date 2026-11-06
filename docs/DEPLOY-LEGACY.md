# Deploying the legacy stack to Vercel

Both halves go to Vercel; the database is Neon.

| Piece | Where | Notes |
|---|---|---|
| `server/` | Vercel Node function | `server/api/index.js` exports the Express app; `server/vercel.json` routes to it. |
| `client/` | Vercel static | `client/vercel.json` rewrites deep links to `/index.html`. |
| PostgreSQL | Neon | Free tier is fine. |

No Redis, no worker, no WebSockets — the legacy server is plain Express + Prisma,
which is exactly why it works serverless and `apps/api` does not.

## 1. Database (Neon)

Copy the **direct** (non-pooled) connection string, then apply the schema and seed
from your machine, before deploying:

```bash
cd server
export DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
npx prisma migrate deploy
npm run seed
```

Use `migrate deploy`, not `db push` — the committed migrations are the source of truth.

## 2. Backend on Vercel

New Project -> this repo -> Root Directory `server` -> Framework Preset **Other**.

| Setting | Value |
|---|---|
| Build Command | `npm run build` (runs `prisma generate`) |
| Install Command | `npm install` |
| Output Directory | leave empty |

Environment variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon direct string |
| `JWT_SECRET` | long random string |
| `CLIENT_URL` | frontend URL, or `*` |
| `PUBLIC_URL` | this backend's own URL |
| `GEMINI_API_KEY` | `AIza...` from AI Studio |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `CLOUDINARY_CLOUD_NAME` | required for uploads |
| `CLOUDINARY_API_KEY` | |
| `CLOUDINARY_API_SECRET` | |

Check `https://<backend>/api/health` returns `{"status":"ok"}`.

### Uploads need Cloudinary

`server/src/services/storage.js` uses Cloudinary only when `CLOUDINARY_CLOUD_NAME`
is set. Otherwise it writes into `server/uploads/`, which Vercel discards before the
response is read — every uploaded PDF or photo then 404s. Set all three variables.

## 3. Frontend on Vercel

New Project -> same repo -> Root Directory `client` -> Framework **Vite**.

| Setting | Value |
|---|---|
| Build Command | `npm run build` |
| Output Directory | `dist` |

One env var: `VITE_API_URL` = the backend URL, no trailing slash. It is baked in at
build time, so changing it requires a redeploy.

Then set `CLIENT_URL` on the backend to this frontend URL and redeploy.

## What this branch fixed

| Change | Reason |
|---|---|
| `binaryTargets = ["native", "rhel-openssl-3.0.x"]` | Without it the build passes but the first query dies: the engine for Vercel's Amazon Linux runtime was never generated. |
| `postinstall: prisma generate` | Vercel caches `node_modules`; a stale client is a silent mismatch. |
| CORS rejects unmatched origins | The callback previously returned `true` on every path, so the allowlist did nothing with `credentials: true`. |
| `maxDuration: 60` on `api/index.js` | The 10s default is shorter than a Gemini explain round-trip. |

## Known limits

- Cold starts: first request after idle is slower. Hit `/api/health` before presenting.
- `express.json({ limit: '50mb' })` — base64 audio to `/transcribe` counts against the function payload cap.
- No realtime: the legacy server has no Socket.IO.
- `client/` contains unreachable duplicates (`Home.jsx` vs `HomePage.jsx`); the router imports only the `*Page.jsx` set.
- `app.listen` is already guarded by `if (!process.env.VERCEL)`.
