## Why

`apps/backend` has no database access layer yet — every planned feature (auth, workspaces, assistants, subscriptions) needs a way to define, migrate, and query data in the Postgres instance already provisioned by `local-dev-infra`. Prisma is the ORM specified for this project. Wiring it up now, with a minimal health-check endpoint proving the connection works end-to-end, unblocks all subsequent backend features.

## What Changes

- Add Prisma as a dependency of `apps/backend`, with `schema.prisma` configured to read `DATABASE_URL` from environment variables.
- Add an initial (empty or near-empty) Prisma schema and run the first migration against the local Postgres container.
- Add a `PrismaService` (NestJS injectable wrapping `PrismaClient`) with proper connection lifecycle (`onModuleInit` connect / `onModuleDestroy` disconnect).
- Add a minimal `/health` endpoint that queries the database (e.g. `SELECT 1` via Prisma) and returns a status response, proving the app-to-database path works, not just that Postgres is reachable directly.
- Add `DATABASE_URL` to root `.env.example` (already partially covered by `local-dev-infra`'s Postgres variables — this change assembles them into the connection string format Prisma expects).

## Capabilities

### New Capabilities
- `backend-database-access`: Defines how `apps/backend` connects to Postgres via Prisma, including connection lifecycle management and a health-check endpoint that verifies database connectivity.

### Modified Capabilities
(none — `local-dev-infra` is consumed as-is, not changed)

## Impact

- Affected code: `apps/backend` (new `prisma/schema.prisma`, new `PrismaService`, new health module/controller), root `.env.example`.
- Dependencies: adds `@prisma/client` and `prisma` (dev dependency) to `apps/backend`.
- Depends on: `local-dev-infra` (Postgres must be running via `docker compose up` for migrations and the health check to succeed).
- Downstream: unblocks the auth module (User model, credentials storage) and every other feature requiring persistence.
