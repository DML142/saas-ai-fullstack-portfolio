## 1. Setup [you implement]

- [ ] 1.1 Install `@nestjs/schedule` as a dependency in `apps/backend/package.json`
- [ ] 1.2 Add `CRON_AVATAR_CLEANUP_SCHEDULE`, `CRON_WEBHOOK_EVENT_CLEANUP_SCHEDULE`, `CRON_WEBHOOK_EVENT_RETENTION_DAYS` to `apps/backend/.env` and `apps/backend/.env.example`
- [ ] 1.3 Register `ScheduleModule.forRoot()` in `apps/backend/src/app.module.ts`'s `imports` array

## 2. Cron module scaffold [you implement]

- [ ] 2.1 Create `apps/backend/src/cron/cron.config.ts`: env-configured constants with `process.env.X ?? default` fallbacks for both schedules and the retention window, plus the avatar-file grace period
- [ ] 2.2 Create `apps/backend/src/cron/cron.module.ts` importing `PrismaModule`, declaring `AvatarCleanupService` and `WebhookEventCleanupService` as providers, no controller
- [ ] 2.3 Register `CronModule` in `apps/backend/src/app.module.ts`'s `imports` array

## 3. Avatar orphan cleanup job [you implement]

- [ ] 3.1 Create `apps/backend/src/cron/avatar-cleanup.service.ts` with a `@Cron(CRON_AVATAR_CLEANUP_SCHEDULE)`-decorated method
- [ ] 3.2 `readdir(AVATAR_UPLOAD_DIR)` for on-disk files, `prisma.user.findMany({ where: { avatarUrl: { not: null } }, select: { avatarUrl: true } })` for referenced filenames, build a `Set` from `avatarUrl.split('/').pop()`
- [ ] 3.3 For each disk file not in the referenced set, `stat` it and skip if `mtime` is within the configured grace period; otherwise `unlink` it
- [ ] 3.4 Wrap the run in try/catch; log start, success (duration + deleted count), and failure via `private readonly logger = new Logger(AvatarCleanupService.name)`

## 4. Stale webhook event cleanup job [you implement]

- [ ] 4.1 Create `apps/backend/src/cron/webhook-event-cleanup.service.ts` with a `@Cron(CRON_WEBHOOK_EVENT_CLEANUP_SCHEDULE)`-decorated method
- [ ] 4.2 `prisma.processedWebhookEvent.deleteMany({ where: { processedAt: { lt: cutoffDate } } })` where `cutoffDate` is `now() - CRON_WEBHOOK_EVENT_RETENTION_DAYS`
- [ ] 4.3 Wrap the run in try/catch; log start, success (duration + deleted count from the `deleteMany` result), and failure via `private readonly logger = new Logger(WebhookEventCleanupService.name)`

## 5. Docs + tests [AI-authored — testing/docs exception]

- [ ] 5.1 Unit tests for `AvatarCleanupService`: deletes a file with no matching `avatarUrl` past the grace period; leaves a referenced file alone; leaves a too-recent unreferenced file alone; logs and swallows an error instead of throwing
- [ ] 5.2 Unit tests for `WebhookEventCleanupService`: deletes rows older than the retention window; leaves newer rows alone; logs and swallows an error instead of throwing

## 6. Verification [AI-authored — testing/docs exception]

- [ ] 6.1 Run both jobs manually against local dev data (temporarily invoke the service methods directly, or trigger via a short schedule) and confirm: an orphaned test file on disk gets deleted, a referenced avatar file survives, an old `ProcessedWebhookEvent` row (backdated via a direct DB update) gets deleted, a recent one survives
- [ ] 6.2 Confirm log output for both a successful run and a forced failure (e.g. temporarily pointing `AVATAR_UPLOAD_DIR` at a non-existent path) matches the expected start/success/failure shape
