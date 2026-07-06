## Why

The backend and frontend apps currently have no local dependencies to run against — no Postgres for Prisma, no Redis for caching/BullMQ, no SMTP sandbox for email flows (verification, password reset). Every subsequent feature (auth, queues, notifications) needs these services running locally before it can be implemented or tested. Standardizing them now, in one `docker compose up`, avoids each developer (or future-me) hand-installing and configuring services individually.

## What Changes

- Add a root-level `docker-compose.yml` defining three services: `postgres`, `redis`, and `mailpit` (SMTP + web UI for catching outgoing emails in development).
- Add a root-level `.env.example` documenting the environment variables the compose file and apps need (DB credentials, ports, Redis URL).
- Persist Postgres data via a named Docker volume so data survives `docker compose down` (but not `docker compose down -v`).
- Expose standard ports so `apps/backend` can connect via `DATABASE_URL` / `REDIS_URL` without extra networking config.
- No application code changes — this is infrastructure only. `apps/backend` will consume `DATABASE_URL`/`REDIS_URL` in a later change (Prisma setup).

## Capabilities

### New Capabilities
- `local-dev-infra`: Defines the local development infrastructure (Postgres, Redis, Mailpit) provisioned via Docker Compose, including required environment variables and service configuration.

### Modified Capabilities
(none — no existing specs yet)

## Impact

- Affected code: new root-level `docker-compose.yml`, `.env.example`.
- Affected systems: local developer environment only; no production infrastructure is touched by this change.
- Dependencies: requires Docker Desktop installed locally (not automated by this change).
- Downstream: unblocks the upcoming Prisma + Postgres connection change for `apps/backend`.
