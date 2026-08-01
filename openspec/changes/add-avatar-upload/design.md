## Context

No `users` module exists yet — `AuthService.getPublicUser` (`auth.service.ts`)
is the only place user data is read back to the client. There is also no
existing file-upload plumbing anywhere in the backend: no multer config, no
`ServeStaticModule`, no file-validation pipe. This is the first upload
feature (`tech.md` Step 1), deliberately the smallest of the three upload
targets (avatar / documents / images) so the pattern gets established once,
cleanly, before Step 2 (cron cleanup) needs real files to clean up.

## Goals / Non-Goals

**Goals:**
- Let a logged-in user upload an image as their avatar and have it show up
  in the dashboard (`AccountBadge`) and Settings.
- Validate uploads server-side (MIME type + size) before ever touching disk.
- Persist only a URL on the `User` row — the file itself lives on disk, not
  in Postgres.
- Establish a reusable pattern (env-configured upload dir, static serving,
  disk-file lifecycle) that Step 1's siblings (documents, images) and
  Step 2's cleanup cron can build on.

**Non-Goals:**
- Cloud/object storage (S3, etc.) — explicitly deferred to production
  readiness (`tech.md` Step 7 territory); local disk is correct for dev.
- Image resizing/cropping/thumbnailing — store the upload as-is.
- Multiple avatars, avatar history, or CDN-backed delivery.
- Orphaned-file cleanup (a file left on disk after, say, a failed DB write,
  or from a user who uploads a new avatar before the old file is deleted) —
  that's explicitly `tech.md` Step 2's job (cron cleanup), not this change's.
  This change's `DELETE`/replace paths delete the old file synchronously on
  the happy path; anything that survives that isn't cleaned up here.

## Decisions

### 1. New `users` module, not folding into `auth`
`auth` already owns registration/login/token/OAuth concerns — a sizeable
module on its own (`auth.controller.ts`, `auth.service.ts`, `guards/`,
`decorators/`, `dto/`). Avatar upload is a distinct responsibility (user
profile data, not authentication), and `tech.md`'s later steps (documents,
images, eventually admin-managed user data) all belong under the same
umbrella. Starting a `users` module now, rather than bolting onto `auth`,
avoids `auth.controller.ts` becoming a dumping ground for unrelated
user-data routes. `UsersModule` imports `PrismaModule` directly (cheap,
already exported) — it does not need anything from `AuthModule` itself,
only the `JwtAuthGuard` it already re-exports from `auth/guards/`.

### 2. Multer + Nest's built-in `ParseFilePipe`, not a custom validator
The repo's existing validation convention (class-validator decorators on DTO
properties, `apps/backend/src/auth/dto/is-valid-password.decorator.ts`)
doesn't apply here — `req.file` isn't a DTO body field, class-validator
never sees it. Nest ships exactly the right tool for this:
`FileInterceptor('avatar')` populates `req.file`, and `ParseFilePipe` with
`FileTypeValidator` (MIME allowlist) and `MaxFileSizeValidator` (byte cap)
runs as a parameter pipe on the controller method, before the handler body
executes. This is the standard Nest idiom for file uploads and needs no new
abstraction — writing a bespoke `PipeTransform` here would just be
reinventing what `ParseFilePipe` already does.

### 3. Multer memory storage + explicit `fs.writeFile`, not `multer.diskStorage`
`FileInterceptor`'s default storage engine (no `storage` option given) is
multer's in-memory storage — the upload lands in `file.buffer` and never
touches disk until the handler decides to write it. This matters because of
an ordering problem with `multer.diskStorage`: it streams the file to disk
*as multer parses the request*, before Nest's `ParseFilePipe` validators
(MIME type, size) ever run — an invalid file would already be on disk by the
time it's rejected, requiring cleanup-on-rejection logic. With memory
storage, `ParseFilePipe` validates `file.buffer` first; only a file that
passes both validators ever reaches `UsersService`, which writes the buffer
to `process.env.AVATAR_UPLOAD_DIR` itself under a generated filename
(`<userId>-<uuid>.<ext>`, extension derived from the validated MIME type —
never the client-supplied filename, avoiding directory traversal). A
`ServeStaticModule.forRoot({ rootPath: AVATAR_UPLOAD_DIR, serveRoot:
'/uploads/avatars' })` entry in `app.module.ts` serves the files back;
`avatarUrl` stored on `User` is the resulting `/uploads/avatars/<filename>`
path (relative, not an absolute URL — the frontend already knows its own API
origin to prefix, same as it would for any other backend-relative asset).
Memory storage is only appropriate because avatars are small and capped by
`AVATAR_MAX_SIZE_BYTES` — it would be the wrong call for the larger
document/image uploads `tech.md` lists as this feature's siblings, where
disk-streaming to avoid buffering large files in process memory matters
more than avoiding the validation-ordering issue.

### 4. `avatarUrl` is nullable, additive column — no backfill
Every existing user has no avatar; `avatarUrl String?` defaults to `null`
and needs no migration data-fill. `AuthService.getPublicUser`'s `select`
and the login/register/refresh safe-user shape gain the field the same way
`role`/`tier` are already assembled there — no new spec requirement on
`user-auth` itself (see proposal: this is exposing `user-profile` data
through an existing response shape, not changing auth *behavior*).

### 5. Replacing an avatar deletes the old file synchronously
On `POST /users/me/avatar` when the user already has an `avatarUrl`, the
service deletes the old file from disk (`fs.unlink`, swallowing
`ENOENT` — the file may already be gone) before writing the new `avatarUrl`
to the DB. This keeps disk usage from growing unbounded on repeated
uploads without needing to wait for the Step 2 cleanup cron. It is
best-effort, not transactional with the DB write — see Risks.

## Risks / Trade-offs

- **[Risk]** Disk-write and DB-write aren't atomic: if the DB update fails
  after the file is written, an orphaned file is left on disk.
  **Mitigation**: acceptable for a dev-only local-disk feature; this is
  exactly the class of problem `tech.md` Step 2's cleanup cron exists to
  catch later. Not solved here.
- **[Risk]** A malicious/misnamed file could attempt directory traversal via
  its original filename. **Mitigation**: the disk filename is always
  server-generated (`<userId>-<timestamp>.<ext>`, extension taken from the
  validated MIME type, not the client-supplied name) — the original
  filename is never used to construct a path.
- **[Risk]** No image dimension/decoding validation — a file could pass the
  MIME-type check (e.g. spoofed `Content-Type`) without being a valid image.
  **Mitigation**: explicitly out of scope (Non-Goals); acceptable for a
  portfolio-quality demo feature, called out here rather than silently
  ignored.
- **[Trade-off]** Local disk storage means uploaded avatars don't survive a
  container rebuild/redeploy. Acceptable for local dev; production swap to
  object storage is deferred by design (`tech.md` Step 7).

## Migration Plan

1. `prisma migrate dev --name add_user_avatar_url` — additive nullable
   column, no application downtime, no data backfill.
2. Add `AVATAR_UPLOAD_DIR` and `AVATAR_MAX_SIZE_BYTES` to `.env`/
   `.env.example`; create the upload directory (gitignored) if it doesn't
   exist on startup.
3. Deploy backend (new module + static route) and frontend (upload control
   + `AccountBadge` change) together — the frontend upload control calls a
   route that doesn't exist until the backend change ships, so there's no
   safe order to split this across two deploys; ship as one change.
4. Rollback: revert the migration is safe (drops a nullable, no-longer-read
   column) since nothing else depends on `avatarUrl` existing.

## Open Questions

- None — scope is deliberately narrow (single image, local disk, no resize)
  per the Non-Goals above.
