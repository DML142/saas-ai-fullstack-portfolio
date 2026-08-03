## 1. Test infrastructure (Compose + env)

- [ ] 1.1 Add `docker-compose.test.yml` with isolated `postgres-test` and
      `redis-test` services (distinct ports, distinct volume, healthchecks
      matching `docker-compose.yml`'s pattern)
- [ ] 1.2 Add test DB/Redis env vars to `.env.example` (`TEST_POSTGRES_PORT`,
      `TEST_REDIS_PORT`, `TEST_DATABASE_URL`, `TEST_REDIS_URL`), documented
      as CI/integration-test-only
- [ ] 1.3 Verify `docker compose -f docker-compose.test.yml up -d` boots
      cleanly alongside a running dev stack with no port/volume conflicts
- [ ] 1.4 Verify `prisma migrate deploy` applies cleanly against the fresh
      test database

## 2. Backend integration test harness

- [ ] 2.1 Add `apps/backend/test/jest-integration.json` (`testRegex:
      '.int-spec.ts$'`)
- [ ] 2.2 Add `test:integration` script to `apps/backend/package.json`,
      pointing `DATABASE_URL`/`REDIS_URL` at the test containers
- [ ] 2.3 Add a shared test helper (`apps/backend/test/utils/test-app.ts`)
      that boots `AppModule` via `Test.createTestingModule` and exposes
      the initialized app + a Prisma client scoped to the test DB, for
      reuse across all `*.int-spec.ts` files

## 3. Backend integration specs

- [ ] 3.1 `auth.int-spec.ts`: register → verify (real Redis token) → login
      → refresh, against the real DB/Redis
- [ ] 3.2 `billing.int-spec.ts`: checkout session creation (mocked Stripe
      SDK call, real DB/guard wiring) + webhook signature verification and
      idempotency (`ProcessedWebhookEvent`) against the real DB
- [ ] 3.3 `chat.int-spec.ts`: send message → real Redis usage-quota counter
      increments → `GET /chat/usage` reflects it
- [ ] 3.4 `users.int-spec.ts`: avatar upload/replace/remove against a real
      DB row and the real filesystem path
- [ ] 3.5 `admin.int-spec.ts`: paginated user list with numeric query params
      through the real global `ValidationPipe`, confirming `transform: true`
      behavior end-to-end; role-change self-lockout guard against a real DB
      row
- [ ] 3.6 Run `pnpm --filter backend test:integration` locally against the
      test containers and confirm all specs pass with clean teardown

## 4. Frontend Playwright setup

- [ ] 4.1 Add `@playwright/test` as a frontend dev dependency; add
      `apps/frontend/playwright.config.ts` with `baseURL` from
      `FRONTEND_PORT`, no `webServer` (expects the full Compose stack
      already running)
- [ ] 4.2 Add `test:e2e` script to `apps/frontend/package.json`
- [ ] 4.3 Add a Mailpit API helper (`apps/frontend/e2e/utils/mailpit.ts`) to
      fetch and parse the latest verification/reset email for a given
      recipient

## 5. E2E specs

- [ ] 5.1 `register-verify-login.spec.ts`: register → fetch verification
      email via Mailpit API → visit link → login → land on dashboard
- [ ] 5.2 `checkout-webhook-tier-flip.spec.ts`: authenticate as a test user
      → trigger `stripe trigger checkout.session.completed` (via the
      running Stripe CLI container) scoped to that user's customer →
      poll `/auth/me` until the effective tier reflects the plan
- [ ] 5.3 `chat-send-reply.spec.ts`: authenticate → send a chat message →
      assert the simulated reply renders via the real WebSocket delivery,
      without a page reload
- [ ] 5.4 Run `docker compose up -d --build` locally and confirm
      `pnpm --filter frontend test:e2e` passes all three specs end-to-end

## 6. CI wiring

- [ ] 6.1 Add an `integration` job to `.github/workflows/ci.yml` using
      GitHub Actions `services:` for Postgres + Redis, running
      `pnpm --filter backend test:integration`
- [ ] 6.2 Add an `e2e` job to `.github/workflows/ci.yml` that runs
      `docker compose up -d --build`, waits for health, runs
      `pnpm --filter frontend test:e2e`, then tears the stack down
      (`docker compose down -v`) in an `if: always()` step
- [ ] 6.3 Add Docker layer caching (`actions/cache` keyed on
      `pnpm-lock.yaml` + Dockerfile hash) to keep `e2e` job runtime
      reasonable on unrelated PRs
- [ ] 6.4 Open a PR, confirm `integration` and `e2e` jobs both pass, and
      confirm the existing `backend`/`frontend` jobs are unaffected
