## Why

Local dev today is a split workflow: `docker compose up` only starts Postgres,
Redis, and Mailpit — the frontend and backend still run as two separate
`pnpm --filter ... dev` processes outside Docker, and Stripe webhook
forwarding needs a third process (`stripe listen`) started by hand. CLAUDE.md's
stated goal is a single `docker compose up` bringing up the whole stack.
Closing this gap now, with the backend module set stable, avoids re-touching
Dockerfiles per feature later.

## What Changes

- Add a multi-stage `Dockerfile` to `apps/backend` (deps → build → slim
  runtime, `node dist/main`), running `prisma migrate deploy` before start.
- Add a multi-stage `Dockerfile` to `apps/frontend` (deps → build → slim
  runtime via Next.js standalone output, `node server.js`).
- Add `backend` and `frontend` services to the root `docker-compose.yml`,
  built from those Dockerfiles, wired to `postgres`/`redis`/`mailpit` via
  `depends_on` with healthchecks, and configured entirely from `.env`.
- Add healthchecks to `postgres`, `redis`, and `mailpit` so `depends_on:
  condition: service_healthy` can gate `backend` startup on real readiness,
  not just container-start ordering.
- Add a `stripe` Compose service (official `stripe/stripe-cli` image) running
  `stripe listen --forward-to backend:<port>/billing/webhook`, authenticated
  headlessly via `STRIPE_API_KEY` (no interactive `stripe login`).
- **BREAKING**: `STRIPE_WEBHOOK_SECRET` moves from a Stripe Dashboard/CLI
  value the developer copies in manually to one captured once via
  `stripe listen --print-secret` and stored in `.env` — existing local
  `.env` files with a stale/manual value need updating.
- Update `.env.example` with the new/changed variables (`STRIPE_API_KEY`,
  container-network URLs) and the README's "Running it locally" section to
  the new single-command flow.

## Capabilities

### Modified Capabilities
- `local-dev-infra`: the compose stack now provisions the frontend, backend,
  and Stripe CLI containers alongside Postgres/Redis/Mailpit, gated by
  healthchecks, startable with one `docker compose up` command that requires
  no local Node/pnpm install.

## Impact

- Affected code: new `apps/backend/Dockerfile`, `apps/frontend/Dockerfile`,
  `.dockerignore` for each app, root `docker-compose.yml`, `.env.example`,
  `README.md`.
- Affected config: `next.config.ts` needs `output: 'standalone'` for the
  frontend's slim runtime image.
- No application code (controllers/services/DTOs) changes — this is
  infrastructure-only.
