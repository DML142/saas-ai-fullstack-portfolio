## Context

`apps/backend` is a bare NestJS scaffold with no persistence layer. `local-dev-infra` already provides a running Postgres container reachable via `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`/`POSTGRES_PORT` in `.env`. This change introduces Prisma as the ORM (per project spec) and proves the full path — app code to database — works via a health-check endpoint, before any real domain models (User, Workspace, etc.) are designed.

## Goals / Non-Goals

**Goals:**
- `apps/backend` can connect to Postgres via Prisma using a `DATABASE_URL` assembled from the existing Postgres env vars.
- Prisma's connection lifecycle is tied to Nest's module lifecycle (connect on startup, disconnect on shutdown) so connections aren't leaked or left dangling.
- A `/health` endpoint proves connectivity by executing a real query through Prisma, not just checking that a client instance exists.
- Migrations are set up so schema changes have a repeatable, versioned path (`prisma migrate dev`) from day one.

**Non-Goals:**
- Designing real domain models (User, Workspace, etc.) — this change's Prisma schema stays minimal/empty beyond what's needed to prove connectivity.
- Connection pooling strategy for production (e.g. PgBouncer, Prisma Accelerate) — deferred until deployment is actually being planned.
- Authentication/authorization — a separate future change.

## Decisions

**Decision: `DATABASE_URL` is assembled in `.env`, not computed at runtime.**
Prisma's `datasource db` block reads a single connection string from an env var. Rather than building it dynamically in code from the separate `POSTGRES_*` vars, `.env.example` gets an explicit `DATABASE_URL` line following the standard `postgresql://user:password@host:port/db` format, referencing the same values already defined for `local-dev-infra`. Alternative considered: compute it in `main.ts` from the individual vars — rejected because Prisma CLI commands (`migrate dev`, `studio`) run outside the Nest app entirely and need `DATABASE_URL` directly from the environment; a runtime-computed value wouldn't be visible to them.

**Decision: Generated Prisma Client output goes to a custom path (e.g. `apps/backend/generated/prisma`), not the default `node_modules/.prisma/client`.**
Recent Prisma versions (7.x) recommend an explicit `output` path in the `generator client` block rather than relying on the implicit `node_modules` location, since generated code inside `node_modules` complicates pnpm's strict, non-hoisted `node_modules` in a workspace. Pinning an explicit output path avoids ambiguity about where the generated client actually lives.

**Decision: `PrismaService` wraps `PrismaClient` and implements `OnModuleInit`/`OnModuleDestroy`.**
This is the standard NestJS integration pattern: a single injectable service extends `PrismaClient`, calls `this.$connect()` in `onModuleInit`, and `this.$disconnect()` in `onModuleDestroy`. This ties the database connection's lifetime explicitly to the Nest application's lifecycle (rather than an ad-hoc singleton created outside DI), and makes the client injectable anywhere via constructor injection like any other Nest provider.

**Decision: `/health` executes `SELECT 1` through Prisma (`$queryRaw`), not just `$connect()`.**
Proves the full round trip (network + auth + query execution), matching the proposal's intent — this is meaningfully different from Docker's own healthcheck, which only proves the container is up, not that this specific app can authenticate and query it.

## Risks / Trade-offs

- [Risk] Forgetting to run `docker compose up` before starting the backend produces a generic Prisma connection-refused error that's confusing to a newcomer → Mitigation: the `/health` endpoint's error response should surface the underlying connection error clearly rather than swallowing it, so the failure mode is diagnosable.
- [Risk] Committing a `DATABASE_URL` with real credentials → Mitigation: only `.env.example` (with placeholder/dev-only values) is committed; `.env` stays gitignored, consistent with `local-dev-infra`.
- [Trade-off] No connection pooler configured yet — acceptable for local development with a single backend instance; revisit once there's an actual production deployment target.

## Migration Plan

Additive only. First `prisma migrate dev` creates the initial migration; no existing data to migrate. Rollback is deleting the `prisma/migrations` folder and re-running against a fresh database (acceptable at this pre-production stage).
