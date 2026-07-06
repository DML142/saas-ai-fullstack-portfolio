## Context

The monorepo currently has `apps/backend` (NestJS) and `apps/frontend` (Next.js) scaffolded and building, but no local services for them to depend on. The project plan (CLAUDE.md) calls for Postgres (via Prisma), Redis (caching, rate limiting, BullMQ), and a mail sandbox (Nodemailer target for verification/reset emails during development) — all of which need to exist before the auth and queue features can be implemented. Docker Compose is the specified tool (project goal: "docker compose up should run frontend, backend, postgres, redis, mailpit").

## Goals / Non-Goals

**Goals:**
- Single `docker compose up` starts Postgres, Redis, and Mailpit with sane defaults for local development.
- Configuration is driven by environment variables (`.env`), not hardcoded into `docker-compose.yml`, so secrets/ports can change per developer without editing the compose file.
- Postgres data persists across container restarts via a named volume.
- Document required env vars in `.env.example` so `apps/backend` knows what to expect once Prisma is wired up (future change).

**Non-Goals:**
- Running `apps/backend`/`apps/frontend` themselves in Docker — that's a later step once both apps are stable; for now they still run via `pnpm dev` on the host, only the *data* services are containerized.
- Production deployment configuration (this is dev-only infra).
- Prisma schema/client setup — a separate follow-up change consumes `DATABASE_URL` once it exists.

## Decisions

**Decision: One `docker-compose.yml` at repo root, not per-app.**
Postgres/Redis/Mailpit are shared infrastructure, not owned by either app individually — putting the file at root reflects that and matches the "single command boots everything" goal from CLAUDE.md.

**Decision: Use official images (`postgres:16-alpine`, `redis:7-alpine`, `axllent/mailpit`) rather than custom Dockerfiles.**
No custom build step is needed for off-the-shelf services; alpine variants keep image size down. Alternative considered: `mailhog` (older, less maintained) — Mailpit was chosen since it's the actively maintained successor with a nicer web UI.

**Decision: Named volume for Postgres only.**
Redis and Mailpit data are ephemeral/disposable in dev (cache and caught test emails don't need to survive a teardown); Postgres holds data you don't want to re-seed on every restart, so it gets a persistent volume.

**Decision: `.env.example` documents variables; real `.env` stays gitignored.**
Standard practice — prevents committing credentials while giving every developer a copy-pasteable starting point (`cp .env.example .env`).

## Risks / Trade-offs

- [Risk] Port collisions with services already running on the host (e.g., a local Postgres install on 5432) → Mitigation: ports are environment-variable driven in `.env.example`, so a developer can remap without touching `docker-compose.yml`.
- [Risk] Forgetting to run `docker compose up` before starting the backend leads to confusing connection-refused errors → Mitigation: out of scope for this change, but worth a README note once Prisma is wired up.
- [Trade-off] Not containerizing the apps themselves means the dev environment isn't fully reproducible yet (host Node/pnpm version still matters) — acceptable for now since the apps are still being actively developed and hot-reload is simpler on the host.

## Migration Plan

Additive only — no existing services to migrate. Rollback is simply `docker compose down -v` and deleting the compose file if the approach needs to change.
