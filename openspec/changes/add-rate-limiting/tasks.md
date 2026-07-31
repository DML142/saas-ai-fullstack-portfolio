## 1. Redis counter [you implement]

- [ ] 1.1 Add an `incrementWithExpiry(key, windowSeconds)` method to `RedisService` using `multi().incr(key).ttl(key).exec()`, setting `EXPIRE` only when the counter was just created (`incr` result is `1`); return the current count
- [ ] 1.2 Handle the Redis-unreachable case so the caller can fail open (let the guard decide, don't throw from the service)

## 2. Rate-limit module [you implement]

- [ ] 2.1 Create `apps/backend/src/rate-limit/` with a `@RateLimit(limit, windowSeconds)` decorator (SetMetadata, mirrors `auth/decorators/roles.decorator.ts`)
- [ ] 2.2 Create `RateLimitGuard` (`CanActivate`): read metadata via `Reflector`, build key `ratelimit:<routeKey>:<ip>`, call `RedisService.incrementWithExpiry`, compare to limit
- [ ] 2.3 On exceeded: throw `HttpException` with status `429` and a `Retry-After` header (seconds remaining in the window)
- [ ] 2.4 On Redis error: log and allow the request through (fail open)
- [ ] 2.5 Register `RateLimitModule` (exporting the guard) and import it in `AppModule`

## 3. Apply to auth routes [you implement]

- [ ] 3.1 Annotate `AuthController.login` with `@UseGuards(RateLimitGuard)` + `@RateLimit(10, 60)`
- [ ] 3.2 Annotate `register` with `@RateLimit(5, 60)`
- [ ] 3.3 Annotate `forgotPassword` with `@RateLimit(3, 60)`
- [ ] 3.4 Annotate `resend` (resend-verification) with `@RateLimit(3, 60)`
- [ ] 3.5 Annotate `resetPassword` with `@RateLimit(5, 60)`
- [ ] 3.6 Annotate `verifyEmail` with `@RateLimit(10, 60)`

## 4. Docs + tests [you implement]

- [ ] 4.1 Swagger: document the `429` response on the six rate-limited routes
- [ ] 4.2 Unit tests for `RateLimitGuard`: allows under limit, rejects over limit with `429`, tracks distinct IPs independently, fails open when the Redis call throws
- [ ] 4.3 Unit test for `RedisService.incrementWithExpiry`: first call sets TTL, subsequent calls within the window don't reset it

## 5. Verification

- [ ] 5.1 Manually hammer `POST /auth/login` past the configured limit (e.g. a small script or repeated curl) and confirm the `N+1`th request returns `429` with `Retry-After`
- [ ] 5.2 Confirm the counter resets and requests succeed again once the window elapses
- [ ] 5.3 Confirm requests from a different IP are not affected by another IP's exhausted limit
