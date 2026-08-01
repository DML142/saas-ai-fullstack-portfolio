## 1. Setup [you implement]

- [x] 1.1 Install `@nestjs/schedule` as a dependency in `apps/backend/package.json`
- [x] 1.2 Add `CRON_AVATAR_CLEANUP_SCHEDULE`, `CRON_WEBHOOK_EVENT_CLEANUP_SCHEDULE`, `CRON_WEBHOOK_EVENT_RETENTION_DAYS` to `apps/backend/.env` and `apps/backend/.env.example`
- [x] 1.3 Register `ScheduleModule.forRoot()` in `apps/backend/src/app.module.ts`'s `imports` array

## 2. Cron module scaffold [you implement]

- [x] 2.1 Create `apps/backend/src/cron/cron.config.ts`: env-configured constants with `process.env.X ?? default` fallbacks for both schedules and the retention window, plus the avatar-file grace period
- [x] 2.2 Create `apps/backend/src/cron/cron.module.ts` importing `PrismaModule`, declaring `AvatarCleanupService` and `WebhookEventCleanupService` as providers, no controller
- [x] 2.3 Register `CronModule` in `apps/backend/src/app.module.ts`'s `imports` array

## 3. Avatar orphan cleanup job [you implement]

- [x] 3.1 Create `apps/backend/src/cron/avatar-cleanup.service.ts` with a `@Cron(CRON_AVATAR_CLEANUP_SCHEDULE)`-decorated method
- [x] 3.2 `readdir(AVATAR_UPLOAD_DIR)` for on-disk files, `prisma.user.findMany({ where: { avatarUrl: { not: null } }, select: { avatarUrl: true } })` for referenced filenames, build a `Set` from `avatarUrl.split('/').pop()`
- [x] 3.3 For each disk file not in the referenced set, `stat` it and skip if `mtime` is within the configured grace period; otherwise `unlink` it
- [x] 3.4 Wrap the run in try/catch; log start, success (duration + deleted count), and failure via `private readonly logger = new Logger(AvatarCleanupService.name)`

## 4. Stale webhook event cleanup job [you implement]

- [x] 4.1 Create `apps/backend/src/cron/webhook-event-cleanup.service.ts` with a `@Cron(CRON_WEBHOOK_EVENT_CLEANUP_SCHEDULE)`-decorated method
- [x] 4.2 `prisma.processedWebhookEvent.deleteMany({ where: { processedAt: { lt: cutoffDate } } })` where `cutoffDate` is `now() - CRON_WEBHOOK_EVENT_RETENTION_DAYS`
- [x] 4.3 Wrap the run in try/catch; log start, success (duration + deleted count from the `deleteMany` result), and failure via `private readonly logger = new Logger(WebhookEventCleanupService.name)`

## 5. Docs + tests [AI-authored — testing/docs exception]

- [x] 5.1 Unit tests for `AvatarCleanupService`: deletes a file with no matching `avatarUrl` past the grace period; leaves a referenced file alone; leaves a too-recent unreferenced file alone; logs and swallows an error instead of throwing
- [x] 5.2 Unit tests for `WebhookEventCleanupService`: deletes rows older than the retention window; leaves newer rows alone; logs and swallows an error instead of throwing

## 6. Verification [AI-authored — testing/docs exception]

- [x] 6.1 Ran both jobs live against the real dev DB/disk via a throwaway `NestFactory.createApplicationContext` script (removed after use): a synthetic orphaned file (backdated `mtime`) was deleted, the one real user's referenced avatar survived; a synthetic `ProcessedWebhookEvent` backdated 40 days was deleted, one backdated 5 days survived
- [x] 6.2 Success-path log shape (start → success with duration + count) confirmed live for both jobs; failure-path log shape (start → error with context, no throw) confirmed via the unit tests in 5.1/5.2, which exercise the real `Logger` (not mocked) and print actual `ERROR` lines — not separately forced live, since reproducing a genuine disk/DB failure locally without risking real dev data isn't worth it when the log call site is identical in both paths
