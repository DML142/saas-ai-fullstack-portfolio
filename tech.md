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
- Google OAuth: Passport strategy issuing the same access/refresh token pair
  as password login (`AuthService.issueToken`, unchanged); account resolution
  by `googleId` → link-by-verified-email → create, so an existing
  password account and a first-time Google sign-in with the same email
  merge into one account instead of duplicating; OAuth-only accounts have a
  nullable `passwordHash` and are rejected (with the same generic error as
  any wrong password) if someone tries `/auth/login` against them; OAuth
  failure/denial redirects to `/login?error=oauth_failed` via a
  `GoogleAuthGuard` instead of surfacing a raw 401 on a top-level browser
  navigation; "Continue with Google" control on login/register
- Swagger docs for both Google routes; unit tests for account
  resolution/linking, the null-passwordHash login rejection, and the guard's
  failure-redirect behavior — verified live against a real Google OAuth
  client

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
- `TierGuard` + `@MinTier` decorator exist, ready to gate a route by a
  minimum-tier check — **still not wired to anything**; chat's usage quota
  (below) turned out to be a different shape of problem (counted/resetting,
  not a static minimum) and reused the rate-limit counter instead
- Swagger docs for all billing endpoints
- Unit tests: signature verification, idempotency, tier derivation,
  duplicate-subscription guard — verified live against Stripe test mode

### Chat (COS Assistant — demo, no real LLM)
- Per-user workspace + message persistence
- Simulated reply pipeline: BullMQ job + real-time delivery over WebSocket
- Markdown rendering with syntax-highlighted code blocks
- Tier-gated monthly message quota: a Redis fixed-window counter
  (`usage:messages:<userId>:<YYYY-MM>`, reusing
  `RedisService.incrementWithExpiry`) checked by `UsageLimitGuard` on send
  and incremented only after a message is actually created — a rejected
  attempt never counts against the quota; `ULTRA` maps to `null` (no limit)
  in `TIER_MESSAGE_LIMITS`; over-quota sends get a `403` with a structured
  `{ message, tier, limit, used }` body instead of a bare status code; the
  check fails open on a Redis error (an outage shouldn't lock out chat
  entirely)
- `GET /chat/usage` exposes real `{ tier, used, limit }`; `UsageSummary` in
  the dashboard renders it live (an "Unlimited" state for `ULTRA`), and a
  blocked send in `ChatPanel` shows an inline "upgrade your plan" link
  instead of a generic error
- Swagger docs for the usage endpoint and the `403` quota response; unit
  tests for the guard and the increment-on-send behavior — verified live:
  bulk-sent a FREE test account to exactly `50/50`, confirmed the 51st send
  returned `403` and the frontend upgrade prompt rendered

### File uploads (avatar)
- New `users` module (first module outside `auth` to own user data):
  `POST /users/me/avatar` / `DELETE /users/me/avatar`, JWT-guarded
- Multer memory storage (not `diskStorage`) + `ParseFilePipe`
  (`FileTypeValidator` magic-number check, `MaxFileSizeValidator`) —
  validates the buffer before anything touches disk, so a rejected upload
  never partially writes a file
- Local disk storage under `AVATAR_UPLOAD_DIR` (env-configured), served via
  `ServeStaticModule`; `avatarUrl String?` added to `User`, wired into
  `/auth/me`, login, and register
- Replacing an avatar deletes the old file; removing clears `avatarUrl` and
  deletes the file (no-op if already unset)
- Frontend: shared `AvatarMenu` popover (click the avatar icon → upload/
  delete controls, plus a bigger avatar preview + email when one is set)
  used by both the dashboard header (`AccountBadge`) and the public Navbar
  — same account, same avatar, wherever the user is logged in
- Swagger docs; unit tests for `UsersService` (upload/replace/remove/
  not-found/ENOENT-is-success) and a controller test — verified live via
  curl plus a synthetic `DataTransfer`-driven file upload in-browser (the
  sandbox can't drive a native OS file picker)
- Two bugs found and fixed along the way, worth remembering: (1)
  `ServeStaticModule`'s `serveRoot` needs its leading slash or Express's
  static middleware silently never matches any route (a missing file
  looked like a CORS/ORB error in the browser, not a routing error); (2)
  rendering the same Popover-based avatar trigger twice across a CSS-only
  responsive breakpoint (`hidden md:flex` / `md:hidden`) makes Floating UI
  anchor to a zero-rect hidden element on the breakpoint flip, teleporting
  the popup to the top-left corner — fixed by rendering `AvatarMenu` once,
  always visible, instead of duplicating it per breakpoint

### Cron jobs
- `@nestjs/schedule` wired via a global `ScheduleModule.forRoot()`; a new
  `CronModule` (no controller — internal-only) declares two `@Cron`-decorated
  services, each on its own daily schedule (configured via `CRON_*` env vars,
  `process.env`-direct with safe defaults, same pattern as
  `avatar-upload.config.ts`)
- `AvatarCleanupService`: diffs on-disk files under `AVATAR_UPLOAD_DIR`
  against every `User.avatarUrl` in Postgres, deletes anything unreferenced
  — but only past a 10-minute grace period (by file `mtime`), since the
  upload write and the DB update aren't transactional and a brand-new file
  can briefly have no matching row yet
- `WebhookEventCleanupService`: deletes `ProcessedWebhookEvent` rows older
  than a configurable retention window (`CRON_WEBHOOK_EVENT_RETENTION_DAYS`,
  default 30 days — well past Stripe's actual webhook retry window)
- Both jobs log start/success (with duration + item count)/failure via the
  existing per-class `new Logger(ClassName.name)` convention; failures are
  caught and logged, not thrown — `@nestjs/schedule` has no retry mechanism
  like BullMQ, so a failed run just waits for its next scheduled tick
- Unit tests for both services (success/no-op/grace-period/error-swallowed
  paths); verified live against real dev data — a synthetic orphaned file
  and a backdated `ProcessedWebhookEvent` row were both deleted on a real
  run, while a genuinely-referenced avatar and a recent event row survived

### Admin panel
- New `admin` module (`apps/backend/src/admin/`), class-level guarded by
  `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)` — the first
  real route to use the RBAC system beyond the `/auth/admin-check` smoke test
- Users: paginated + email-searched list (`skip`/`take`, `$transaction` for
  count consistency), single-user detail (+ subscription + workspace count),
  role change that refuses to change the caller's own role
  (`ForbiddenException`) — the one realistic self-lockout footgun
- Subscriptions: paginated list read from the DB (the webhook-synced cache);
  cancel via a new `BillingService.cancelSubscription` —
  `stripe.subscriptions.update(id, { cancel_at_period_end: true })` only,
  never writes the DB directly; the existing `customer.subscription.updated`
  webhook path syncs `cancelAtPeriodEnd`/`status` back, so admin cancellation
  reuses the exact sync code a portal-initiated cancel already uses
- Stats: `groupBy` for users-by-role and subscriptions-by-tier, one
  `$queryRaw` (`date_trunc('day', "createdAt")`) for the 30-day signup
  series — the only raw-SQL call in the codebase, deliberately scoped to the
  one query Prisma's API can't express
- Queues: `GET /admin/queues` returns `getJobCounts()` for both BullMQ queues
  (`email`, `chat-reply`) — a small custom endpoint, not Bull Board, to stay
  in the app's own palette with no new dependency
- Frontend `/admin` route tree (`app/(dashboard)/admin/`): `RequireAdmin`
  guard (mirrors `RequireAuth`, additionally redirects non-ADMIN to
  `/dashboard`), `AdminSidebar`, a hand-rolled `DataTable` (no table
  primitive existed in the repo), confirmation `Modal`s for role change and
  subscription cancel; ADMIN-only "Admin" link added to the main dashboard
  `Sidebar`
- Swagger docs for every admin route; unit tests for `AdminService`,
  `AdminController`, and new `BillingService.cancelSubscription` cases —
  verified live: promoted a real test user to `ADMIN`, exercised every route,
  confirmed 403 on both a non-admin token and a self-role-change attempt, and
  confirmed a live Stripe test-mode cancel actually set
  `cancel_at_period_end: true` on the subscription (checked directly against
  the Stripe API) while leaving the DB row untouched pending the webhook
- Three bugs found and fixed along the way, worth remembering: (1) the
  global `ValidationPipe` had no `transform: true` — harmless until this
  module's `page`/`limit` query DTOs were the first in the codebase to need
  `@Type(() => Number)` conversion, which silently doesn't apply without it,
  so pagination would have shipped broken (`NaN` skip / string types hitting
  Prisma) had it not been caught before merge; (2) the public `Navbar` only
  hid itself on `/dashboard`, not `/admin`, causing the marketing header to
  overlap `DashboardHeader`; (3) the NestJS CLI's scaffolded `*.spec.ts`
  stubs for the new module don't provide the service's real dependencies and
  fail to compile as soon as the service has any — expected, but a reminder
  to replace them before trusting a green "should be defined" test

### Chat import/export
- `GET /chat/workspaces/:id/export`: ownership check mirrors
  rename/delete (`workspace.userId !== userId` → `404`, never a `403` that
  would reveal the workspace exists), returns
  `{ version: 1, name, exportedAt, messages: [{ role, content, createdAt }] }`
  in chronological order
- `POST /chat/workspaces/import`: new `ImportWorkspaceDto`/`ImportMessageDto`
  (`@IsIn([1])` on `version`, `@ArrayMaxSize(2000)` messages,
  `@MaxLength` limits matching `SendMessageDto`/`CreateWorkspaceDto`) —
  always creates a brand-new workspace via one nested
  `prisma.workspace.create({ data: { messages: { create: [...] } } })`
  call, never reuses an id/userId from the uploaded file; a message's
  `createdAt` is preserved from the file when present and left to the
  schema default (`undefined`, not `null`) otherwise
- Import never touches the quota counter or the `chat-reply` queue —
  those side effects only exist in `sendMessage`, so importing restores
  history without counting as new sends or triggering simulated replies
- Frontend: per-row Export icon in `Sidebar.tsx` (`Blob` +
  `URL.createObjectURL` + temporary `<a download>`, since the request
  needs an `Authorization` header a plain link-click can't send) and an
  "Import chat" trigger reusing `AvatarMenu.tsx`'s hidden-file-input
  pattern, with an inline error state for a bad file or failed request
- Swagger docs for both routes; unit tests for export ordering/ownership
  and for import's nested-create payload + `createdAt` preserve/fallback
  behavior; controller tests confirm both routes delegate using the
  caller's token `userId`, never a value from the request body
- One bug found and fixed, worth remembering: the global `ValidationPipe`
  runs with `forbidNonWhitelisted: true`, but the export response
  (correctly, per spec) includes `exportedAt` — a field `ImportWorkspaceDto`
  doesn't declare. Re-uploading a file exactly as it was downloaded 400'd
  with "property exportedAt should not exist". Fixed by having
  `Sidebar.tsx` destructure only `{ version, name, messages }` before
  POSTing, rather than forwarding the parsed file verbatim
- Verified live: exported a real workspace, confirmed the JSON shape,
  re-imported it (post-fix) into a new workspace with both messages and
  their original timestamps intact, confirmed `GET /chat/usage`'s `used`
  count was unchanged and no extra simulated reply appeared for the
  imported messages

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
- **Full Docker Compose stack** — `docker compose up --build` now runs the
  entire app: Postgres, Redis, Mailpit, the backend, the frontend, and a
  Stripe CLI webhook forwarder, with no local Node/pnpm install required
- Multi-stage Dockerfiles for both apps, built via `turbo prune
  <app> --docker` (deps-only layer, cached separately from source) → full
  install + build → a separate prod-only `pnpm install --prod` stage → a
  slim runner combining the two, so devDependencies never ship. The build
  context is the repo root (prune needs the whole workspace), not the app
  subdirectory, backed by a single root-level `.dockerignore`
- Frontend runner uses Next.js `output: 'standalone'` (+
  `outputFileTracingRoot` pointed at the monorepo root, required since the
  pnpm lockfile lives above `apps/frontend`); backend runner's `CMD` chains
  `prisma migrate deploy` before `node dist/src/main` so pending migrations
  apply on every boot
- `postgres`/`redis` get explicit `healthcheck:` blocks (`pg_isready`/
  `redis-cli ping`) so `depends_on: condition: service_healthy` gates real
  readiness, not just container-start ordering; Mailpit's official image
  ships its own healthcheck already. A named `backend_uploads` volume keeps
  avatar uploads across restarts, matching `postgres_data`
- **Stripe CLI as a Compose service** (`stripe/stripe-cli`, pinned to a
  specific tag — unpinned `latest` has had reported startup crashes),
  running `stripe listen --api-key ${STRIPE_API_KEY} --forward-to
  backend:<port>/billing/webhook` — headless auth via `--api-key`, no
  interactive `stripe login`. The signing secret is captured once via
  `stripe listen --print-secret` and stored as `STRIPE_WEBHOOK_SECRET` in
  `.env`; confirmed live that it's stable across both `stripe listen`
  restarts and a full `docker compose down`/`up` cycle
- Root `.env.example` consolidated into the full var set the containerized
  backend/frontend actually need (it previously only had the
  Postgres/Redis/Mailpit subset), with a comment block distinguishing
  server-to-server values (overridden to Compose service hostnames in
  `docker-compose.yml`) from browser-facing ones (redirects, emailed links,
  client-side `fetch` — these must stay `localhost:<host-port>` even though
  everything else runs in containers)
- The original host-process workflow (`pnpm --filter backend start:dev` +
  `pnpm --filter frontend dev`, reading from each app's own `.env`) is kept
  as the documented hot-reload alternative — the containers are
  production-style builds with no file-watching
- Found and fixed two bugs along the way, worth remembering: (1)
  `turbo.json` existed but `turbo` itself was never installed as a
  dependency anywhere in the repo — nothing had actually invoked it before;
  (2) `apps/backend/package.json`'s `start:prod` script pointed at
  `dist/main`, but since Prisma's generator output (`generated/prisma`)
  lives outside `src/`, tsc's inferred build root spans both directories
  and the real compiled entry is `dist/src/main.js` — this script had
  apparently never actually been run before. Caught by running the compiled
  output directly rather than assuming
- pnpm workspaces + Turborepo monorepo
- GitHub Actions CI: lint + test + build for both apps, on every push/PR to
  `main`
- Branch protection on `main` — PR required, both CI checks required,
  enforced for the repo owner too, no force-push/deletion
- Swagger/OpenAPI docs served at `/docs`
- Unit tests unaffected; verified live end-to-end against the containerized
  stack: registered a real account (Postgres write + Mailpit-caught
  verification email with a correctly browser-facing `localhost:3001`
  link), triggered a synthetic Stripe event through the running `stripe`
  container and confirmed every forwarded event (including
  `checkout.session.completed`) got a `200` back from the backend over the
  Compose network, and confirmed a `docker compose down`/`up` cycle
  preserved the Postgres row (logged back in as the same user)

---

## Next — step by step, to final stage

### Step 1 — Testing depth: integration + E2E
Only unit tests exist today (billing's, rate-limiting's, Google OAuth's,
chat usage-limits', avatar upload's, cron jobs', admin panel's, and chat
import/export's suites). CLAUDE.md wants unit + integration + E2E. Doing
this now that the full Docker Compose stack exists means integration/E2E
specs can target the real containerized stack instead of a partial one.
- A test-database Docker profile (isolated Postgres/Redis for tests)
- Supertest-based integration specs per backend module, hitting the real
  test DB instead of mocks
- Playwright E2E for the critical paths: register → verify → login,
  checkout → webhook → tier flip, chat send → simulated reply
- Wire both into the existing GitHub Actions workflow as new jobs

### Step 2 — Production readiness (final stage)
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
