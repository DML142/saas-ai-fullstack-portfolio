## 1. Test infrastructure (Compose + env)

- [x] 1.1 Add `docker-compose.test.yml` with isolated `postgres-test` and
      `redis-test` services (distinct ports, tmpfs data dir instead of a
      named volume — disposable by design, no `down -v` needed — healthchecks
      matching `docker-compose.yml`'s pattern)
- [x] 1.2 Add test env values as a committed `apps/backend/test/integration/test.env`
      fixture (dummy, non-secret) loaded via `dotenv-cli`, rather than
      `.env.example` additions — keeps CI and local runs identical with zero
      setup, since `docker-compose.test.yml`'s ports have inline defaults too
- [x] 1.3 Verified `docker compose -f docker-compose.test.yml up -d` boots
      cleanly alongside the running dev stack with no port/volume conflicts
- [x] 1.4 Verified `prisma migrate deploy` applies cleanly against the fresh
      test database

## 2. Backend integration test harness

- [x] 2.1 Add `apps/backend/test/jest-integration.json` (`testRegex:
      '.int-spec.ts$'`) — needed the same `.js`→`.ts` moduleNameMapper as the
      unit config (Prisma's generated client uses `.js`-suffixed relative
      imports) plus `NODE_OPTIONS=--experimental-vm-modules` (Prisma 7's
      driver-adapter query compiler loads via dynamic `import()`, which
      Jest's CJS registry can't do without it) and `--forceExit` (the
      top-level `Redis` connection in `app.module.ts` is constructed outside
      Nest's DI, so `app.close()` never closes it)
- [x] 2.2 Add `test:integration` script to `apps/backend/package.json`
- [x] 2.3 Add a shared test helper (`apps/backend/test/integration/test-app.ts`)
      that boots `AppModule` via `Test.createTestingModule` (with an
      `overrideProvider` hook for specs that need it) and mirrors main.ts's
      middleware/pipe wiring exactly, plus a raw Redis client helper and a
      cookie/token-extraction helper, for reuse across all `*.int-spec.ts`
      files

## 3. Backend integration specs

- [x] 3.1 `auth.int-spec.ts`: register → verify (real Redis token) → login
      → refresh-rotation-and-reuse-rejection → forgot/reset password
      (real Redis token) → session revocation, against the real DB/Redis
      (8 tests)
- [x] 3.2 `billing.int-spec.ts`: checkout session creation + duplicate-
      subscription portal redirect (mocked Stripe SDK calls, real DB/guard
      wiring) + webhook signature verification/rejection and idempotency
      on replay (`ProcessedWebhookEvent`), signed via `Stripe.webhooks.
      generateTestHeaderString` against the real DB (5 tests)
- [x] 3.3 `chat.int-spec.ts`: send message → real Redis usage-quota counter
      increments → `GET /chat/usage` reflects it; quota-exceeded rejection;
      cross-user workspace ownership (404) (3 tests)
- [x] 3.4 `users.int-spec.ts`: avatar upload/replace(deletes old
      file)/remove/no-op-remove/reject-non-image against a real DB row and
      the real filesystem path (5 tests)
- [x] 3.5 `admin.int-spec.ts`: RBAC rejection; paginated user list with
      numeric query params through the real global `ValidationPipe`,
      confirming `transform: true` behavior end-to-end; role-change
      self-lockout guard; role change on another user, against a real DB
      row (4 tests)
- [x] 3.6 Ran `pnpm --filter backend test:integration` locally against the
      test containers — all 25 specs pass with clean teardown (`--forceExit`);
      full existing unit suite (92 tests) still green, unaffected

## 4. Frontend Playwright setup

- [x] 4.1 Added `@playwright/test` as a frontend dev dependency + installed
      the Chromium browser; added `apps/frontend/playwright.config.ts` with
      `baseURL` from `FRONTEND_PORT`, no `webServer` (expects the full
      Compose stack already running)
- [x] 4.2 Add `test:e2e` script to `apps/frontend/package.json`
- [x] 4.3 Add a Mailpit API helper (`apps/frontend/e2e/utils/mailpit.ts`) —
      fetches the message list, filters by recipient + subject client-side
      (Mailpit's list endpoint has no per-recipient filter), then fetches
      the full message body for the un-truncated token (the list endpoint's
      `Snippet` field truncates it)

## 5. E2E specs

- [x] 5.1 `register-verify-login.spec.ts`: register → fetch verification
      email via Mailpit API → visit link → logout → login → land on
      dashboard with no unverified banner
- [x] 5.2 `checkout-webhook-tier-flip.spec.ts`: register → click "Choose
      Lite" → **drives Stripe's real hosted test-mode Checkout** with the
      `4242…` card (not `stripe trigger` — see design.md for why that
      fixture-based approach doesn't work here) → the real webhook,
      forwarded by the already-running Stripe CLI container, flips the tier
      → asserted via the app's own `CheckoutSuccessNotice` polling UI and
      the settings page's "Current plan" text
- [x] 5.3 `chat-send-reply.spec.ts`: register → create a workspace → send a
      chat message → assert the simulated reply renders via the real
      WebSocket delivery, without a page reload
- [x] 5.4 Ran `pnpm --filter frontend test:e2e` locally against the already-
      running full Compose stack (`docker compose up -d`) — all 3 specs
      pass. Two real issues found and fixed along the way, worth
      remembering: (1) `page.goto()` fired immediately after a form-submit
      click can cancel the in-flight login/register request before the
      refresh cookie is set, bouncing `RequireAuth` back to `/login` —
      every spec now waits for the post-submit UI (the "Avatar options"
      button) before navigating again; (2) Stripe's hosted Checkout
      billing-address fields change per selected country (Ukraine → Oblast
      + postal code, US → just a ZIP field) — explicitly selecting "United
      States" first keeps the field set deterministic regardless of a CI
      runner's IP-derived default country

## 6. CI wiring

- [x] 6.1 Added an `integration` job to `.github/workflows/ci.yml`:
      `docker compose -f docker-compose.test.yml up -d --wait` → `prisma
      migrate deploy` against it → `pnpm --filter backend test:integration`
      → `docker compose ... down -v` in `if: always()`. YAML validated with
      `python3 -c "import yaml; yaml.safe_load(...)"`; every command in it
      mirrors what was run and passed locally in task 3.6
- [x] 6.2 Added an `e2e` job: captures a stable `stripe listen
      --print-secret` webhook secret first (tied to the (api-key,
      forward-to) pair, confirmed live to be reproducible — the real
      `stripe listen --forward-to backend:.../billing/webhook` service
      docker-compose.yml starts returns the exact same value), writes the
      full stack's `.env` from repo secrets + CI-only dummy values via a
      step `env:` block (a bash heredoc's closing delimiter can't be
      indented to match nested YAML, so this sidesteps that entirely),
      `docker compose up -d --build --wait`, a curl-retry readiness wait
      for both apps, `pnpm --filter frontend test:e2e`, then teardown +
      log/report upload on failure. Marked `continue-on-error: true` — see
      design.md's Open Questions: it depends on `STRIPE_SECRET_KEY` /
      `STRIPE_PRICE_LITE/PRO/ULTRA` repo secrets a fork won't have
- [ ] 6.3 Docker layer caching (`actions/cache`/`docker/build-push-action`
      with a GHA cache backend) for the `e2e` job — **deferred**, not
      implemented in this change. Restructuring `docker compose up --build`
      into a cache-aware build step is real surface area to get wrong
      without a live CI run to verify against; revisit once the `e2e` job
      has run for real and its actual runtime is known
- [ ] 6.4 Open a PR, confirm `integration` and `e2e` jobs both pass, and
      confirm the existing `backend`/`frontend` jobs are unaffected —
      **not done**: needs `STRIPE_SECRET_KEY`/`STRIPE_PRICE_LITE/PRO/ULTRA`
      added as repo secrets first, and pushing/opening a PR needs explicit
      user go-ahead
