# Pinpoint Verification Report

Date: 2026-11-06

Scope: current TypeScript monorepo (`apps/api`, `apps/web`, `packages/shared`).
The legacy `client/` and `server/` folders were excluded. No product code was
changed.

## Baseline

Commands were run in the requested order. The baseline stopped at the first
failure, as instructed.

| Command | Result |
|---|---|
| `npm install` | PASS — `up to date in 2s` |
| `npm run db:generate` | PASS — Prisma Client v6.19.3 generated |
| `npm run db:migrate` | FAIL — Prisma P1012: required environment variable `DATABASE_URL` is not set |
| `npm run db:seed` | NOT RUN — baseline stopped at migration failure |
| `npm run lint` | NOT RUN — baseline stopped at migration failure |
| `npm run typecheck` | NOT RUN — baseline stopped at migration failure |
| `npm run build` | NOT RUN — baseline stopped at migration failure |
| `npm test` | NOT RUN — baseline stopped at migration failure |
| Stack startup; `GET /health` and `GET /ready` | NOT RUN — baseline stopped at migration failure |

No values from environment files or secrets were read or reported.

## Test matrix

The Phase A inventory and existing-test coverage snapshot are in
[`TEST_MATRIX.md`](./TEST_MATRIX.md). It distinguishes missing tests from
partial coverage and items requiring services/browser capabilities.

## Bugs and fixes

No product failures were investigated or fixed because the baseline is blocked
before the test phase. No commits were created.

## NOT VERIFIED

- Database migration, seeding, and all database-backed API flows: no
  `DATABASE_URL` is available in this environment.
- Lint, typecheck, build, and the automated test suite: not run, per the
  baseline stop rule.
- API readiness and all end-to-end flows: stack was not started.
- Gemini, Cloudinary, Redis pub/sub, Socket.IO delivery, browser speech
  recognition, camera permissions, and mobile pointer gestures: not exercised.

## FEATURE GAPS

- The current Home screen is a lightweight overview rather than the legacy
  exam-calendar/mastery-task dashboard.
- The exam calendar and X marks mentioned in the project documentation are
  available only in the excluded legacy implementation.

## Manual checklist

Not executed; use after the baseline is unblocked:

- Test phone camera capture over HTTPS.
- Test Web Speech in Chrome/Edge.
- Test pinch-zoom and flag placement on a real touchscreen.
- Install the app as a PWA.
- Test offline flashcards in airplane mode.
