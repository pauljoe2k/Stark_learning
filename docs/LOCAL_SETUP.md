# Local setup for the TypeScript monorepo

The new implementation lives in `apps/web`, `apps/api`, and `packages/shared`.
The original `client/` and `server/` implementation is retained during the
phase-by-phase migration.

## Docker (recommended)

Start Docker Desktop with the Linux container engine, then run from the project
root:

```powershell
docker compose up -d
```

Compose starts PostgreSQL, Redis, the API, worker, and web app. The API applies
Prisma migrations and seeds the demo account on its first healthy start.

| Service | URL |
| --- | --- |
| Web | http://localhost:5180 |
| API liveness | http://localhost:4100/health |
| API readiness | http://localhost:4100/ready |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6380 |

The Docker Compose JWT secret and demo password defaults are for local
development only. Set `JWT_SECRET` and `DEMO_PASSWORD` in the environment before
using this stack outside a private development machine.

## Without Docker

Install Node.js 22+, PostgreSQL, and Redis. Copy `apps/api/.env.example` to
`apps/api/.env`, and `apps/web/.env.example` to `apps/web/.env`. Update the
database and Redis URLs if your local services use different ports or credentials.

Then run:

```powershell
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:all
```

`dev:all` starts API, worker, and web, waits for the API and web health checks,
then opens the web app. PostgreSQL and Redis must already be running. The
development demo account is `demo@pinpoint.app` with password
`PinpointDemo123!`; change it before sharing a non-local environment.

## Tests

```powershell
npm run lint
npm run typecheck
npm test
```

The API ownership integration test is skipped unless `DATABASE_URL` is set. To
run it against the Compose database, set
`DATABASE_URL=postgresql://pinpoint:pinpoint@localhost:5433/pinpoint?schema=public`
for the test process.

Camera capture requires HTTPS or `localhost`. The local app uses the latter.

## Phase 1: Topic uploads

The Topic tab supports creating a topic, selecting a unit, uploading PDFs or
images, capturing a page with the rear camera, and reviewing/editing the title,
notes, and extracted key points before saving. The API checks file signatures,
declared MIME type, size (20 MB), PDF page count, and the two-page/two-image
limits before queuing extraction. Local storage is the default and is persisted
in the `pinpoint-uploads` Compose volume (or `apps/api/uploads` without Docker).

For `npm run dev:all`, set `GEMINI_API_KEY` in `apps/api/.env`. Docker Compose
reads `GEMINI_API_KEY`, `STORAGE_PROVIDER`, and Cloudinary credentials from the
project-root `.env` file or the shell environment; recreate the API and worker
after changing them. Without a Gemini key, upload and job creation still work,
but the worker reports an explicit extraction error instead of returning sample
content. Cloudinary is optional; set `STORAGE_PROVIDER=cloudinary` and all three
Cloudinary credentials to enable signed direct uploads.

The authenticated upload API is:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/units` | List the signed-in user's units |
| `POST` | `/units` | Create a unit |
| `GET` | `/topics` | List topics and their files/key points |
| `POST` | `/topics` | Create a topic |
| `GET` | `/topics/:id` | Get one owned topic |
| `PATCH` | `/topics/:id` | Save edited title, notes, and key points |
| `POST` | `/topics/:id/upload-ticket` | Issue a one-use, user/topic-scoped upload ticket |
| `POST` | `/topics/:id/files/local` | Multipart `file` + `uploadToken`; returns `202` |
| `POST` | `/topics/:id/files/cloudinary` | Verify a signed Cloudinary upload; returns `202` |
| `GET` | `/topics/:id/files/:fileId` | Read queued extraction status/result |

Worker progress and completion arrive through the authenticated socket events
`file:processing`, `file:progress`, `file:done`, and `file:error`. The browser
also checks the file status endpoint so a disconnected socket does not strand
an extraction review.

## Phase 2: Explain

The Explain tab lets a student choose a saved topic and a 1, 2, 3, or 5 minute
session, speak using browser speech recognition, or type a transcript. The
transcript remains editable before submission. Submissions under 15 words are
rejected by both the browser and API. The API compares the transcript with the
topic notes and key points, computes the score in code (covered = 1, partial =
0.5, incorrect/missing = 0), updates topic mastery, and saves the explanation.
AI responses are schema-validated and retried once when malformed. If Gemini
is unavailable, a labeled keyword-based estimate is returned instead.

Authenticated endpoint:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/topics/:id/explain` | Analyze and save `{ "transcript": "...", "durationSec": 120 }`; duration must be 60, 120, 180, or 300 seconds |

Example:

```powershell
curl.exe -X POST http://localhost:4100/topics/1/explain `
  -H "Authorization: Bearer <access-token>" `
  -H "Content-Type: application/json" `
  -d '{"transcript":"Cells use mitochondria to release energy from food so the cell can power its everyday activities during growth.","durationSec":60}'
```

The response contains the saved explanation ID, score, summary, each key point's
status/evidence/feedback, the next gaps to focus on, and whether the result came
from Gemini or the keyword fallback. Authenticated sockets receive
`explain:analyzing`, one `explain:result` per point, and `dashboard:updated`.
Voice transcription depends on browser support and microphone permission; typed
transcripts are always available.

## Phase 3: Palace

The Palace tab stores user-owned places with JPEG, PNG, or WebP photos. Photos
are compressed in the browser and validated by image signature and size by the
API. Open a place to zoom and pan the photo, add flags by tapping a location,
edit or delete flags, and drag markers to save a new percentage position.
Flags can remain free notes or link to one of the signed-in user's topics and
key points. Place, flag, and image queries are refreshed after mutations.

Authenticated endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/places` | List owned places with flag counts |
| `POST` | `/places` | Multipart `name` and `image`; returns the created place |
| `GET` | `/places/:id` | Read one owned place and its flags |
| `PATCH` | `/places/:id` | Rename an owned place |
| `DELETE` | `/places/:id` | Delete an owned place and its flags |
| `POST` | `/flags` | Create a flag with `placeId`, percentage `x`/`y`, and `title` |
| `PATCH` | `/flags/:id` | Edit a flag, including its position or topic/key-point link |
| `DELETE` | `/flags/:id` | Delete an owned flag |

Example:

```powershell
curl.exe -X POST http://localhost:4100/flags `
  -H "Authorization: Bearer <access-token>" `
  -H "Content-Type: application/json" `
  -d '{"placeId":1,"x":35.5,"y":62,"title":"Chlorophyll","note":"Captures light energy."}'
```
