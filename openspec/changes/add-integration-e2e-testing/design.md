## Context

The backend has unit tests only (mocked `PrismaService`/`RedisService`/BullMQ
queues). The full Docker Compose stack (`docker-compose.yml`) now runs
Postgres, Redis, Mailpit, backend, frontend, and the Stripe CLI forwarder as
containers — this is what unblocks running real infrastructure in CI without
depending on external managed services. CI (`.github/workflows/ci.yml`)
currently has two jobs, `backend` (lint/test/build) and `frontend`
(lint/build), both running on bare `ubuntu-latest` with no service
containers.

## Goals / Non-Goals

**Goals:**
- Integration specs run real HTTP requests through a real Nest app against a
  real, disposable Postgres + Redis — catching bugs mocks hide (serialization,
  transaction behavior, Redis key patterns, `ValidationPipe` transform
  config, guard ordering).
- E2E specs prove the three critical user journeys work through the actual
  browser-facing stack (frontend → backend → Postgres/Redis/Mailpit/Stripe
  CLI), the same containers a real deploy would run.
- Both suites run locally on demand and automatically in CI on every PR.
- Test infrastructure is fully isolated from dev data — a developer can run
  `pnpm test:integration` or `pnpm test:e2e` while `docker compose up` (dev
  stack) is still running, with zero risk of touching dev Postgres/Redis.

**Non-Goals:**
- Not migrating existing unit tests to integration tests — unit tests stay
  as the fast, mocked-dependency layer; integration tests are additive.
- Not covering every route with integration/E2E tests in this change —
  initial module coverage (auth, billing, chat, users, admin) is deliberately
  scoped; the remaining modules (mail, cron, rate-limit) already have unit
  coverage and no complex real-infra interaction that unit tests are
  missing.
- Not adding visual regression testing or cross-browser Playwright matrices
  — a single Chromium project is enough to prove the flows work.
- Yearly billing, Cloudflare, production secrets — out of scope per
  `tech.md`, unrelated to this step.

## Decisions

### Test Postgres/Redis via a separate Compose file, not profiles on the main one
`docker-compose.test.yml` is a standalone file (`docker compose -f
docker-compose.test.yml up -d`), not a `profiles:` section bolted onto the
existing `docker-compose.yml`. Reasons:
- Different lifecycle: test containers should be disposable per-run
  (`down -v` between CI runs to guarantee a clean DB), while the dev stack
  persists data across sessions (`postgres_data` volume). Mixing both in one
  file risks a `down -v` on the wrong volume.
- Different ports (`5433`/`6380` by default) so both stacks can run
  side-by-side on one machine without a port clash — needed for the "run
  integration tests while dev stack is up" goal above.
- Smaller file: only Postgres + Redis are needed for integration tests (no
  Mailpit/Stripe CLI/frontend), keeping CI job startup fast.

**Alternative considered**: reuse `docker-compose.yml` with a `profiles:
[test]` tag on a second `postgres-test`/`redis-test` service pair. Rejected
— it clutters the primary Compose file that `tech.md`/README document as the
one-command dev entrypoint, for services that only CI and `test:integration`
ever start.

### Integration specs are `*.int-spec.ts`, run by a separate Jest config
A new `apps/backend/test/jest-integration.json` (parallel to the existing
`test/jest-e2e.json`) with `testRegex: '.int-spec.ts$'`, and a `test:
integration` script. Integration specs live under `apps/backend/test/`
alongside `app.e2e-spec.ts`, one file per module
(`auth.int-spec.ts`, `billing.int-spec.ts`, etc.), each importing the real
`AppModule` and pointing `DATABASE_URL`/`REDIS_URL` at the test containers
via env vars injected by the test script, not hardcoded.

**Alternative considered**: extend the existing `test:e2e` Jest config to
also match integration specs. Rejected — `test:e2e`'s existing
`app.e2e-spec.ts` boots the app with **no** real Postgres/Redis (it works
today against whatever `DATABASE_URL` happens to resolve, which is
accidental); conflating the two configs would force every existing e2e spec
to suddenly need the test DB too, which isn't true today and is out of
scope to fix here. A dedicated config keeps the two concerns (Nest-level
"does the module wire up" e2e-spec vs. "does it behave correctly against
real infra" int-spec) separately runnable.

### Each integration spec resets DB state via Prisma, not full container
restarts
Integration specs call `prisma.$transaction` cleanup / `deleteMany` on the
tables they touch in `afterEach`, rather than recreating containers per
test file. Container startup (`docker compose up -d` + healthcheck wait)
happens once per CI job / once per local run, not once per spec — this
keeps the suite fast. Each spec file is responsible for cleaning up only the
rows it created, using a per-test-run-unique email/identifier
(`test-${Date.now()}-${Math.random()}@example.com`) to avoid cross-file
collisions if tests ever run in parallel.

### Playwright lives in `apps/frontend`, drives the full `docker compose`
stack, not a dev server
`playwright.config.ts` sets `baseURL` to the frontend's container port
(matching `FRONTEND_PORT` from `.env`) and expects the full stack
(`docker compose up -d`) already running — it does not start its own
`webServer` via `next dev`, because the critical paths under test
(checkout → webhook, chat → simulated reply) need the backend, Postgres,
Redis, Mailpit, and the Stripe CLI forwarder all present, which only the
full Compose stack provides.

**Alternative considered**: Playwright's built-in `webServer` config
starting `next dev` + a bare backend process. Rejected — two of the three
critical paths (webhook tier flip, chat simulated reply) depend on Redis,
BullMQ, and the Stripe CLI forwarder; reimplementing that wiring outside
Docker Compose duplicates infrastructure the project already has.

### Mailpit is read via its API; the checkout flow drives Stripe's real
hosted Checkout UI with a test card
The register→verify E2E spec fetches the verification email via Mailpit's
JSON API (`GET http://localhost:8025/api/v1/messages`) instead of driving
Mailpit's web UI in a second browser tab — faster, and decoupled from
Mailpit's UI markup.

The checkout→webhook spec was originally planned around `stripe trigger
checkout.session.completed` (a canned CLI fixture) rather than driving
Stripe's hosted Checkout UI — but two things ruled that out once actually
tried: (1) `billing.service.ts`'s `applyEvent` switch has no case for
`checkout.session.completed` at all — only `customer.subscription.*` and
`invoice.payment_failed` — so triggering it would exercise nothing; (2)
retargeting a *different* fixture event (`customer.subscription.created`)
at a specific pre-existing test user requires overriding internal,
undocumented Stripe CLI fixture step names, which is brittle and versions
poorly. Instead, the spec drives the real flow: click checkout for a
tier → Playwright fills Stripe's hosted Checkout with the `4242 4242 4242
4242` test card (no 3-D Secure challenge) → Stripe (test mode) completes
the subscription for real → the **already-running** `stripe listen`
Compose service forwards the real `customer.subscription.created` webhook
to our backend, exactly as it would in production. This is slower and
depends on Stripe's own UI markup, but it is the standard, Stripe-endorsed
way to test a complete Checkout integration, and it proves the one thing
`stripe trigger` couldn't: that a checkout a real user completes actually
flips their tier end-to-end.

### CI jobs use `docker-compose.test.yml` for integration, the full
`docker compose` stack for E2E — the same Compose files a developer runs
locally, not native GitHub Actions `services:` containers
Using the project's own `docker-compose.test.yml` in CI (rather than
GitHub Actions' native `services:` block) means there is exactly one
definition of "what test infrastructure looks like" — the same file, same
image tags, same env vars a developer runs locally with `pnpm
test:integration`. A `services:` block would require a second, parallel
port/env mapping to keep in sync with the Compose file, for a marginal
startup-time win on two Alpine images that already boot in seconds. The
`e2e` CI job runs `docker compose up -d --build` (the real, full stack) —
there is no equivalent GitHub Actions service container setup that could
stand in for five interdependent containers anyway, so both jobs now
follow the same "run the actual Compose file" pattern.

## Risks / Trade-offs

- **[Risk] CI runtime grows significantly** — booting the full stack for E2E
  (five containers, two image builds) adds several minutes per run.
  → **Mitigation**: `integration` and `e2e` jobs run in parallel with the
  existing `backend`/`frontend` jobs (independent job graph, not
  sequential); Docker layer caching (`actions/cache` keyed on
  `pnpm-lock.yaml` + Dockerfile hash) is added to keep rebuild cost low on
  unrelated PRs.
- **[Risk] E2E flakiness from async side effects** (email delivery, webhook
  forwarding, WebSocket delivery) → **Mitigation**: use Playwright's
  built-in polling assertions (`expect.poll`, `page.waitForResponse`)
  against Mailpit's API / the DB-visible tier / the rendered chat message,
  never fixed `sleep()`s.
- **[Risk] Test DB state leaking between spec files if run in parallel**
  → **Mitigation**: Jest's `--runInBand` for integration specs in CI (still
  fast — DB round-trips, not the bottleneck) removes the parallelism
  concern; each spec also scopes cleanup to its own created rows via unique
  identifiers as a second safety net.
- **[Trade-off] Duplicated Postgres/Redis image pulls** between the dev
  Compose file, the test Compose file, and CI service containers — accepted
  as the cost of full isolation; all three already pin the same
  `postgres:16-alpine`/`redis:7-alpine` tags as `docker-compose.yml`, so
  there's no version drift risk, only a repeated pull.

## Migration Plan

1. Add `docker-compose.test.yml` + test env vars in `.env.example`; verify
   `docker compose -f docker-compose.test.yml up -d` boots cleanly alongside
   the dev stack.
2. Add `jest-integration.json` + `test:integration` script; write one
   integration spec (auth) end-to-end as the pattern, verify it passes
   locally against the test containers.
3. Fill in remaining module integration specs (billing, chat, users, admin)
   following the established pattern.
4. Add Playwright to the frontend; write the three E2E specs against a
   locally running full stack (`docker compose up -d --build`).
5. Add the `integration` and `e2e` CI jobs; open a PR and confirm both jobs
   go green before merging (no rollback needed — purely additive CI jobs
   that don't gate on existing jobs until proven stable).

No production migration — this change touches only test/dev/CI
infrastructure.

## Open Questions

- Should the `e2e` CI job be required for merge immediately, or run
  non-blocking for a trial period given its higher inherent flakiness
  surface (email delivery, webhook forwarding) before being added to branch
  protection? Leaning towards non-blocking initially; branch protection
  update is a separate, explicit follow-up once the job is observed stable
  over several PRs.
