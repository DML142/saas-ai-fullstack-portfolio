## Why

Two kinds of stale state currently accumulate with no cleanup mechanism: avatar files left orphaned on disk when an upload's disk write succeeds but the following DB update doesn't (or an old file is replaced without its stale row ever pointing back to it), and `ProcessedWebhookEvent` rows, which are written on every processed Stripe webhook for idempotency but are never deleted — the table grows forever. tech.md Step 1 calls for scheduled cleanup now that there's something real to clean up (uploads shipped in `add-avatar-upload`), and it's a self-contained `@nestjs/schedule` learning piece before the larger admin panel (Step 2) needs somewhere to surface job run history.

## What Changes

- Add `@nestjs/schedule` as a backend dependency and register `ScheduleModule.forRoot()` globally in `AppModule`.
- Add a new `CronModule` (`apps/backend/src/cron/`) following the repo's flat feature-module convention, with no controller (internal-only, no HTTP surface).
- Add an avatar-orphan-cleanup job: on a daily schedule, diff files on disk under `AVATAR_UPLOAD_DIR` against every `User.avatarUrl` in Postgres, and delete any file not referenced by a user row.
- Add a stale-webhook-event-cleanup job: on a daily schedule, delete `ProcessedWebhookEvent` rows older than a retention window (env-configurable, default 30 days) — safe because Stripe only retries webhook delivery for a bounded period, well inside the retention window.
- Add per-job logging (start, success with duration/count, failure) using the existing `new Logger(ClassName.name)` per-class convention — no new shared logger abstraction.
- Add `CRON_*` env vars (schedule expressions, retention window) read directly via `process.env`, matching the codebase's existing no-`ConfigService` convention.

## Capabilities

### New Capabilities
- `cron-jobs`: scheduled background cleanup jobs (orphaned avatar files, stale processed-webhook-event rows), their schedules, retention rules, and logging/observability contract.

### Modified Capabilities
<!-- none — no existing capability's requirements change; avatar upload and billing webhook behavior are unaffected, this only adds a new consumer of data they already produce -->

## Impact

- **New dependency**: `@nestjs/schedule` in `apps/backend/package.json`.
- **New files**: `apps/backend/src/cron/cron.module.ts`, `apps/backend/src/cron/avatar-cleanup.service.ts`, `apps/backend/src/cron/webhook-event-cleanup.service.ts`, `apps/backend/src/cron/cron.config.ts`.
- **Modified files**: `apps/backend/src/app.module.ts` (register `ScheduleModule.forRoot()` + `CronModule`), `.env` / `.env.example` (new `CRON_*` vars).
- **Data touched**: filesystem under `AVATAR_UPLOAD_DIR`, `User.avatarUrl` (read-only), `ProcessedWebhookEvent` (delete).
- **No API surface change** — nothing HTTP-facing, no Swagger docs needed.
