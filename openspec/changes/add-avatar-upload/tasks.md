## 1. Schema + env [you implement]

- [x] 1.1 Add `avatarUrl String?` to `User` in `apps/backend/prisma/schema.prisma`, run `prisma migrate dev --name add_user_avatar_url`
- [x] 1.2 Add `AVATAR_UPLOAD_DIR` and `AVATAR_MAX_SIZE_BYTES` to `apps/backend/.env` and `apps/backend/.env.example`; add the upload dir to `.gitignore`
- [x] 1.3 Install `@nestjs/serve-static` as a dependency and `@types/multer` as a dev dependency (Multer itself ships with `@nestjs/platform-express`, already installed)

## 2. Users module scaffold [you implement]

- [x] 2.1 Create `apps/backend/src/users/users.module.ts` importing `PrismaModule`, exporting/declaring `UsersController` + `UsersService`
- [x] 2.2 Create `apps/backend/src/users/users.service.ts` with `updateAvatar(userId, filename)` and `removeAvatar(userId)` methods (disk `fs.unlink` + Prisma update)
- [x] 2.3 Register `UsersModule` in `apps/backend/src/app.module.ts`'s `imports` array
- [x] 2.4 Register `ServeStaticModule.forRoot({ rootPath: process.env.AVATAR_UPLOAD_DIR, serveRoot: '/uploads/avatars' })` in `app.module.ts`

## 3. Upload endpoint [you implement]

- [x] 3.1 Create `apps/backend/src/users/users.controller.ts`: `POST /users/me/avatar`, `@UseGuards(JwtAuthGuard)`, `@UseInterceptors(FileInterceptor('avatar'))` (default memory storage — no `storage` option)
- [x] 3.2 Add a `ParseFilePipe` parameter pipe (via `@UploadedFile`) with `FileTypeValidator` (image MIME allowlist) and `MaxFileSizeValidator` (from `AVATAR_MAX_SIZE_BYTES`) on the `avatar` param — validates `file.buffer` before anything is written to disk
- [x] 3.3 In the handler, call `UsersService.updateAvatar` (deletes the previous file first if `avatarUrl` was already set, then `fs.writeFile`s the new buffer) and return `{ avatarUrl }`
- [x] 3.4 Generate the on-disk filename server-side in `UsersService` (`<userId>-<uuid>.<ext>`, extension derived from validated MIME type) — never use the client-supplied filename

## 4. Removal endpoint [you implement]

- [x] 4.1 Add `DELETE /users/me/avatar` to `UsersController`, `@UseGuards(JwtAuthGuard)`
- [x] 4.2 `UsersService.removeAvatar`: no-op success if `avatarUrl` is already `null`; otherwise delete the file and set `avatarUrl` to `null`

## 5. Wire avatarUrl into auth responses [you implement]

- [x] 5.1 Add `avatarUrl` to the `select` in `AuthService.getPublicUser` (`auth.service.ts`)
- [x] 5.2 Add `avatarUrl` to the safe-user shape returned at login/register/refresh alongside `role`/`tier` (register's `select` explicitly, login's implicitly since it spreads the full Prisma row)

## 6. Docs + tests [AI-authored — testing/docs exception]

- [x] 6.1 Swagger: `@ApiTags('Users')` + `@ApiBearerAuth()` on `UsersController`, `@ApiOperation`/`@ApiOkResponse`/`@ApiBadRequestResponse` (bad MIME/size)/`@ApiUnauthorizedResponse` on both routes
- [ ] 6.2 Unit tests for `UsersService`: upload sets `avatarUrl` and deletes a prior file when one existed; remove clears `avatarUrl` and deletes the file; remove with no existing avatar is a no-op — not yet written; only Nest's default scaffold stubs (`should be defined`) exist in `users.service.spec.ts`
- [ ] 6.3 Unit tests for the controller's file-validation behavior (rejects wrong MIME type, rejects oversized file) via `ParseFilePipe` — not yet written; only the default scaffold stub exists in `users.controller.spec.ts`

## 7. Frontend [AI-authored — frontend exception]

- [x] 7.1 Add `avatarUrl` to the `AuthUser` interface in `apps/frontend/lib/stores/auth.ts`, flow it through `setSession`
- [x] 7.2 Add `uploadAvatar(file)` / `removeAvatar()` functions in `lib/stores/auth.ts` using the existing `authFetch` helper (multipart `FormData` for upload); also added `updateUser(patch)` to `auth.store.ts` since these responses return only `{ avatarUrl }`, not a full session
- [x] 7.3 **Changed from the original plan**: instead of a dedicated control in the Settings page, the upload/remove UI lives directly on `AccountBadge` (the account icon shown in `DashboardHeader` on every dashboard page, Settings included) — clicking the avatar opens a popover with "Upload avatar" (no avatar yet) or "Upload new avatar" + "Delete avatar" (avatar set), per explicit user request. Uses the shadcn/Base UI `popover.tsx` component (added via `pnpm dlx shadcn@latest add popover`).
- [x] 7.4 Update `apps/frontend/components/dashboard/AccountBadge.tsx` to render `user.avatarUrl` (prefixed with `API_URL`) via a plain `<img>` when present (cross-origin from the backend — not worth Next's image optimization pipeline), falling back to the existing static `/userico.png` via `next/image`

## 8. Verification

- [x] 8.1 Uploaded a valid image via the live UI (synthetic `File` + `DataTransfer` dispatched onto the real hidden `<input>`, since the sandboxed browser can't drive a native OS file picker — exercises the real `onChange` handler end-to-end); confirmed `avatarUrl` persisted, file existed on disk, and `AccountBadge` rendered it (`naturalWidth: 1`, `complete: true` — not broken)
- [x] 8.2 Verified via curl with a real access token: wrong MIME type (JSON file) → `400`; oversized file (3MB against the 2MB limit, using a file with a genuine PNG magic number so it reached the size check) → `400`; confirmed `avatarUrl` stayed `null` and no file was written to disk in either case
- [x] 8.3 Uploaded a second avatar via curl; confirmed exactly one file remained on disk afterward (the first was deleted)
- [x] 8.4 Removed the avatar via the live UI popover; confirmed the file was deleted from disk, `avatarUrl` went to `null`, `AccountBadge` fell back to the placeholder, and the popover closed
- [x] 8.5 Confirmed via curl: `POST /users/me/avatar` and `DELETE /users/me/avatar` both return `401` with no token and with an invalid token

## Bugs found during transcription (fixed)

- [x] 9.1 `app.module.ts`'s `ServeStaticModule.forRoot({ serveRoot: ... })` was transcribed as `'uploads/avatars'` instead of `'/uploads/avatars'` — missing the leading slash. `@nestjs/serve-static`'s Express loader does `app.use(options.serveRoot, express.static(...))`, and Express's path matcher requires mount paths to start with `/` to register as a route prefix; without it the middleware never matched, so every request for an uploaded file fell through to a `404` JSON response instead of the image, which the browser's `<img>` tag then had blocked by ORB (Opaque Response Blocking). Fixed by adding the leading slash; confirmed live afterward (`curl` returned `200`, `content-type: image/png`).
- [x] 9.2 `users.service.ts` had two unnecessary `as string` type assertions (`user.avatarUrl as string` at what became lines 40 and 60) inside blocks already narrowed by `if (user.avatarUrl)` — flagged by `@typescript-eslint/no-unnecessary-type-assertion`; removed.
