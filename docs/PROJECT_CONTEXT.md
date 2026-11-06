# Pinpoint Project Context

This guide explains the repository layout, the active and legacy applications,
how the main user journeys work across files, and how to run and validate the
project. It is intended as a map for developers before they start changing code.

## 1. What Pinpoint does

Pinpoint helps a learner understand material, explain it in their own words, pin
ideas to familiar places, and revisit those ideas through timed or spaced
recall:

1. Add a topic and optionally upload notes.
2. Extract a concise summary and testable key points from uploaded material.
3. Explain the topic through speech transcription or typed text.
4. Compare the explanation with the saved key points and show learning gaps.
5. Add a photo of a familiar place and pin ideas to locations in it.
6. Recall those ideas, get feedback, and schedule future reviews.

The browser does not connect directly to PostgreSQL, Redis, or Gemini. App
requests go through the API; asynchronous extraction runs in a worker.

## 2. Important architecture decision: two applications

There are currently two implementations in this repository:

| Implementation | Directories | Role |
| --- | --- | --- |
| Current TypeScript monorepo | [`apps/web`](../apps/web), [`apps/api`](../apps/api), [`packages/shared`](../packages/shared) | Preferred implementation for new work. It contains the current dashboard, topic, explain, palace, recall, offline review, and share-link flows. |
| Retained JavaScript application | [`client`](../client), [`server`](../server) | Earlier implementation kept during a phased migration. It has its own UI, API, Prisma schema, and setup. Do not assume a change in one implementation automatically affects the other. |

The current monorepo is described in [`LOCAL_SETUP.md`](./LOCAL_SETUP.md) and
is started with the root workspace scripts. The older `client/` and `server/`
are still useful references, but they are not the target for new features
unless a task explicitly asks for legacy-app changes.

The two backends are isolated from one another when using the repository's
local PostgreSQL Compose service. The current API uses the `public` schema;
the legacy server's example connection uses `pinpoint_legacy`. They share the
PostgreSQL container/database in that local setup, not the same tables.

## 3. Repository layout

```text
Stark_learning/
├── apps/
│   ├── web/                  # Current React + TypeScript frontend
│   └── api/                  # Current Express + TypeScript API and worker
├── packages/
│   └── shared/               # Zod schemas and types shared across workspaces
├── client/                   # Retained legacy React + JavaScript frontend
├── server/                   # Retained legacy Express + JavaScript backend
├── docs/                     # Setup, product brief, decisions, this guide
├── scripts/                  # Local development launcher and helper scripts
├── docker-compose.yml        # PostgreSQL, Redis, API, worker, and web services
├── package.json              # npm workspace scripts for the current monorepo
└── README.md                 # Product overview and repository entry point
```

### Current web app: `apps/web`

```text
apps/web/
├── public/
│   ├── manifest.webmanifest  # Installable-app metadata
│   ├── pinpoint.svg          # App icon
│   └── service-worker.js     # App-shell and same-origin GET caching
├── src/
│   ├── components/           # Camera and reusable Palace UI
│   ├── hooks/                # React Query hooks for place operations
│   ├── lib/                  # Offline snapshot parsing and local helpers
│   ├── pages/                # Route-level screens
│   ├── api.ts                # Typed HTTP client and response models
│   ├── auth.tsx              # Auth context and cached offline profile
│   ├── socket.tsx            # Authenticated Socket.IO context
│   ├── App.tsx               # Providers' child routes and navigation shell
│   ├── main.tsx              # React, router, query client, service worker
│   └── styles.css            # Theme tokens and application styles
├── .env.example              # Frontend environment-variable example
└── package.json              # Frontend scripts and dependencies
```

**Main page files**

| File | Responsibility |
| --- | --- |
| [`HomePage.tsx`](../apps/web/src/pages/HomePage.tsx) | Loads topics, places, and due flags; shows counts, the next suggested workflow step, and recent topics. |
| [`LoginPage.tsx`](../apps/web/src/pages/LoginPage.tsx) | Sign-in/sign-up form; submits credentials through the auth context. |
| [`TopicPage.tsx`](../apps/web/src/pages/TopicPage.tsx) | Creates topics, uploads study material, listens for extraction progress, and lets the user edit/save extracted notes and key points. |
| [`ExplainPage.tsx`](../apps/web/src/pages/ExplainPage.tsx) | Runs a timed spoken or typed explanation and displays the saved gap analysis. |
| [`PalacePage.tsx`](../apps/web/src/pages/PalacePage.tsx) | Lists places and opens the add-place flow. |
| [`PlaceViewPage.tsx`](../apps/web/src/pages/PlaceViewPage.tsx) | Edits a place, adds/edits flags, launches a walk-through, and manages share links. |
| [`RecallPage.tsx`](../apps/web/src/pages/RecallPage.tsx) | Runs timed recall, voice checking, due reviews, and downloaded offline flashcards. |
| [`SharedPlacePage.tsx`](../apps/web/src/pages/SharedPlacePage.tsx) | Public, read-only view for a valid share token. |

**Reusable frontend pieces**

- `components/CameraCapture.tsx` captures a page with the device camera.
- `components/palace/AddPlaceDialog.tsx` compresses and submits a place photo.
- `components/palace/PlaceCard.tsx` renders one place in the Palace grid.
- `components/palace/PlaceCanvas.tsx` implements zoom/pan, placement, selection,
  and dragging of flag markers using percentage coordinates.
- `components/palace/FlagMarker.tsx` renders an individual canvas marker.
- `components/palace/FlagPanel.tsx` edits a flag and its optional topic/key-point
  link.
- `hooks/usePlaces.ts` owns place/flag React Query operations and invalidates
  cached place data after mutations.
- `lib/offline-review.ts` assigns user-specific local-storage keys and validates
  snapshots before the UI uses them.

### Current API and worker: `apps/api`

```text
apps/api/
├── prisma/
│   ├── schema.prisma         # Current database models and relations
│   ├── seed.ts               # Idempotent demo data setup
│   └── migrations/           # SQL history applied by Prisma migrate deploy
├── src/
│   ├── controllers/          # HTTP request parsing and response mapping
│   ├── middleware/           # Authentication and centralized errors
│   ├── repositories/         # Prisma/database access
│   ├── routes/               # Express route registration
│   ├── services/             # Business rules and external integrations
│   ├── app.ts                # Express app assembly and route mounting
│   ├── config.ts             # Validated environment configuration
│   ├── index.ts              # API process and dependency wiring
│   ├── realtime.ts           # Authenticated Socket.IO and Redis adapter
│   └── worker.ts             # BullMQ topic extraction process
├── test/                     # API/service validation and integration tests
├── .env.example              # API environment-variable example
└── package.json              # API scripts and dependencies
```

The backend follows a separation of responsibility:

1. A **route** maps an HTTP method/path to a controller.
2. **Auth middleware** validates the bearer token and attaches the user ID.
3. A **controller** validates request data with shared Zod schemas, invokes a
   service, and writes the HTTP response.
4. A **service** enforces the product rules and coordinates dependencies.
5. A **repository** performs user-scoped Prisma queries and mutations.
6. Errors flow to `middleware/error-handler.ts`; services use `HttpError` for
   expected HTTP failures.

Key service files:

- `services/auth.service.ts`: Argon2 password hashing/verification, JWT issue
  and verification, and public user projection.
- `services/topics.service.ts`: topic/unit operations, upload-ticket handling,
  upload validation/storage handoff, background-job scheduling, and status
  reads.
- `services/upload-validation.ts`: file-signature and MIME checks, PDF parsing,
  20 MB file limit, and per-topic two-page/two-image limits.
- `services/upload-storage.ts`: local or Cloudinary persistence, reading,
  cleanup, signed upload metadata, and Cloudinary verification.
- `services/gemini-extraction.ts`: sends uploaded content to Gemini and validates
  the JSON extraction response.
- `services/explain.service.ts` and `services/explain-analysis.ts`: analysis
  orchestration, score calculation, keyword fallback, persistence, and
  per-key-point feedback.
- `services/places.service.ts`: place/flag operations, link ownership checks,
  review scheduling integration, share-token creation/revocation, and public
  share projection.
- `services/flag-review.ts`: interval/ease update calculation for spaced
  repetition.
- `services/recall.service.ts` and `services/recall-analysis.ts`: round
  lifecycle, answer validation, self-grading, Gemini voice checking, and
  completion summary.

### Shared package: `packages/shared`

- `src/rest.ts` contains Zod request/response schemas and inferred API types.
- `src/socket.ts` defines typed, validated Socket.IO event payloads and
  worker-to-API event messages.
- `src/jobs.ts` defines the validated topic-extraction queue payload.
- `src/index.ts` re-exports shared contracts.

Changing an API contract should generally begin in this package, then be wired
through its controller/service and the frontend API client. Keeping validation
and inferred types shared avoids separate, drifting definitions.

### Retained legacy app

`client/src/` contains the older JavaScript React frontend:

- `App.jsx` sets up routing, query cache, session provider, and the exam
  calendar.
- `pages/` contains the legacy Home, Topic, Explain, Palace, PlaceView, Recall,
  and Login screens.
- `components/` contains legacy Palace/Recall UI and `ExamCalendar.jsx`.
- `hooks/` contains speech, recall timer, study, and place hooks.
- `lib/api.js`, `lib/endpoints.js`, and `lib/mockApi.js` implement its API
  access and optional mock mode; `SessionContext.jsx` owns its session state.

`server/src/` contains the older JavaScript Express API:

- `index.js` mounts auth, dashboard, units, topics, explanations, places, flags,
  recall, and exams routes.
- `routes/` maps legacy endpoints to `controllers/`.
- `controllers/` handles request/response details.
- `services/` contains Prisma access, storage, scoring, recall selection,
  countdown, and dashboard task logic.
- `ai/` contains Gemini prompts/client, response validation, and keyword
  fallback.
- `middleware/` contains legacy auth, upload, rate-limit, and error handling.
- `prisma/` contains the legacy schema, seed, and migration history.

Use the legacy app's own `client/package.json`, `server/package.json`, and
`.env.example` files when working on it; the current monorepo setup commands do
not migrate the legacy code.

## 4. How the current application starts

### Browser startup

1. [`main.tsx`](../apps/web/src/main.tsx) creates a TanStack Query client,
   installs React Router, imports the global stylesheet, and renders `App`.
2. In production, it registers `public/service-worker.js`.
3. [`App.tsx`](../apps/web/src/App.tsx) wraps the route tree in `AuthProvider`
   and `SocketProvider`.
4. The route guard shows the login page for unauthenticated users, a loading
   state while authentication is checked, and the authenticated navigation
   shell for signed-in users.
5. `/shared/:token` is intentionally public and is handled separately from
   signed-in application routes.

### Authentication and API requests

- [`auth.tsx`](../apps/web/src/auth.tsx) stores the access token in
  `localStorage` and caches the last known user profile for offline navigation.
- On startup, it calls `GET /me`. A `401` clears the token/profile; network
  failures and other non-401 errors retain the cached user so offline review can
  open. The request aborts after eight seconds.
- [`api.ts`](../apps/web/src/api.ts) is the typed fetch wrapper. It attaches
  `Authorization: Bearer <token>`, encodes JSON, parses error messages, and
  exposes methods for topics, units, places, flags, share links, and recall.
- React Query pages use a query key containing the token, which keeps cached
  data scoped to the current session.

### API process startup

1. [`config.ts`](../apps/api/src/config.ts) validates environment variables
   before the app starts.
2. [`index.ts`](../apps/api/src/index.ts) creates Prisma-backed repositories,
   services, Redis clients, the BullMQ queue, storage, and the realtime server.
3. [`app.ts`](../apps/api/src/app.ts) installs JSON parsing, CORS, HTTP logging,
   routes, health/readiness endpoints, and the central error handler.
4. `/health` confirms that the HTTP process responds. `/ready` checks PostgreSQL
   and Redis and returns `503` if either dependency is unavailable.
5. Shutdown handlers close sockets, queues, Redis, Prisma, and the HTTP server.

The background worker runs separately through `apps/api/src/worker.ts`. It
consumes the `pinpoint` BullMQ queue and publishes progress/failure events
through Redis for the API's Socket.IO server to deliver to the owning user.

## 5. Main user flows and the files involved

### A. Topic creation and material extraction

1. `TopicPage.tsx` loads topics/units and creates a topic through `api.ts`.
2. For an upload, the browser checks the size and compresses images. It requests
   an upload ticket from `POST /topics/:id/upload-ticket`.
3. The API checks topic ownership and returns either a local-upload token or
   Cloudinary signed-upload information.
4. A local upload posts multipart content to
   `POST /topics/:id/files/local`. For Cloudinary, the browser uploads using
   the signed ticket, then posts the upload metadata for API verification.
5. `TopicsService` consumes the single-use token/nonce, checks the file
   signature and MIME type, checks PDF page count and topic limits, stores the
   file, creates a database record, then enqueues a BullMQ job.
6. `worker.ts` reads the file, checks its queue payload, applies a Gemini rate
   limit, asks `GeminiExtractionService` for a title, notes, and 5–8 key points,
   validates the response, and emits progress/completion/failure events.
7. `TopicPage` receives Socket.IO events and also polls file status as a
   fallback. It presents the extraction as an editable draft; the user saves
   accepted content with `PATCH /topics/:id`.

### B. Explain and feedback

1. `ExplainPage.tsx` loads topics and offers one-, two-, three-, or five-minute
   sessions.
2. Speech is transcribed in the browser with the Web Speech API; typing is
   supported when speech recognition or microphone permissions are unavailable.
3. The browser requires at least 15 words and submits the transcript and
   duration to `POST /topics/:id/explain`.
4. `ExplainService` verifies ownership/key points and applies a per-user
   rate limit. It asks Gemini for per-point statuses or uses
   `keywordExplain` if Gemini is unavailable/invalid.
5. `calculateExplainScore` computes a deterministic score (covered = 1,
   partial = 0.5, incorrect/missing = 0). The API saves the explanation and
   topic mastery, then streams validated point feedback through Socket.IO.
6. The page shows the score, evidence, summary, and next focus points; it can
   navigate the user to Palace to pin learning gaps.

### C. Palace, flags, and shares

1. `PalacePage.tsx` gets the signed-in user's places and opens
   `AddPlaceDialog.tsx` to upload a photo.
2. The API validates image type/signature and size, stores the image, and
   creates the owned place.
3. `PlaceViewPage.tsx` loads place data. `PlaceCanvas.tsx` draws the photo and
   flags; marker x/y coordinates are percentages of the displayed image.
4. Tapping the image while adding a flag opens `FlagPanel.tsx`; dragging an
   existing marker updates its position. Flag/topic/key-point links are checked
   against ownership before saving.
5. Walk-through mode selects flags in creation order and presents their saved
   title/note one by one.
6. Creating a share link generates a random 32-byte token. Only its SHA-256 hash
   is stored. Creating a replacement revokes the prior active link; the owner
   may also revoke it manually.
7. `/shared/:token` calls the public shared-place endpoint. It returns only the
   place name/photo and flag display fields; it does not expose linked topic
   notes or editing operations.

### D. Timed recall and spaced review

1. `RecallPage.tsx` requests a round from `POST /recall/start`, with a time
   limit and optional speed-round setting.
2. The API selects one of the user's places with flags and returns marker
   positions without answer text. The user selects a marker to start its timer.
3. The browser can reveal the answer for self-grading, or submit a typed or
   browser-transcribed response for Gemini checking.
4. Each result is checked against the active user's round and flag. Results
   store the grade, elapsed seconds, grading source, and optional transcript /
   AI feedback.
5. Recording a result updates that flag's review interval and due date in the
   same database transaction. Correct answers advance the interval; incorrect
   answers set it back to one day and lower ease within its configured floor.
6. Finishing a round marks unanswered flags as missed. The completion screen
   shows each flag and its result.
7. The due-review queue uses `GET /flags/due`; marking a due flag correct or
   incorrect calls `POST /flags/:id/review` and refreshes the queue.

### E. Offline review

- The user downloads their place names and flag title/note/emoji through
  `GET /recall/offline`. The page stores the validated snapshot in
  `localStorage`, keyed by user ID.
- When offline, the cached user profile allows the authenticated shell and
  offline flashcard UI to open. Offline review does not submit grades to the
  server; users need to reconnect to save review results.
- The production service worker caches the app shell and same-origin GET
  responses. API and uploaded media are generally hosted on another origin and
  are not the offline flashcard data store.
- Offline data is local to the browser/device and remains sensitive. Do not
  download it on a shared device.

## 6. Database model overview

The current Prisma schema is [`schema.prisma`](../apps/api/prisma/schema.prisma).
The migration history is under
[`apps/api/prisma/migrations`](../apps/api/prisma/migrations).

| Model | What it stores | Main relationships |
| --- | --- | --- |
| `User` | Account name/email, password hash, pass mark | Owns units, topics, places, recall rounds, and exams |
| `Unit` | A grouping for topics | Belongs to a user; may contain topics and exams |
| `Topic` | Title, notes, key-point JSON, mastery, next key-point ID | Belongs to a user; can be assigned to a unit |
| `TopicFile` | Uploaded file URL/type/page count | Belongs to a topic |
| `Explanation` | Transcript, duration, score, point statuses, summary, next focus | Belongs to a topic |
| `Place` | Memory palace name and image URL | Belongs to a user; owns flags and shares |
| `Flag` | Image coordinates, title/note/emoji, optional topic/key-point link, review schedule | Belongs to a place; may be linked to a topic |
| `PlaceShare` | Hashed bearer token and revocation timestamps | Belongs to a place; cascading deletion removes its links |
| `RecallRound` | User/place, timer setting, speed mode, start/finish times | Belongs to a user and place |
| `RecallResult` | Flag grade, time, optional voice transcript and feedback | Belongs to a round and flag |
| `Exam` | Exam name/date and optional unit | Belongs to a user; optional unit link |

The `Exam` model is present in the current schema and seed data. The current
TypeScript API/web route set does not yet expose the legacy exam-calendar
experience; that functionality remains in `client/` and `server/`.

Migrations are additive. Use `npm run db:migrate` / `prisma migrate deploy` to
apply committed migrations; do not reset a database to resolve ordinary schema
drift without first understanding which schema and migration history it uses.

## 7. Current API route map

All routes below require a bearer token except health endpoints, auth endpoints,
and public share reads.

| Area | Routes |
| --- | --- |
| Health/auth | `GET /health`, `GET /ready`, `POST /auth/signup`, `POST /auth/login`, `GET /me` |
| Units/topics | `GET, POST /units`; `GET, POST /topics`; `GET, PATCH /topics/:id` |
| Uploads | `POST /topics/:id/upload-ticket`; `POST /topics/:id/files/local`; `POST /topics/:id/files/cloudinary`; `GET /topics/:id/files/:fileId` |
| Explain | `POST /topics/:id/explain` |
| Places | `GET, POST /places`; `GET, PATCH, DELETE /places/:id` |
| Flags/reviews | `GET /flags/due`; `POST /flags`; `PATCH, DELETE /flags/:id`; `POST /flags/:id/review` |
| Shares | `GET, POST, DELETE /places/:id/share`; public `GET /shared/:token` |
| Recall | `GET /recall/offline`; `POST /recall/start`; `POST /recall/:roundId/reveal`; `POST /recall/:roundId/result`; `POST /recall/:roundId/voice-answer`; `POST /recall/:roundId/finish` |

Routes are assembled in [`apps/api/src/app.ts`](../apps/api/src/app.ts); the
concrete path-to-controller mapping is in `apps/api/src/routes/`.

## 8. Realtime event path

The web app opens an authenticated Socket.IO connection in `socket.tsx`.
`realtime.ts` validates the JWT and joins the socket to `user:<id>`. The worker
does not emit directly to browser sockets; it publishes validated messages to
Redis through `services/redis-events.ts`. The API subscribes and emits those
messages only to the matching user's room.

The current UI primarily uses realtime for:

- `file:processing`, `file:progress`, `file:done`, and `file:error` during
  extraction.
- `explain:analyzing` and `explain:result` during Explain.
- `dashboard:updated` after relevant saved changes.

Shared event schemas live in `packages/shared/src/socket.ts`. HTTP status
polling remains a fallback for upload jobs if the browser misses a socket event.

## 9. Environment and local development

Current frontend values are in `apps/web/.env.example`:

- `VITE_API_URL`: API base URL, normally `http://localhost:4100`.
- `WEB_PORT`: Vite port, normally `5180`.

Current API values are in `apps/api/.env.example`:

- `DATABASE_URL`, `REDIS_URL`: PostgreSQL and Redis connections.
- `JWT_SECRET`: at least 32 characters; use a strong private value outside local
  development.
- `WEB_ORIGIN`, `PORT`: browser origin and API port.
- `GEMINI_API_KEY`, `GEMINI_MODEL`: AI integration; voice checking requires a
  configured Gemini key, while Explain has a keyword fallback.
- `STORAGE_PROVIDER`, `UPLOAD_DIR`, `API_PUBLIC_URL`: local or Cloudinary file
  handling.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`:
  required only when Cloudinary is enabled.
- `DEMO_PASSWORD`: seed account password; local default only.

### Recommended Docker path

From the repository root:

```powershell
docker compose up -d
```

The stack exposes the web app at `http://localhost:5180`, API at
`http://localhost:4100`, PostgreSQL at `localhost:5433`, and Redis at
`localhost:6380`. Compose starts migrations and seed setup in the API container.
The demo account is `demo@pinpoint.app`; its development password is documented
in [`LOCAL_SETUP.md`](./LOCAL_SETUP.md).

### Running services without Docker

Install Node.js 22+, PostgreSQL, and Redis. Copy the current app env examples to
local `.env` files, then run:

```powershell
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:all
```

`scripts/dev-all.mjs` starts API, worker, and web workspaces, waits for API/web
readiness, opens the web app, and stops its child processes if a service exits.
The API and worker need PostgreSQL, Redis, and matching `DATABASE_URL` /
`REDIS_URL` values before starting.

## 10. Useful root commands

| Command | Purpose |
| --- | --- |
| `npm run dev:all` | Run current API, worker, and web app together |
| `npm run build` | Build shared contracts, API, and web app |
| `npm run typecheck` | Typecheck all current workspaces |
| `npm run lint` | Lint shared, API, and web workspaces |
| `npm test` | Run shared and API tests |
| `npm run db:generate` | Generate Prisma Client for the current API |
| `npm run db:migrate` | Apply committed current API migrations |
| `npm run db:seed` | Upsert local demo data |

The root `install:all`, `dev:server`, and `dev:client` scripts are legacy-app
helpers. For the TypeScript app, use the commands in the table above.

## 11. Tests and validation

- `apps/api/test/` covers auth, ownership, upload validation/tickets/page limits,
  socket contracts, Explain scoring, Palace validation, and review scheduling.
- `packages/shared` has tests for shared contract behavior.
- `client/src/lib/examCalendar.test.js` covers legacy exam-calendar logic.
- The API ownership integration test needs a configured, migrated database;
  without `DATABASE_URL` it is skipped.
- Run `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` after
  changes that affect the current app. Use the smaller workspace commands when
  iterating on one area.

## 12. Known boundaries to remember

- Gemini is an external dependency. Extraction fails explicitly if the API key
  is absent; Explain can fall back to keyword analysis; AI-checked Recall voice
  answers cannot fall back to self-grading automatically, but the user can
  choose the separate self-grade path.
- Browser speech recognition support varies. Typed input is the fallback.
- Offline mode means cached app shell plus a saved local flashcard snapshot; it
  does not make API mutations work offline.
- The public share route deliberately exposes a limited read-only projection.
- The current Home screen is a lightweight learning overview, not the complete
  legacy exam calendar/mastery-task dashboard.
- The codebase is mid-migration. Keep changes scoped to one implementation
  unless cross-app parity is explicitly required.
