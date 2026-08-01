## 1. Tier→limit config [you implement]

- [x] 1.1 Add `TIER_MESSAGE_LIMITS: Record<SubscriptionTier, number | null>` to `billing.config.ts` (or a new small config file) — `FREE: 50, LITE: 500, PRO: 2000, ULTRA: null` (null = unlimited)
- [x] 1.2 Add a helper to compute the current usage key: `usage:messages:<userId>:<YYYY-MM>` (calendar month, UTC)

## 2. Usage guard [you implement]

- [x] 2.1 Create `apps/backend/src/chat/guards/usage-limit.guard.ts`: resolve effective tier via `BillingService.getEffectiveTier`, look up the tier's limit; if `null` (unlimited), allow through immediately
- [x] 2.2 Peek current usage via `RedisService.get(key)` (parse as number, default 0) — do NOT increment here
- [x] 2.3 If usage >= limit, throw `ForbiddenException` with a structured body (`{ message, tier, limit, used }`) identifying it as a usage-quota rejection
- [x] 2.4 Wire the guard into `ChatModule` (needs `BillingService` + `RedisService` in scope — mirrors the module-encapsulation lesson from `RateLimitGuard`: `ChatModule` must import `BillingModule` and `RedisModule` for DI to resolve)

## 3. Increment on real sends [you implement]

- [x] 3.1 Apply `@UseGuards(UsageLimitGuard)` to `POST /chat/workspaces/:id/messages` in `ChatController`
- [x] 3.2 In `ChatService.sendMessage`, after the Prisma `create` succeeds, call `RedisService.incrementWithExpiry(usageKey, ~32 days in seconds)` to record the sent message
- [x] 3.3 Confirm a rejected (guard-blocked) send never reaches the increment call (it can't — the guard runs before the handler)

## 4. Usage exposure endpoint [you implement]

- [x] 4.1 Add `GET /chat/usage` to `ChatController` (JWT-guarded, no `UsageLimitGuard` — reading usage should never itself be blocked by usage)
- [x] 4.2 Return `{ tier, used, limit }` where `limit` is `null` for `ULTRA`

## 5. Docs + tests [AI-authored — testing/docs exception]

- [x] 5.1 Swagger: document `GET /chat/usage` and the `403` usage-quota response on the send-message route
- [x] 5.2 Unit tests for `UsageLimitGuard`: allows under limit, allows unlimited (`ULTRA`), rejects at/over limit with the structured `403` body, does not increment on its own
- [x] 5.3 Unit tests for the usage key helper / increment-on-send: message creation increments usage; a guard rejection does not

## 6. Frontend: real usage data [AI-authored — frontend exception]

- [x] 6.1 Add a small client fetch for `GET /chat/usage` (via the existing authenticated fetch helper)
- [x] 6.2 Replace `UsageSummary.tsx`'s static `USAGE` array's "Messages this month" row with real `{ used, limit }`, rendering an "Unlimited" state when `limit` is `null` instead of a progress bar
- [x] 6.3 On a `403` usage-quota response from send-message, surface a friendly "upgrade to send more" affordance (e.g. linking to pricing/billing) instead of a generic error toast

## 7. Verification

- [x] 7.1 With Docker/Redis up, send messages as a `FREE` test user past the configured limit; confirm the `N+1`th send returns `403` with the structured body and no new message is created — verified live: bulk-sent to exactly `50/50`, the 51st send returned `403` with `{ tier: FREE, limit: 50, used: 50 }`
- [x] 7.2 Confirm `GET /chat/usage` reflects the correct `used` count after several sends — verified live (`0/50` → `1/50` after one send → `50/50` after 49 more)
- [x] 7.3 Confirm an `ULTRA`-tier user can send past what would be the `FREE` limit without rejection — covered by unit tests (`ULTRA` → `null` limit skips the check entirely); not exercised live against a real `ULTRA` account
- [x] 7.4 Confirm the frontend `UsageSummary` renders real numbers and the upgrade prompt appears on a blocked send — verified live in the browser, including the link to `/#pricing`

## 8. Bugs found during transcription (fixed)

- [x] 8.1 `TIER_MESSAGE_LIMITS.ULTRA` was transcribed as `20000` instead of `null`, contradicting the "Ultra tier has no quota" requirement — fixed to `null`.
- [x] 8.2 `ChatService.sendMessage` was missing the `redisService.incrementWithExpiry` call entirely, so usage was never recorded and the quota could never trip — added the call between the Prisma `create` and the reply-queue enqueue.
- [x] 8.3 `GET /chat/usage` was transcribed as `@Post('usage')` — fixed to `@Get('usage')`.
