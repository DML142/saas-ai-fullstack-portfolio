## Context

`AuthController` exposes six unauthenticated (or self-authenticating) POST
routes with no request-volume defense: `login`, `register`,
`forgot-password`, `resend-verification`, `reset-password`, `verify-email`.
Redis is already available in-process via `RedisService` (`ioredis` client),
used today for refresh-token families and verification/reset tokens with
`SET ... EX`. No throttling library is installed. `CLAUDE.md` documents this
gap explicitly and specifies the intended shape: "Redis-backed throttle keyed
by IP + route ... or a manual Redis counter (for learning value)".

## Goals / Non-Goals

**Goals:**
- Cap request rate per (route, client IP) using a fixed-window counter in
  Redis, reusing the existing `RedisService`/`ioredis` connection.
- Apply distinct, per-route limits to the six sensitive auth endpoints.
- Reject over-limit requests with `429` + `Retry-After` before the route
  handler (and therefore before DB/email-queue work) runs.
- Keep the mechanism generic enough to attach to any route via a decorator,
  not hardcoded to `auth`.

**Non-Goals:**
- Cloudflare / edge-level volumetric DDoS protection — deferred, deploy-time,
  out of scope for this change (per `CLAUDE.md`).
- CAPTCHA/Turnstile integration — separate, deploy-time, out of scope.
- Per-user (as opposed to per-IP) limiting, or distributed sliding-window
  algorithms — a fixed-window IP+route counter is sufficient for the stated
  threat model (credential stuffing, spam registration, email bombing, token
  guessing) and matches the project's "manual counter, learning value" brief.
- Rate limiting non-auth routes (chat, billing) — can reuse the same guard
  later, but isn't part of this change's scope.

## Decisions

### 1. Manual Redis counter over `@nestjs/throttler`
`@nestjs/throttler` (with `@nest-lab/throttler-storage-redis` or similar)
would work, but:
- It's a new dependency the project doesn't otherwise need.
- `CLAUDE.md` explicitly names the manual-counter path as preferred "for
  learning value."
- `RedisService` is already a thin, hand-rolled wrapper over `ioredis`
  (`set`/`get`/`del`/family helpers) — a counter method fits that existing
  pattern directly instead of introducing a second rate-limiting subsystem
  alongside it.

Implementation: `INCR key` (atomic in Redis), and `EXPIRE key window` only
when the counter was just created (`INCR` result `=== 1`). This is the
standard fixed-window counter pattern — one round trip per check via
`ioredis` pipelining (`multi().incr(key).ttl(key).exec()`), avoiding a
race between `INCR` and a separate `EXPIRE`.

**Fixed window vs. sliding window**: a fixed window allows a burst of up to
`2 * limit` requests across a window boundary. Accepted trade-off — the
threat model here is sustained abuse (credential stuffing, spam, bombing),
not tight burst precision, and a sliding-window log is meaningfully more
complex for no practical benefit at this scale.

### 2. Guard + decorator, not middleware or an interceptor
A `CanActivate` guard (`RateLimitGuard`) reads limit config off route
metadata set by a `@RateLimit(limit, windowSeconds)` decorator (via
`Reflector`, same pattern already used by `RolesGuard` + `@Roles`). This:
- Matches the existing `RolesGuard`/`@Roles` convention in
  `apps/backend/src/auth/guards` and `decorators` — a reviewer or future-me
  reading `auth.controller.ts` sees one consistent style for
  metadata-driven guards.
- Runs in the guard phase, before the controller method body executes —
  unlike an interceptor (which wraps the handler and still invokes it) or
  middleware (which runs before routing/DTO validation and can't easily read
  per-route decorator metadata).

### 3. Key composition: `ratelimit:<routeKey>:<ip>`
`routeKey` is a short fixed string per decorated route (e.g. `auth-login`),
not the raw Express path, so the key stays stable if routes are ever
reorganized. IP is read from `req.ip` (Express, respects Nest's
`trust proxy` setting if configured) with a fallback to a constant
`"unknown"` bucket if IP is unavailable, so the guard never throws — it
still degrades to a (weaker) global-per-route limit rather than crashing.

### 4. Limits per route (fixed window, defaults — tunable via constants, not env)
| Route | Limit | Window |
|---|---|---|
| `POST /auth/login` | 10 | 60s |
| `POST /auth/register` | 5 | 60s |
| `POST /auth/forgot-password` | 3 | 60s |
| `POST /auth/resend-verification` | 3 | 60s |
| `POST /auth/reset-password` | 5 | 60s |
| `POST /auth/verify-email` | 10 | 60s |

Login/verify get more headroom (normal typo/retry traffic); registration and
email-triggering routes get tighter caps (each success enqueues a real email
job on the BullMQ `email` queue — the limiter is also protecting queue/SMTP
capacity, not just the DB).

## Risks / Trade-offs

- **Shared IPs (NAT/corporate networks) hit the cap faster** → limits are
  deliberately generous (not security-tight to the point of blocking normal
  shared-IP usage); acceptable for a portfolio-scale app, revisit with
  per-user+IP composite keying if it becomes a real problem.
- **`req.ip` can be spoofed if `trust proxy` is misconfigured behind a
  reverse proxy** → out of scope here (no reverse proxy in local/dev stack
  today); note left in code that production deployment must set Express
  `trust proxy` correctly before this guard's IP extraction is trustworthy.
- **Redis outage disables limiting (fails open) or blocks all requests
  (fails closed)** → choose fail-open (log + allow) so a Redis blip doesn't
  take down auth entirely; existing `RedisService` already throws at
  bootstrap if `REDIS_URL` is missing, so total Redis unavailability at
  runtime is treated as an existing operational assumption, not something
  this guard needs to newly solve.

## Migration Plan

No data migration. Purely additive: new guard/decorator module, new
`RedisService` method, decorator annotations added to six existing
controller methods. Rollback is deleting the decorators (or the whole
module) — no state to unwind since counters are TTL'd and ephemeral.

## Open Questions

None outstanding — limits above are defaults tunable later without a design
change.
