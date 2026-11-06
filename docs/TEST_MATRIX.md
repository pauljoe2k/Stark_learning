# Pinpoint Verification Matrix

Date: 2026-11-06

Scope: current TypeScript monorepo only: `apps/api`, `apps/web`, and
`packages/shared`. The legacy `client/` and `server/` folders are excluded.
The Express route inventory was compared with the route map in
[`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).

**PASS** means an automated test or recorded browser check directly exercised
the behavior listed. **FAIL** means an executed check failed. **MISSING** means
no test was run for that item. **NOT VERIFIED** means coverage is partial or
depends on a live integration/device that was not exercised. A pass for a
grouped row does not imply every edge case in that group was tested; details
are recorded in the item and notes.

## API exported functions, middleware, controllers, services and repositories

| Item | File | Test | Status |
|---|---|---|---|
| `createApp`, route mounting, `GET /health`, `GET /ready` | `apps/api/src/app.ts` | `apps/api/test/routes.test.ts`; live HTTP checks | PASS |
| Config schema and parsed environment config | `apps/api/src/config.ts` | NONE | MISSING |
| `HttpError`, auth middleware, JSON/request error middleware | `apps/api/src/errors.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/middleware/error-handler.ts` | `apps/api/test/auth.test.ts`, `apps/api/test/routes.test.ts` | PASS |
| Logger initialization/output | `apps/api/src/logger.ts` | NONE | NOT VERIFIED |
| `createAuthController.signup`, `.login`, `.me`; `AuthService.signup`, `.login`, `.getUser`, token helpers | `apps/api/src/controllers/auth.controller.ts`, `apps/api/src/services/auth.service.ts` | `apps/api/test/auth.test.ts` | PASS |
| `PrismaAuthRepository.findByEmail`, `.findById`, `.create` | `apps/api/src/repositories/auth.repository.ts` | Auth tests use a memory repository; no direct Prisma repository test | NOT VERIFIED |
| `createUnitsController.list`, `.create`; `TopicsService` unit/topic read/create/update methods | `apps/api/src/controllers/units.controller.ts`, `apps/api/src/services/topics.service.ts` | `apps/api/test/routes.test.ts`, `apps/api/test/ownership.test.ts` | PASS |
| `createTopicsController.list`, `.get`, `.create`, `.update`, `.ticket`, `.localUpload`, `.cloudinaryFinalize`, `.fileStatus` | `apps/api/src/controllers/topics.controller.ts` | `apps/api/test/routes.test.ts` | PASS |
| `PrismaTopicsRepository` read/write/file-limit methods | `apps/api/src/repositories/topics.repository.ts` | `apps/api/test/topic-file-limits.test.ts`, `apps/api/test/ownership.test.ts` | PASS |
| `UploadTicketManager.issue`, `.consumeToken`, `.consumeNonce` | `apps/api/src/services/upload-tickets.ts` | `apps/api/test/upload-tickets.test.ts` | PASS |
| `UploadStorage.saveLocal`, `.read`, `.removeLocal`, Cloudinary signing/verification | `apps/api/src/services/upload-storage.ts` | `apps/api/test/upload-storage.test.ts` (Cloudinary mocked) | PASS |
| Upload file-signature, MIME, size, PDF page-count and topic page-limit validation | `apps/api/src/services/upload-validation.ts` | `apps/api/test/upload-validation.test.ts`, `apps/api/test/topic-file-limits.test.ts` | PASS |
| `GeminiExtractionService.extract`, output validation/retry/missing-key handling | `apps/api/src/services/gemini-extraction.ts` | `apps/api/test/gemini-extraction.test.ts` (Gemini mocked) | PASS |
| `processTopicExtraction`, BullMQ queue consumption and worker success/failure event flow | `apps/api/src/worker.ts` | NONE (worker was not run against a queued upload) | NOT VERIFIED |
| `createExplainController.submit`, `ExplainService.submit`, score/fallback/analysis validation | `apps/api/src/controllers/explain.controller.ts`, `apps/api/src/services/explain.service.ts`, `apps/api/src/services/explain-analysis.ts` | `apps/api/test/explain-analysis.test.ts`, `apps/api/test/routes.test.ts` | PASS |
| `GeminiExplainService.analyze` adapter | `apps/api/src/services/gemini-explain.ts` | NONE (service analyzer is mocked) | NOT VERIFIED |
| `PrismaExplanationsRepository.findTopicForExplain`, `.saveExplanation` | `apps/api/src/repositories/explanations.repository.ts` | Mock repository in `apps/api/test/explain-analysis.test.ts`; no direct Prisma repository test | NOT VERIFIED |
| `createPlacesController` CRUD/share handlers; `createFlagsController` create/update/delete/due/review handlers | `apps/api/src/controllers/places.controller.ts`, `apps/api/src/controllers/flags.controller.ts` | `apps/api/test/routes.test.ts` | PASS |
| `PlacesService` place/flag/review/share methods, image-signature and topic/key-point ownership checks | `apps/api/src/services/places.service.ts` | `apps/api/test/places-service.test.ts`, `apps/api/test/places-validation.test.ts`, `apps/api/test/ownership.test.ts` | PASS |
| `PrismaPlacesRepository` place/flag/share operations and cascade relations | `apps/api/src/repositories/places.repository.ts` | `apps/api/test/places-service.test.ts`, `apps/api/test/ownership.test.ts` | PASS |
| `scheduleFlagReview` correct/incorrect interval and ease-floor math | `apps/api/src/services/flag-review.ts` | `apps/api/test/flag-review.test.ts`, DB-backed `apps/api/test/ownership.test.ts` | PASS |
| `createRecallController`; `RecallService.start`, `.reveal`, `.answerByVoice`, `.answerBySelfGrade`, `.finish`, `.offlineReview`; `keyPointText` | `apps/api/src/controllers/recall.controller.ts`, `apps/api/src/services/recall.service.ts`, `apps/api/src/repositories/recall.repository.ts` | `apps/api/test/recall-service.test.ts`, `apps/api/test/routes.test.ts`, `apps/api/test/ownership.test.ts` | PASS |
| `RecallAnalysisService.check` and live Gemini voice grading | `apps/api/src/services/recall-analysis.ts` | Recall service uses a mocked checker; live Gemini was not configured | NOT VERIFIED |
| `createSharedPlacesController.get`, public projection, token rotation/revocation | `apps/api/src/controllers/shared-places.controller.ts`, `apps/api/src/services/places.service.ts` | `apps/api/test/routes.test.ts`, `apps/api/test/places-service.test.ts`, browser share/revoke smoke | PASS |
| `OwnershipRepository` lookup methods for units, topics/files, explanations, places/flags, rounds/results and exams | `apps/api/src/repositories/ownership.repository.ts` | DB-backed `apps/api/test/ownership.test.ts` | PASS |
| Prisma client initialization and database-backed persistence | `apps/api/src/repositories/prisma.ts` | DB-backed ownership, topic-limit and Palace suites; live readiness | PASS |
| Redis publisher/parser payload validation | `apps/api/src/services/redis-events.ts` | `apps/api/test/socket-contract.test.ts` with mocked Redis | PASS |
| Live Redis pub/sub delivery | `apps/api/src/services/redis-connection.ts`, `apps/api/src/services/redis-events.ts` | No live pub/sub event test | NOT VERIFIED |
| `createRealtime`, `emitUserEvent`, user-room emission and outgoing validation | `apps/api/src/realtime.ts` | `apps/api/test/socket-contract.test.ts` (mocked emitter) | PASS |
| Socket.IO JWT handshake, reconnect/resume, and cross-user delivery | `apps/api/src/realtime.ts`, `apps/web/src/socket.tsx` | No real Socket.IO client/server isolation test | NOT VERIFIED |

## Express routes

| Route(s) | File | Test | Status |
|---|---|---|---|
| `POST /auth/signup`, `POST /auth/login`, `GET /me` | `apps/api/src/routes/auth.routes.ts`, `apps/api/src/app.ts` | `apps/api/test/auth.test.ts` | PASS |
| `GET, POST /units` | `apps/api/src/routes/units.routes.ts` | `apps/api/test/routes.test.ts` | PASS |
| `GET, POST /topics`; `GET, PATCH /topics/:id` | `apps/api/src/routes/topics.routes.ts` | `apps/api/test/routes.test.ts` | PASS |
| `POST /topics/:id/upload-ticket`, `/files/local`, `/files/cloudinary`; `GET /topics/:id/files/:fileId` | `apps/api/src/routes/topics.routes.ts` | `apps/api/test/routes.test.ts`; upload validation/storage suites | PASS |
| `POST /topics/:id/explain` | `apps/api/src/routes/explain.routes.ts` | `apps/api/test/routes.test.ts`, `apps/api/test/explain-analysis.test.ts` | PASS |
| `GET, POST /places`; `GET, PATCH, DELETE /places/:id`; `GET, POST, DELETE /places/:id/share` | `apps/api/src/routes/places.routes.ts` | `apps/api/test/routes.test.ts`, `apps/api/test/places-service.test.ts` | PASS |
| `GET /flags/due`; `POST /flags`; `PATCH, DELETE /flags/:id`; `POST /flags/:id/review` | `apps/api/src/routes/flags.routes.ts` | `apps/api/test/routes.test.ts`, `apps/api/test/places-service.test.ts` | PASS |
| `GET /recall/offline`; `POST /recall/start`; `POST /recall/:roundId/reveal`, `/result`, `/voice-answer`, `/finish` | `apps/api/src/routes/recall.routes.ts` | `apps/api/test/routes.test.ts`, `apps/api/test/recall-service.test.ts` | PASS |
| Public `GET /shared/:token` | `apps/api/src/routes/shared-places.routes.ts` | `apps/api/test/routes.test.ts`, Palace integration test, browser share/revoke smoke | PASS |
| `GET /health`, `GET /ready`, fallback 404 and error middleware | `apps/api/src/app.ts` | `apps/api/test/routes.test.ts`; live health/readiness | PASS |

## Shared schemas, events and jobs

| Item | File | Test | Status |
|---|---|---|---|
| REST schemas for auth, IDs, units/topics/key points, explain, uploads, places/flags, recall/reviews, shares and exams | `packages/shared/src/rest.ts` | `packages/shared/test/schemas.test.ts` | PASS |
| `topicExtractionJobSchema` | `packages/shared/src/jobs.ts` | `packages/shared/test/schemas.test.ts` | PASS |
| All 13 socket events and client/server event-map alignment | `packages/shared/src/socket.ts` | `packages/shared/test/schemas.test.ts`, `apps/api/test/socket-contract.test.ts` | PASS |
| `workerSocketMessageSchema` and event envelope | `packages/shared/src/socket.ts` | `packages/shared/test/schemas.test.ts`, `apps/api/test/socket-contract.test.ts` | PASS |
| Public exports | `packages/shared/src/index.ts` | Workspace build and typecheck | PASS |

Socket events inventoried: `file:processing`, `file:progress`, `file:done`,
`file:error`, `explain:analyzing`, `explain:result`, `explain:transcript`,
`recall:start`, `recall:flagResult`, `recall:finished`, `recall:state`,
`recall:resume`, and `dashboard:updated`.

## Frontend pages, components, hooks and client utilities

| Item | File | Test or browser check | Status |
|---|---|---|---|
| `App`, route guards, route rendering, connection badge and logout | `apps/web/src/App.tsx` | Browser signup/navigation; shared-route regression test | PASS |
| `LoginPage` sign-up/sign-in UI | `apps/web/src/pages/LoginPage.tsx` | Browser signup smoke; API login suite | PASS |
| `HomePage` overview and navigation | `apps/web/src/pages/HomePage.tsx` | Browser smoke with loaded dashboard data | PASS |
| `TopicPage` topic creation, file upload states, key-point editing/save and poller | `apps/web/src/pages/TopicPage.tsx` | Browser topic creation; upload/worker UI completion not exercised | NOT VERIFIED |
| `ExplainPage` typed/voice flow, timer, 15-word rejection, feedback/gap map | `apps/web/src/pages/ExplainPage.tsx` | Browser typed explanation on seeded topic; API scoring/fallback tests; mic denial not exercised | NOT VERIFIED |
| `PalacePage` listing and add-place launch | `apps/web/src/pages/PalacePage.tsx` | Browser created a temporary place with an image | PASS |
| `PlaceViewPage` rename/delete, flag save/delete, walkthrough, share/revoke | `apps/web/src/pages/PlaceViewPage.tsx` | Browser created a flag, shared publicly and revoked; rename/delete UI not exercised | NOT VERIFIED |
| `RecallPage` one-tap selection/timer, reveal, self-grade, finish and offline flashcards | `apps/web/src/pages/RecallPage.tsx` | Browser smoke: one tap activated timer; missed grade, finish and offline review completed | PASS |
| `SharedPlacePage` public read-only view and unavailable state | `apps/web/src/pages/SharedPlacePage.tsx` | Browser share/revoke smoke; `apps/web/test/shared-place-route.test.ts` | PASS |
| `AddPlaceDialog` photo upload | `apps/web/src/components/palace/AddPlaceDialog.tsx` | Browser created temporary place with photo | PASS |
| `PlaceCanvas` percentage placement, tap-vs-drag and zoom/pan | `apps/web/src/components/palace/PlaceCanvas.tsx` | Browser single-click flag placement; real drag/touch behavior not exercised | NOT VERIFIED |
| `FlagMarker` select/drag callbacks | `apps/web/src/components/palace/FlagMarker.tsx` | Browser selected newly created flag; drag not exercised | NOT VERIFIED |
| `FlagPanel` create/edit/save/delete/cancel | `apps/web/src/components/palace/FlagPanel.tsx` | Browser create/save only | NOT VERIFIED |
| `PlaceCard` | `apps/web/src/components/palace/PlaceCard.tsx` | Browser rendered created place card | PASS |
| `CameraCapture` permission, capture, denied/unavailable fallback | `apps/web/src/components/CameraCapture.tsx` | NONE | NOT VERIFIED |
| `usePlaces`, `usePlace`, create/rename/delete place and flag hooks | `apps/web/src/hooks/usePlaces.ts` | Browser exercised read/create paths; full mutation matrix is not covered | NOT VERIFIED |
| `AuthProvider`, `useAuth`, cached session, 401 and network-error behavior | `apps/web/src/auth.tsx` | Browser signup; no component tests for cache/error branches | NOT VERIFIED |
| `SocketProvider`, `useSocket`, reconnection state | `apps/web/src/socket.tsx` | Browser showed connected state; reconnect/user-isolation behavior not exercised | NOT VERIFIED |
| API client auth headers, error parsing and endpoint methods | `apps/web/src/api.ts` | Browser exercised API-backed flows; no direct client unit suite | NOT VERIFIED |
| `offlineReviewKey`, `parseOfflineReviewSnapshot` | `apps/web/src/lib/offline-review.ts` | `apps/web/test/offline-review.test.ts` | PASS |
| PWA registration, manifest, app-shell caching and API cache exclusion | `apps/web/src/main.tsx`, `apps/web/public/manifest.webmanifest`, `apps/web/public/service-worker.js` | Browser verified active registration, valid manifest, cached shell and uncached cross-origin API health request; source confirms GET/same-origin filter | PASS |

## End-to-end and environmental checks

| Flow or integration | Test or browser check | Status |
|---|---|---|
| Auth: duplicate email, wrong password, Argon2, JWT tamper/expiry and `/me` token cases | `apps/api/test/auth.test.ts` | PASS |
| Database owner isolation for units/topics/files/explanations/places/flags/rounds/results/exams and linked topic/key-point ownership | `apps/api/test/ownership.test.ts` | PASS |
| Upload tickets, nonce replay, MIME/signature, 20 MB, PDF page/corruption and image-count limits; local storage and mocked Cloudinary | `apps/api/test/upload-*.test.ts`, `apps/api/test/topic-file-limits.test.ts` | PASS |
| Worker consumes a real queued upload and delivers `file:done`/`file:error` only to the owner's live Socket.IO room | Worker/Redis/Socket integration | NOT VERIFIED — no worker queue consumption or real socket delivery was run |
| Explain thresholds, score rounding, keyword fallback, quota, persistence and mocked events | `apps/api/test/explain-analysis.test.ts` | PASS |
| Palace image signature, CRUD/cascades, bounds, link ownership, review schedule, share hashing/rotation/revocation/projection | `apps/api/test/places-service.test.ts`, `apps/api/test/places-validation.test.ts`, `apps/api/test/flag-review.test.ts`, `apps/api/test/ownership.test.ts` | PASS |
| Recall start/reveal, hidden answer, self-grade/voice mock, duplicate/wrong flags, timeout finish and offline snapshot | `apps/api/test/recall-service.test.ts`, `apps/api/test/routes.test.ts`, browser recall smoke | PASS |
| Signup → topic creation → place/photo → flag → one-tap Recall → self-grade → offline flashcard → public share → revoke/404 | Browser smoke against rebuilt Compose web/API stack | PASS |
| Upload a PDF → worker `file:done` → extracted key-point editing → typed explain/gap map in one account | Full browser/worker flow | NOT VERIFIED — `GEMINI_API_KEY` was unset; no live Gemini call was made |
| Real Cloudinary upload and verification | Cloudinary integration | NOT VERIFIED — mocked only; no live credentials or external upload |
| Redis readiness and actual pub/sub delivery | Compose readiness plus mocked publisher/parser tests | NOT VERIFIED for live event delivery |
| Live Socket.IO JWT handshake and cross-account room isolation | Socket.IO integration | NOT VERIFIED |
| Phone HTTPS camera, browser speech recognition, real touch/pinch gestures, PWA install, airplane-mode behavior | Manual device/browser checks | NOT VERIFIED |
