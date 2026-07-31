## 1. Redis counter [you implement]

- [x] 1.1 Add an `incrementWithExpiry(key, windowSeconds)` method to `RedisService` using `INCR` + conditional `EXPIRE` (only when the counter was just created, i.e. `incr` result is `1`); return the current count
- [x] 1.2 Handle the Redis-unreachable case so the caller can fail open (catch and return `null`, don't throw from the service)

## 2. Rate-limit module [you implement]

- [x] 2.1 Create `apps/backend/src/rate-limit/` with a `@RateLimit(limit, windowSeconds)` decorator (SetMetadata, mirrors `auth/decorators/roles.decorator.ts`)
- [x] 2.2 Create `RateLimitGuard` (`CanActivate`): read metadata via `Reflector`, build key from `routeKey:ip`, call `RedisService.incrementWithExpiry`, compare to limit
- [x] 2.3 On exceeded: throw `HttpException` with status `429` and a `Retry-After` header (fixed window length, not the precise remaining TTL)
- [x] 2.4 On Redis error: log and allow the request through (fail open)
- [x] 2.5 Register `RateLimitModule` (exporting the guard) and import it in `AuthModule` (not `AppModule` — module encapsulation means the guard is resolved via the injector of the module that owns the controller using it)

## 3. Apply to auth routes [you implement]

- [x] 3.1 Annotate `AuthController.login` with `@UseGuards(RateLimitGuard)` + `@RateLimit(10, 60)`
- [x] 3.2 Annotate `register` with `@RateLimit(5, 60)`
- [x] 3.3 Annotate `forgotPassword` with `@RateLimit(3, 60)`
- [x] 3.4 Annotate `resend` (resend-verification) with `@RateLimit(3, 60)`
- [x] 3.5 Annotate `resetPassword` with `@RateLimit(5, 60)`
- [x] 3.6 Annotate `verifyEmail` with `@RateLimit(10, 60)`

## 4. Docs + tests [AI-authored — testing/docs exception]

- [x] 4.1 Swagger: document the `429` response on the six rate-limited routes (`@ApiTooManyRequestsResponse`)
- [x] 4.2 Unit tests for `RateLimitGuard`: allows under limit, rejects over limit with `429`, sets `Retry-After`, tracks distinct IPs independently, fails open when the Redis call returns `null`, reads metadata from handler+class
- [x] 4.3 Unit tests for `RedisService.incrementWithExpiry`: first call sets TTL, subsequent calls within the window don't reset it, returns `null` on Redis failure
- [x] 4.4 Fixed `auth.controller.spec.ts`, which broke once `AuthController` depended on `RateLimitGuard` (needs `RedisService` in the DI graph) — overrode the guard instead of wiring `RedisService` into that unit test

## 5. Verification

- [x] 5.1 Manually hammered `POST /auth/login` past the configured limit (12 rapid requests): requests 1–10 reached the handler (`401`, invalid creds), 11–12 returned `429` with `Retry-After: 60`
- [x] 5.2 Confirmed the Redis key expired on its own after the window and a subsequent request succeeded again (`401`, not `429`) with the counter reset to `1` and a fresh TTL
- [x] 5.3 Verified via `RateLimitGuard` unit test (mocked distinct IPs) rather than live traffic — a single local client can't produce two genuinely different source IPs without a proxy, which is out of scope to fake
