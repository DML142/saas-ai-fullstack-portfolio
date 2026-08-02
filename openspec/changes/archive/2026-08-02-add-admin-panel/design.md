## Context

The RBAC primitives are all in place and unused by any real feature:
`Role { USER PREMIUM ADMIN }`, the `@Roles(...)` metadata decorator
(`apps/backend/src/auth/decorators/roles.decorator.ts`), and `RolesGuard`
(`apps/backend/src/auth/guards/roles.guard.ts`), which reads
`request.user.role` and returns `requiredRoles.includes(role)`. The only route
using them is `AuthController.adminCheck` (`auth.controller.ts:126`), a smoke
test. `req.user` is `{ userId, role }`, produced by `JwtStrategy.validate`; the
repo has **no `@CurrentUser()` decorator** and reads `req.user as {...}` inline
everywhere.

Billing is already "Stripe is the source of truth; the DB is a webhook-synced
cache." `BillingService` (`billing.service.ts`) owns the Stripe client (injected
via the `STRIPE_CLIENT` symbol provider) and exposes `getEffectiveTier`,
`syncSubscription` (the private webhook handler that writes
`tier/status/cancelAtPeriodEnd`), and portal/checkout creation — but **no
cancel and no list**. `Subscription` is a dedicated Prisma model keyed by
`userId`, with `status` a free-form Stripe string.

BullMQ is wired with a shared ioredis connection in `AppModule`; the `email` and
`chat-reply` queues are registered in their own modules and injected with
`@InjectQueue`. Nothing inspects job counts today.

Conventions this design follows: flat feature modules under `src/<feature>/`;
`process.env` read directly (no `ConfigService`); thin controllers, logic in the
service; HTTP exceptions thrown from the service; Swagger annotated in the
`billing`/`users` style; unit tests co-located, dependencies mocked via
`{ provide, useValue }`.

## Goals / Non-Goals

**Goals:**
- An ADMIN-only HTTP surface to list/view users, change a user's role, list
  subscriptions, cancel a subscription, read platform stats, and read queue
  health.
- Preserve the billing invariant: admin actions on subscriptions go *through
  Stripe*, and the DB reflects them only via the existing webhook sync.
- Match the repo's module/guard/Swagger/test conventions exactly — nothing
  novel introduced that a later reader wouldn't recognize from `users`/`billing`.

**Non-Goals:**
- **No new persistence.** No audit-log table, no job-run history, no admin
  activity trail. Stats are computed on read from existing columns.
- **No queue mutation.** The queues endpoint is read-only counts; retrying or
  removing individual jobs (what Bull Board offers) is out of scope.
- **No direct role→tier coupling.** Changing `role` never touches `tier`; the
  two axes stay independent, exactly as the billing design states.
- **No user deletion / soft-delete.** `User` has no soft-delete field and adding
  the account-lifecycle machinery (cascade implications for Stripe customers,
  workspaces, messages) is its own change, not bundled here.
- **No `@CurrentUser()` refactor.** Tempting given a new module, but it's a
  cross-cutting change to every existing controller — kept separate.

## Decisions

**Class-level `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`.**
Applied once on `AdminController`, not per method — every admin route is
ADMIN-only, so a class-level guard is both less error-prone (no route can be
added without protection) and matches how `billing`/`users` apply
`@UseGuards(JwtAuthGuard)` at the class. Guard order matters: `JwtAuthGuard`
runs first and populates `req.user`; `RolesGuard` then reads `req.user.role`.
`RolesGuard` returns `false` (generic 403) when the role doesn't match — that's
the existing behavior and is fine for a blanket ADMIN gate; we don't need the
descriptive-message treatment `TierGuard` gives per-feature tiers.

**Offset pagination (`page`/`limit` → `skip`/`take`), not cursor.**
Admin tables are browsed by a human clicking pages, need a total count for
"page X of Y", and operate on modest row counts — offset is the right fit and
simpler than cursor. Each list endpoint returns
`{ data, total, page, limit }`. `limit` is validated and capped (e.g. ≤ 100) so
a caller can't request an unbounded page. Query DTOs use `class-validator` +
`@Type(() => Number)` for the numeric query params, matching how DTOs are built
elsewhere; the global `ValidationPipe({ whitelist, forbidNonWhitelisted })`
already strips unknown params.

**User-list search on `email`, case-insensitive `contains`.**
Email is the only human-meaningful identifier (there's no name field). Prisma
`where: search ? { email: { contains: search, mode: 'insensitive' } } : {}`.
No full-text index added — row counts don't warrant it, and adding one would be
a schema migration this change explicitly avoids.

**Role change refuses self-modification.**
`updateUserRole(actingUserId, targetId, role)` throws
`ForbiddenException('Cannot change your own role')` when
`targetId === actingUserId`. This is the one real footgun: an admin
demoting themselves would lose access to the panel mid-session with no way back
short of DB surgery. Blocking self-change is a cheap, sufficient guard. We do
**not** additionally enforce "at least one admin must remain" — that's a
multi-admin invariant with race conditions of its own, out of scope for a
single-operator portfolio; the self-block already prevents the realistic
lockout.

**Cancel = `cancel_at_period_end: true`, via `BillingService`, synced by webhook.**
The new `BillingService.cancelSubscription(userId)` looks up
`stripeSubscriptionId` and calls
`stripe.subscriptions.update(id, { cancel_at_period_end: true })`. It does **not**
write the DB — the resulting `customer.subscription.updated` event flows through
the existing `handleWebhookEvent` → `syncSubscription`, which already persists
`cancelAtPeriodEnd` and `status`. This keeps the source-of-truth invariant intact
and means the admin action reuses the exact code path a portal-initiated cancel
would. Period-end (not immediate) chosen so the user keeps the access they paid
for; `Subscription.cancelAtPeriodEnd` already models this, so the frontend can
show "canceling on <date>" with no new field.

**Stats computed on read via Prisma aggregates; one raw query for the time series.**
`prisma.user.count`, `prisma.user.groupBy({ by: ['role'], _count })`, and
`prisma.subscription.groupBy({ by: ['tier'], _count })` cover the categorical
numbers with no raw SQL. The signups-over-time series is the one place that
needs date bucketing, which Prisma's query API can't express — a single
`$queryRaw` with `date_trunc('day', "createdAt")` grouping over the last 30 days
is used there and only there, kept small and commented. No caching layer: these
are cheap aggregates over small tables and an admin dashboard tolerates a fresh
query per load.

**Queue health via `@InjectQueue` + `getJobCounts()`, not Bull Board.**
`AdminModule` re-registers the `email` and `chat-reply` queues
(`BullModule.registerQueue` with the same name resolves to the same queue) and
injects both. `GET /admin/queues` returns
`[{ name, counts: await queue.getJobCounts() }, ...]`. Bull Board was the
alternative (richer: per-job inspection, retry) but it mounts its own
Express-based UI outside the app's palette and adds a dependency for a read-only
need — rejected in favor of a small endpoint the existing frontend renders in
the project's own style.

**Frontend: `/admin` under `(dashboard)`, `RequireAdmin` guard, reused primitives.**
The route tree lives at `app/(dashboard)/admin/` (the `(dashboard)` group already
hosts the auth-guard pattern) with its own `layout.tsx`. `RequireAdmin` mirrors
`RequireAuth` and additionally redirects `role !== 'ADMIN'` to `/dashboard`.
Data is fetched with the existing `useEffect` + `cancelled`-flag pattern (as in
`UsageSummary.tsx`) — no Zustand store, since admin data is page-local and not
shared. Confirmation modals reuse `components/dashboard/Modal.tsx`
(target-in-state + `busy` flag, exactly like the workspace delete-confirm in
`Sidebar.tsx`). Tables are hand-rolled (`components/admin/DataTable.tsx`) because
the repo has no table primitive and doesn't use TanStack Table or Radix — adding
either would be inconsistent with every existing list in the app.

**`lib/stores/admin.ts` is backend-integration code.** Although it lives in the
frontend, its job is encoding the request/response contract against the admin
DTOs, so it follows the backend rules (complete code authored for transcription,
not auto-edited). It reuses the `authFetch` wrapper via an `adminAuthFetch`
binding identical to `chatAuthFetch`.

## Risks / Trade-offs

- **[Risk]** An admin changes another admin's role or an admin count drops to
  zero through non-self changes. **Mitigation:** self-change is blocked (the
  realistic single-operator lockout); the broader multi-admin invariant is an
  accepted non-goal for this stage.
- **[Risk]** `getJobCounts()` reflects live BullMQ state that can lag or momentarily
  spike. **Trade-off:** acceptable — it's an at-a-glance health read, not a
  transactional source of truth; the frontend re-fetches on load.
- **[Trade-off]** Stats run fresh aggregate queries per dashboard load. Cheap at
  current scale; if the tables grow, a cached/materialized view is a later,
  isolated optimization — not pre-built here.
- **[Trade-off]** Cancel is period-end only, no immediate option. Chosen for user
  fairness; an `immediate` flag can be added later without reworking the sync
  path.

## Migration Plan

- Additive: new module registered in `AppModule`, one new method on the exported
  `BillingService`, new frontend routes. No schema migration, no changes to
  existing request/response contracts.
- Deploy by merging; the admin surface is live immediately for `ADMIN` users and
  invisible/forbidden to everyone else.
- Rollback is removing `AdminModule` from `AppModule` imports and the `/admin`
  route tree — nothing new is persisted, so there is no data migration to
  reverse. `cancelSubscription` left on `BillingService` is harmless if unused.

## Open Questions

- None — scope, authz model, cancel semantics, and pagination shape above are
  enough to implement.
