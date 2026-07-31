## Why

Subscription tier currently gates nothing: a `FREE` account and an `ULTRA`
account behave identically once logged in, which makes the billing system
built in `add-stripe-subscriptions` functionally decorative. The dashboard's
`UsageSummary` component already displays "Messages this month" — but as
static placeholder numbers, not real usage. This change closes that loop by
enforcing a real per-tier monthly message limit on chat and exposing real
usage data to the frontend.

## What Changes

- Add a per-tier monthly message limit config (`FREE`/`LITE`/`PRO` capped,
  `ULTRA` unlimited), mirroring the existing `TIER_RANK` pattern in
  `billing.config.ts`.
- Add a Redis-backed monthly usage counter per user, reusing
  `RedisService.incrementWithExpiry` (already built for rate limiting) —
  keyed by user and calendar month, not the Stripe billing-period boundary
  (rationale in `design.md`).
- Add a guard on `POST /chat/workspaces/:id/messages` that rejects with a
  friendly `403` (with a machine-readable reason, not a bare `429`) once the
  caller's monthly usage is at or above their tier's limit. The guard checks
  the current count but does not increment it — only a message that is
  actually created increments the counter, so rejected attempts don't count
  against the limit.
- Add `GET /chat/usage` returning the caller's current usage, limit, and
  tier, so the frontend can replace `UsageSummary`'s static placeholder data
  with real numbers.
- Frontend: wire `UsageSummary.tsx` to the new endpoint (AI-authored directly
  per the project's frontend exception — this is rendering existing backend
  data, not new client/backend contract code).

## Capabilities

### New Capabilities
(none — this extends the existing `chat` capability)

### Modified Capabilities
- `chat`: sending a message now additionally requires the caller to be
  within their tier's monthly message quota; a new requirement covers
  quota enforcement and usage exposure.

## Impact

- **Affected code**: `apps/backend/src/chat/chat.controller.ts` (new guard on
  the send-message route, new `GET /chat/usage` route),
  `apps/backend/src/chat/chat.service.ts` (increment on successful send),
  new `apps/backend/src/chat/guards/usage-limit.guard.ts` and a small tier→
  limit config, reusing `apps/backend/src/redis/redis.service.ts` and
  `BillingService.getEffectiveTier` (no changes needed to either).
- **Frontend**: `apps/frontend/components/dashboard/UsageSummary.tsx` swaps
  its static `USAGE` array for data fetched from `GET /chat/usage`.
- **No schema/migration changes** — usage state lives only in Redis with
  TTL-based expiry, same pattern as the rate-limit counters.
- **No breaking changes** — existing send-message behavior is unchanged for
  callers under their limit; only over-limit callers see new behavior.
