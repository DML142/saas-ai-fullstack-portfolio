# tech.md — Project Roadmap

Tracks what's already built and what's next, feature by feature, from this
point to the project's final stage. Update this file as features land —
move a step from "Next" to "Implemented" once it's actually shipped, don't
just leave it stale.

This is a plain tracking doc, not an OpenSpec change — the detailed
proposal/design/spec/tasks breakdown for each step below still happens
through OpenSpec when that step is actually picked up.

---

## Already implemented

### Auth & authorization
- Registration, login, logout; JWT access tokens + rotating refresh tokens
  with Redis-tracked token families (replay/reuse detection)
- Email verification and password reset — single-use Redis tokens, delivered
  async via BullMQ + Nodemailer, caught locally by Mailpit
- RBAC: `USER / PREMIUM / ADMIN` roles, embedded in the access token,
  enforced via a `Roles` decorator + guard

### Billing (Stripe)
- Hosted Checkout (Lite/Pro/Ultra, monthly) + Billing Portal, both
  JWT-guarded, both return `{ url }` for the client to redirect to
- Webhook: raw-body signature verification, idempotent via
  `ProcessedWebhookEvent`, syncs `Subscription` state from Stripe
  (Stripe is the source of truth — tier is never granted from the redirect)
- Effective tier (`FREE/LITE/PRO/ULTRA`) derived from subscription
  status/product, exposed on `/auth/me`, login, and register
- Duplicate-subscription guard — an already-subscribed user is redirected to
  the billing portal instead of creating a second Checkout session
- `TierGuard` + `@MinTier` decorator exist, ready to gate routes by tier —
  **not wired to anything yet** (see Step 1 below)
- Swagger docs for all billing endpoints
- Unit tests: signature verification, idempotency, tier derivation,
  duplicate-subscription guard — verified live against Stripe test mode

### Chat (COS Assistant — demo, no real LLM)
- Per-user workspace + message persistence
- Simulated reply pipeline: BullMQ job + real-time delivery over WebSocket
- Markdown rendering with syntax-highlighted code blocks

### Frontend
- Landing page: hero (word-cycler, drifting blend-mode stars, scoped
  chromatic aberration), features (constellation + feature-stars), social
  proof (reviews/sponsors marquee/FAQ), pricing (3 plan cards, wired to
  checkout), navbar, footer
- Auth pages: login / register / forgot-password / reset-password /
  verify-email, client session store, silent refresh-on-load, route guards
- Dashboard shell: sidebar, workspace/chat switcher, settings (account,
  billing, session), account badge showing role + tier

### Security
- App-level rate limiting: Redis-backed fixed-window counter (`INCR` +
  conditional `EXPIRE`), keyed by route + client IP, applied via a
  `RateLimitGuard`/`@RateLimit` decorator to `/auth/login`, `/auth/register`,
  `/auth/forgot-password`, `/auth/resend-verification`,
  `/auth/reset-password`, `/auth/verify-email`
- Fails open (logs + allows) if Redis is unreachable; `429` + `Retry-After`
  on limit exceeded
- Swagger docs (`429` responses) + unit tests (guard behavior, counter
  behavior); verified live against a running Redis instance

### Infra & tooling
- Docker Compose for local dev: Postgres, Redis, Mailpit
  (infra services only — app containers are not part of this yet, see Step 8)
- pnpm workspaces + Turborepo monorepo
- GitHub Actions CI: lint + test + build for both apps, on every push/PR to
  `main`
- Branch protection on `main` — PR required, both CI checks required,
  enforced for the repo owner too, no force-push/deletion
- Swagger/OpenAPI docs served at `/docs`

---

## Next — step by step, to final stage

### Step 1 — Tier-gated usage limits (chat)
Enforce real per-tier limits using the `TierGuard`/`@MinTier` machinery that
already exists but currently gates nothing. Right now a FREE and an ULTRA
account behave identically once logged in, which makes the billing feature
functionally pointless — this is what closes that loop.
- Redis-backed usage counter (e.g. messages this period, `INCR` + TTL per
  user per billing period)
- Guard/interceptor on the chat message-send path enforcing the limit
- Real numbers in `UsageSummary` (currently static placeholder data)
- Friendly "upgrade to send more" UX when a limit is hit, not just a bare 429

### Step 2 — Google OAuth
Add Google as a login/register method alongside email+password.
- Passport Google strategy
- Account-linking: existing email/password user vs. a new OAuth-only user
- Session issuance parity with the existing password flow (same JWT shape,
  same refresh-token family tracking)
- Frontend "Continue with Google" control on login/register

### Step 3 — File uploads (avatar)
Smallest of the three upload targets CLAUDE.md lists (avatar / documents /
images) — start here to establish the pattern once, cleanly.
- Multer-based upload endpoint, size + MIME-type validation
- Storage: local disk for dev; note S3-compatible storage as the prod
  concern to swap in later (don't build it now)
- `avatarUrl` on `User`, frontend upload control in Settings

### Step 4 — Cron jobs
Natural follow-on once uploads exist (there's something to actually clean
up), and a clean `@nestjs/schedule` learning piece on its own.
- `@nestjs/schedule` wired into a small `CronModule`
- Cleanup job for orphaned/expired uploaded files
- Cleanup job for any non-TTL'd stale state (most tokens already expire via
  Redis TTL — this is for whatever doesn't)
- Logging/observability for job runs (success/failure, duration)

### Step 5 — Admin panel
The biggest single feature left. Deliberately placed after Steps 1, 3, and 4
so there's something real to administer (usage limits, uploaded files,
scheduled jobs) rather than an empty shell.
- Backend `admin` module, gated by `@Roles(Role.ADMIN)`
- Users: list, view, change role
- Subscriptions: list, view, cancel (via Stripe, synced back through the
  existing webhook path — admin never writes `tier` directly)
- Stats: signups over time, tier breakdown, basic Stripe-derived numbers
- Queues: BullMQ job counts/failures (a lightweight custom endpoint, or
  wire in Bull Board)
- Frontend `/admin` route tree: its own layout, tables, confirmation modals
  for destructive actions

### Step 6 — Import / export chat workspace
Smaller, self-contained UI feature from the original feature list — a good
finishing touch once the operational features above exist.
- Backend: serialize a workspace (messages + metadata) to a downloadable
  JSON file
- Backend: import endpoint validating the uploaded shape before creating
  records
- Frontend: download trigger + file-picker with clear error states

### Step 7 — Full Docker Compose (single-command startup)
CLAUDE.md's stated goal — `docker compose up` running frontend, backend,
postgres, redis, and mailpit — isn't met yet; only the three infra services
are containerized. Doing this once the backend module set is stable avoids
re-touching Dockerfiles per feature.
- Multi-stage Dockerfiles (build stage + slim runtime) for both apps
- Compose service definitions with env wiring, `depends_on`, healthchecks
- Update the README's "Running it locally" section to the new single-command
  flow (replacing the current "infra in Docker, apps locally" split)

### Step 8 — Testing depth: integration + E2E
Only unit tests exist today (billing's and rate-limiting's suites). CLAUDE.md
wants unit + integration + E2E. Doing this after Steps 1–7 means the suite
covers the full, final feature set in one pass instead of needing a second
one.
- A test-database Docker profile (isolated Postgres/Redis for tests)
- Supertest-based integration specs per backend module, hitting the real
  test DB instead of mocks
- Playwright E2E for the critical paths: register → verify → login,
  checkout → webhook → tier flip, chat send → simulated reply
- Wire both into the existing GitHub Actions workflow as new jobs

### Step 9 — Production readiness (final stage)
Everything CLAUDE.md marks as deploy-time-only — genuinely last, because
none of it can be built or meaningfully tested without a real deploy target.
- Real email provider: swap Nodemailer's unauthenticated Mailpit transport
  for an authenticated one (Gmail SMTP, Resend, Postmark, …)
- Cloudflare in front of the deployed domain (DNS → Cloudflare → server);
  optional Turnstile widget on login/register/forgot-password + server-side
  verification
- Live Stripe keys, live price IDs, production webhook endpoint registered
  in the Stripe dashboard
- Secrets management for the deploy target
- A release/deploy pipeline (build + push images, run migrations, smoke
  test, rollback plan)
- Optional stretch: yearly billing (explicitly deferred in the billing
  design — monthly-only was a deliberate scope cut, not a limitation)
