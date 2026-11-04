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
