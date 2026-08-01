## Context

`BillingService.getEffectiveTier(userId)` already derives `FREE/LITE/PRO/
ULTRA` from the `Subscription` table (active/trialing → tier, else `FREE`).
`TierGuard` + `@MinTier` already exist to gate a route by *minimum* tier, but
nothing currently uses them, and minimum-tier gating is a different shape of
problem than usage limiting: `@MinTier(SubscriptionTier.PRO)` is a static,
binary "do you have at least this plan" check; a message quota is a
*counted, resetting, per-tier-numeric* check, which is closer in shape to
the rate-limit counter already built in `add-rate-limiting` than to
`TierGuard`. `RedisService.incrementWithExpiry` (fixed-window `INCR` +
conditional `EXPIRE`) is directly reusable here — a monthly quota is just a
fixed window with a ~30-day period instead of a 60-second one.

`Subscription.currentPeriodEnd` exists, but there is no `currentPeriodStart`
field, and `FREE` accounts have no `Subscription` row at all. The frontend's
existing `UsageSummary` placeholder already labels this "Messages this
month" (a calendar-month framing, not a Stripe-billing-period framing).

## Goals / Non-Goals

**Goals:**
- Enforce a real, per-tier monthly message cap on `POST
  /chat/workspaces/:id/messages`.
- Expose real usage numbers via a new endpoint for the frontend to render.
- Reuse the existing Redis counter mechanism rather than building a second
  one.
- Reject over-limit sends with a response the frontend can turn into an
  "upgrade to send more" UI, not just a bare status code.

**Non-Goals:**
- Anchoring the usage window to each user's actual Stripe billing-cycle
  boundary (would need a `currentPeriodStart` field or a live Stripe API
  call per check — more precision than a demo-scale quota needs; see
  Decision 1).
- Metering anything other than message count (storage, API calls, etc. —
  `UsageSummary`'s "COS Cloud storage" row stays a placeholder; out of
  scope here).
- Hard real-time atomicity between the quota check and the increment — see
  Decision 3's accepted race condition.

## Decisions

### 1. Calendar-month window, not Stripe billing-period window
Anchoring usage to each user's actual subscription period would need either
a new `currentPeriodStart` column (Stripe's webhook payload has it; the
schema currently discards it, keeping only `currentPeriodEnd`) or a live
Stripe API call on every usage check. Both are real complexity for a
number that, in this project, is illustrative rather than tied to real
metered billing. A calendar-month key (`usage:messages:<userId>:<YYYY-MM>`)
also uniformly covers `FREE` accounts, which have no `Subscription` row and
thus no period to anchor to at all. This matches the existing frontend
copy ("Messages this month") without inventing a new billing concept.

### 2. Reuse `RedisService.incrementWithExpiry`, don't build a second counter
The rate-limiting change already built exactly the primitive needed here: an
atomic `INCR` with `EXPIRE` set only on first creation. A monthly quota is
the same shape with a longer window (32 days, comfortably covering any
month length, self-correcting the next time a message is sent in the new
month since the key is simply different). No new Redis mechanism needed —
this is the second use of the same building block, which is the payoff of
having built it generically in the first place.

### 3. Guard checks (peeks), service increments — accepted race window
Unlike the rate-limit guard (which increments unconditionally and rejects
after the fact), this guard **peeks** the current count (`RedisService.get`,
already exists) and compares to the limit *before* the message is created,
without incrementing. `ChatService.sendMessage` increments only after the
Prisma `create` succeeds. This means a rejected attempt never counts against
the quota — important because "attempts" aren't billable events, "messages
sent" are.

The trade-off: two concurrent requests near the boundary could both pass the
peek before either increments, letting one extra message through. This is
accepted deliberately: unlike rate-limiting (defending against adversarial
abuse, where undercounting is a security gap), usage limiting here is an
accounting/UX feature protecting against nothing more adversarial than a
user's own multiple browser tabs — a rare, harmless off-by-one is a
reasonable trade for avoiding a full check-and-increment transaction (Lua
script) for a non-adversarial limit.

### 4. Reject with `403 Forbidden`, not `429 Too Many Requests`
`429` (used for rate limiting) means "you're going too fast, slow down and
retry." A quota is exhausted, not exceeded-in-speed — retrying sooner
doesn't help, upgrading does. `TierGuard` already throws `ForbiddenException`
(403) for "your plan doesn't include this," which a usage cap is a variant
of ("your plan's message allowance for this month is used up"). The
response body includes a small structured payload (`{ message, tier, limit,
used }`) so the frontend can render a specific "upgrade to send more" call
to action instead of a generic error toast — this is what `tech.md`'s "not
just a bare 429" note is asking for, achieved by picking the right status
code and a body the client can act on, not by inventing new HTTP semantics.

### 5. `ULTRA` = no limit, expressed as `null`, not `Infinity`
The per-tier config maps `ULTRA` to `null` rather than `Infinity`. `null`
serializes cleanly over JSON (`Infinity` becomes `null` anyway when
`JSON.stringify`'d, silently) and reads unambiguously in both the guard
("no limit configured, skip the check") and the `GET /chat/usage` response
("unlimited" is a real state the frontend should render explicitly, not a
huge number to divide a progress bar by).

## Risks / Trade-offs

- **Race condition on the boundary** (Decision 3) → accepted; documented
  above; revisit with a Lua script only if real abuse is observed.
- **Calendar-month vs. billing-period drift**: a user whose Stripe period
  renews mid-month gets a "fresh" quota at the calendar boundary, not their
  personal renewal date → acceptable given Non-Goals; would need real period
  tracking to fix, not attempted here.
- **Redis unavailable during the usage check**: unlike rate-limiting (which
  fails open for availability), a usage check failing open would let paying
  and free users send unlimited messages during a Redis outage. Given this
  is a demo-scale accounting feature (not a security control), failing open
  here is the right call too — an outage should not lock every user out of
  chat entirely. The guard treats a Redis error the same as "no data yet"
  (allow through), logging a warning.

## Migration Plan

No data migration — usage state lives only in Redis, TTL'd, self-resetting
monthly. Purely additive: new guard, new config, one new route, one
incrementing call added to `ChatService.sendMessage`. Rollback is removing
the guard/route — no state to unwind.

## Open Questions

Exact numeric limits (`FREE`/`LITE`/`PRO`) are illustrative, not derived from
real LLM cost — proposing `FREE: 50`, `LITE: 500`, `PRO: 2000`,
`ULTRA: unlimited` per month in `tasks.md`; easy to tune later, not a design
question.
