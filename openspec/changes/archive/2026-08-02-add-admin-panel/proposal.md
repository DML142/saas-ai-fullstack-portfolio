## Why

The `ADMIN` role exists end to end — it's in the `Role` enum, baked into the
access token, and enforced by `RolesGuard` + `@Roles` — but no route actually
uses it beyond a throwaway `/auth/admin-check`. There is no way to see or manage
users, inspect or cancel subscriptions, read platform stats, or check queue
health without going straight to the database or the Stripe dashboard. tech.md
Step 1 places the admin panel here deliberately: cron jobs, uploads, and usage
limits have shipped, so there is now real operational state to administer rather
than an empty shell. This change gives `ADMIN` a real, guarded surface — the
first genuine consumer of the RBAC system the project already built.

## What Changes

- Add a new backend `admin` module (`apps/backend/src/admin/`), a flat feature
  module in the repo's convention, guarded at the class level by
  `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`.
- **Users**: paginated + searchable list, single-user detail, and a role-change
  endpoint that refuses to change the caller's own role (anti-lockout).
- **Subscriptions**: paginated list (read from the DB, the webhook-synced cache),
  and a cancel endpoint that cancels *at period end* via Stripe — the DB is never
  written directly; the existing webhook path syncs `cancelAtPeriodEnd`/`status`
  back, preserving "Stripe is the source of truth."
- **Stats**: aggregate counts derived from existing data — totals, users by role,
  subscriptions by tier/status, and a signups-over-time series (last 30 days).
- **Queues**: a lightweight endpoint returning `getJobCounts()` for the existing
  `email` and `chat-reply` BullMQ queues — no Bull Board, no new dependency.
- Add `BillingService.cancelSubscription(userId)` (Stripe `subscriptions.update`
  with `cancel_at_period_end: true`), reusing the existing exported service.
- Add a frontend `/admin` route tree under the `(dashboard)` group with its own
  `RequireAdmin` guard, sidebar, hand-rolled tables, and confirmation modals for
  the two destructive actions (role change, subscription cancel).

## Capabilities

### New Capabilities
- `admin`: an ADMIN-only management surface over users (list/view/change role),
  subscriptions (list/cancel-at-period-end via Stripe), platform statistics, and
  BullMQ queue health — its authorization model, pagination contract, and the
  invariant that admin never writes billing state directly.

### Modified Capabilities
<!-- none — no existing capability's requirements change. Role/tier semantics,
     the billing webhook sync, and queue behavior are all reused unchanged; this
     change only adds a new ADMIN-gated reader/actor on top of them. -->

## Impact

- **New files (backend)**: `apps/backend/src/admin/admin.module.ts`,
  `admin.controller.ts`, `admin.service.ts`, `dto/list-users.query.dto.ts`,
  `dto/update-role.dto.ts`, `dto/list-subscriptions.query.dto.ts`, plus
  co-located `*.spec.ts`.
- **Modified files (backend)**: `apps/backend/src/app.module.ts` (register
  `AdminModule`), `apps/backend/src/billing/billing.service.ts` (add
  `cancelSubscription`), `billing.service.spec.ts` (cover it).
- **New files (frontend)**: `app/(dashboard)/admin/` route tree
  (`layout.tsx`, `page.tsx`, `users/`, `subscriptions/`, `queues/`),
  `components/auth/RequireAdmin.tsx`, `components/admin/AdminSidebar.tsx`,
  `components/admin/DataTable.tsx`, `lib/stores/admin.ts`.
- **Modified files (frontend)**: `components/dashboard/Sidebar.tsx` (ADMIN-only
  link to `/admin`).
- **No schema migration** — all stats derive from existing `User.createdAt`,
  `Subscription.tier/status`, and `Role`. No new Prisma model.
- **No new dependency** — reuses BullMQ, Stripe, Prisma, and existing UI
  primitives (no Bull Board, no table/dialog library).
- **Data touched**: `User.role` (write, non-self only), Stripe subscription
  (cancel-at-period-end; DB synced via webhook, never written directly here).
