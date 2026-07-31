## Why

Every auth endpoint (`login`, `register`, `forgot-password`, `resend-verification`,
`reset-password`, `verify-email`) currently accepts unlimited requests. Nothing
stops credential stuffing against `/auth/login`, spam account creation via
`/auth/register`, or email bombing via `/auth/forgot-password` and
`/auth/resend-verification`. This is called out in `CLAUDE.md` as a deferred
security gap that should be closed before any deployment, and Redis (already
running for refresh-token families) is the natural backing store for it.

## What Changes

- Add a Redis-backed fixed-window rate limiter: a manual `INCR` + `EXPIRE`
  counter in `RedisService` (not the `@nestjs/throttler` package — a manual
  counter is preferred here for learning value, matches the existing
  hand-rolled `RedisService` style, and needs no new dependency).
- Add a `RateLimitGuard` + `@RateLimit(limit, windowSeconds)` decorator,
  keyed by `route + IP` (falls back to `route` alone if IP is unavailable).
- Apply per-route limits to the six sensitive `AuthController` endpoints:
  `login`, `register`, `forgot-password`, `resend-verification`,
  `reset-password`, `verify-email`.
- On limit exceeded, return `429 Too Many Requests` with a `Retry-After`
  header before any controller/service logic runs.

## Capabilities

### New Capabilities
- `rate-limiting`: Redis-backed request throttling by IP + route, applied to
  sensitive auth endpoints, rejecting requests over the configured limit with
  a `429` response.

### Modified Capabilities
- `user-auth`: `login`, `register`, `forgot-password`, `resend-verification`,
  `reset-password`, and `verify-email` gain a rate-limit precondition — each
  can now reject a request with `429` before reaching existing auth logic
  when the caller's request rate for that route exceeds its configured limit.

## Impact

- **Affected code**: `apps/backend/src/redis/redis.service.ts` (new counter
  method), new `apps/backend/src/rate-limit/` module (guard + decorator +
  DTO-less), `apps/backend/src/auth/auth.controller.ts` (decorator
  annotations on the six routes).
- **No new dependencies** — reuses the existing `ioredis` client already
  wired through `RedisModule`.
- **No schema/migration changes** — state lives only in Redis with TTL-based
  expiry, no Postgres/Prisma changes.
- **No breaking changes** — existing callers within normal usage patterns are
  unaffected; only abusive request rates are newly rejected.
