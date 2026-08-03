## Why

Test coverage today stops at unit tests: every backend module (auth, billing,
chat, users, admin, cron, rate-limit) has unit specs with mocked
dependencies, but nothing exercises a real Postgres/Redis instance, a real
HTTP request/response cycle across module boundaries, or a real browser
session end-to-end. A mocked `PrismaService`/`RedisService` can pass while a
real query, transaction, or Redis key pattern is broken — the admin-panel
pagination bug (`transform: true` missing from `ValidationPipe`) is exactly
the class of bug unit tests with mocks cannot catch, and was only caught by
manual live testing. Now that the full Docker Compose stack exists
(`feat/docker-compose`), integration and E2E tests can run against
containerized, disposable infrastructure instead of a developer's real dev
database — this was blocked before and is the reason this step waits until
now, per `tech.md`.

## What Changes

- Add a **test-only Docker Compose profile** (`docker-compose.test.yml`) with
  isolated Postgres + Redis instances on different host ports/volumes, so
  integration/E2E runs never touch dev data and can run concurrently with
  `docker compose up`.
- Add **Supertest-based integration specs** (`*.int-spec.ts`) per backend
  module, each spinning up a real Nest application (`AppModule`) against the
  test Postgres/Redis, exercising real HTTP requests through real Prisma
  queries and Redis keys instead of mocked providers. Initial module
  coverage: auth (register/login/refresh/verify/reset), billing (checkout
  session creation + webhook signature/idempotency), chat (send message +
  usage quota), users (avatar upload), admin (RBAC-gated routes).
- Add **Playwright** to the frontend app and three E2E specs covering the
  critical paths named in `tech.md`: register → verify (via Mailpit) →
  login; checkout → webhook → tier flip (via Stripe CLI test-mode); chat
  send → simulated reply (via WebSocket).
- **Wire both into GitHub Actions** (`.github/workflows/ci.yml`) as new
  jobs: an `integration` job that boots the test Compose profile via
  service containers (or `docker compose -f docker-compose.test.yml`) before
  running `test:integration`, and an `e2e` job that boots the full stack and
  runs Playwright against it.

No existing capability's requirements change — this adds test
infrastructure and coverage, it does not change any product-facing
behavior.

## Capabilities

### New Capabilities
- `integration-testing`: real-infrastructure Supertest specs per backend
  module (test Postgres/Redis via a dedicated Compose profile), covering
  request/response behavior that unit tests mock away.
- `e2e-testing`: Playwright specs driving the full containerized stack
  through the three critical user journeys end-to-end.

### Modified Capabilities
(none — no spec-level product behavior changes)

## Impact

- **New files**: `docker-compose.test.yml`; `apps/backend/test/**/*.int-spec.ts`
  (one set per module); `apps/backend/test/jest-integration.json`;
  `apps/frontend/playwright.config.ts`; `apps/frontend/e2e/*.spec.ts`.
- **Modified files**: `.github/workflows/ci.yml` (new `integration` and `e2e`
  jobs); `apps/backend/package.json` (`test:integration` script);
  `apps/frontend/package.json` (Playwright deps + `test:e2e` script);
  root `.env.example` (test DB/Redis port vars, documented as
  CI/test-only).
- **Dependencies**: `@playwright/test` (frontend, dev dependency); no new
  backend dependencies (Supertest is already present).
- **Systems**: local Docker (an additional Compose profile developers can
  run alongside the dev stack), GitHub Actions (two new CI jobs, longer CI
  runtime).
