## ADDED Requirements

### Requirement: Scheduled orphaned-avatar-file cleanup
The system SHALL run a recurring job that deletes avatar files present under
`AVATAR_UPLOAD_DIR` that are not referenced by any `User.avatarUrl`, skipping
any file modified more recently than a short grace period to avoid deleting
a file mid-upload.

#### Scenario: Orphaned file with no referencing user
- **WHEN** the cleanup job runs and a file exists under `AVATAR_UPLOAD_DIR`
  whose name does not match any user's `avatarUrl` in the database, and the
  file's last-modified time is older than the grace period
- **THEN** the file is deleted from disk

#### Scenario: File still referenced by a user
- **WHEN** the cleanup job runs and a file exists under `AVATAR_UPLOAD_DIR`
  whose name matches a `User.avatarUrl` value in the database
- **THEN** the file is left in place

#### Scenario: Recently written file within the grace period
- **WHEN** the cleanup job runs and a file exists under `AVATAR_UPLOAD_DIR`
  with no matching `User.avatarUrl`, but its last-modified time is within
  the configured grace period
- **THEN** the file is left in place for this run

### Requirement: Scheduled stale processed-webhook-event cleanup
The system SHALL run a recurring job that deletes `ProcessedWebhookEvent`
rows whose `processedAt` timestamp is older than a configured retention
window.

#### Scenario: Event older than the retention window
- **WHEN** the cleanup job runs and a `ProcessedWebhookEvent` row's
  `processedAt` is older than the configured retention window
- **THEN** the row is deleted

#### Scenario: Event within the retention window
- **WHEN** the cleanup job runs and a `ProcessedWebhookEvent` row's
  `processedAt` is within the configured retention window
- **THEN** the row is left in place

### Requirement: Per-job run logging
The system SHALL log the start, successful completion (including duration
and the count of items affected), and failure (including the error) of each
cron job run.

#### Scenario: Successful job run
- **WHEN** a cron job completes without error
- **THEN** a log entry is recorded including the job name, its duration, and
  the number of items it deleted

#### Scenario: Failed job run
- **WHEN** a cron job throws an error during its run
- **THEN** the error is logged with enough context to identify which job
  failed, and the job does not crash the application process

### Requirement: Independently configurable schedules and retention
The system SHALL allow each cron job's schedule expression, and the
webhook-event retention window, to be configured via environment variables,
each with a safe default if unset.

#### Scenario: Environment variable set
- **WHEN** a `CRON_*` environment variable for a job's schedule or the
  retention window is set
- **THEN** the job uses that configured value

#### Scenario: Environment variable unset
- **WHEN** a `CRON_*` environment variable is not set
- **THEN** the job falls back to its documented default value
