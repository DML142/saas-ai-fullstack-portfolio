## Why

`tech.md` Step 1 calls for avatar upload as the smallest of the three upload
targets (avatar / documents / images), chosen to establish the upload pattern
once before Step 2 (cron cleanup of orphaned files) needs something real to
clean up. Today there is no `users` module at all — user data reads live
entirely inside `auth` (`AuthService.getPublicUser`) — and `AccountBadge.tsx`
renders a hardcoded `/userico.png` placeholder because there is no per-user
image to show. This change adds the first piece of user-owned profile state
(`avatarUrl`) and the upload endpoint that sets it.

## What Changes

- Add a new `users` backend module (first module outside `auth` to own user
  data), following the existing flat `src/<feature>/{dto,guards,decorators}`
  layout used by `billing`/`chat`.
- Add `POST /users/me/avatar` — a Multer `FileInterceptor` upload endpoint,
  guarded by the existing `JwtAuthGuard`, validating MIME type (image only)
  and size via Nest's built-in `ParseFilePipe` (`FileTypeValidator` +
  `MaxFileSizeValidator`) — no existing precedent for file validation in this
  repo, so this is new plumbing, not a reused pattern.
- Store the uploaded file on local disk under an env-configured directory
  (`AVATAR_UPLOAD_DIR`), serve it back via a new static route, and persist
  the public URL on the user record.
- Add `avatarUrl String?` to the `User` Prisma model (migration required) and
  include it in `AuthService.getPublicUser`'s `select` and the login/
  register/refresh "safe user" shape, so `avatarUrl` flows through the same
  places `role`/`tier` already do.
- Add `DELETE /users/me/avatar` to remove the current avatar (clears the
  field, deletes the file from disk).
- Frontend: add an avatar upload control to the Settings page's Account
  section, and update `AccountBadge.tsx` to render `user.avatarUrl` when
  present instead of the static placeholder (both wired through the existing
  Zustand `auth.store.ts` / `authFetch` pattern — no TanStack Query in this
  repo).

## Capabilities

### New Capabilities
- `user-profile`: user-owned profile data and management, starting with
  avatar upload/removal (`POST /users/me/avatar`, `DELETE /users/me/avatar`).

### Modified Capabilities
(none — `avatarUrl` riding along on `/auth/me`, login, register, and refresh
responses is an implementation detail of exposing `user-profile` data, the
same way `tier` already does today without a `user-auth` requirement change)

## Impact

- **Affected code**: new `apps/backend/src/users/` module (`users.module.ts`,
  `users.controller.ts`, `users.service.ts`, `dto/`), new
  `avatarUrl String?` column on `User` in `apps/backend/prisma/schema.prisma`
  (migration), `apps/backend/src/auth/auth.service.ts` (`getPublicUser` and
  the safe-user shape used at login/register/refresh gain `avatarUrl`),
  `apps/backend/src/app.module.ts` (register `UsersModule`), new env vars
  (`AVATAR_UPLOAD_DIR`, `AVATAR_MAX_SIZE_BYTES`) in `.env`/`.env.example`.
- **Frontend**: `apps/frontend/app/(dashboard)/dashboard/settings/page.tsx`
  (upload control in the Account section), `apps/frontend/components/
  dashboard/AccountBadge.tsx` (render real avatar instead of static image),
  `apps/frontend/lib/stores/auth.ts` (`AuthUser` interface gains
  `avatarUrl`, new upload/remove functions using `authFetch`).
- **Schema/migration change**: one additive, nullable column — no data
  backfill needed, no breaking change to existing rows.
- **No breaking changes** — `avatarUrl` is nullable everywhere it's added;
  existing callers of `/auth/me` and friends get one new optional field.
