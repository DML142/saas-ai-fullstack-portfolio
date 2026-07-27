## 1. Schema + config [you implement]

- [x] 1.1 Add `emailVerified Boolean @default(false)` to the `User` model; generate + run the migration — applied (`20260724154410_add_email_verified`), existing rows backfilled to `false`
- [x] 1.2 Add env vars: `SMTP_HOST`/`SMTP_PORT`, verification/reset token TTLs; document in `.env.example` — reused existing `FRONTEND_URL` for email-link base instead of adding a duplicate `APP_URL`

## 2. Mailer module + email queue [you implement]

- [x] 2.1 Install `nodemailer` (+ `@types/nodemailer`)
- [x] 2.2 Create a `mail` module: Nodemailer transport reading SMTP host/port from env; `MailService` enqueues (`queueVerificationEmail`/`queuePasswordResetEmail`), `EmailProcessor` does the actual send with distinct verification/reset copy
- [x] 2.3 Add a BullMQ `email` queue + processor. Also refactored `BullModule.forRoot` up to `AppModule` (was scoped inside `ChatModule`), so both queues share one root config — `ChatModule`/`MailModule` now use only `registerQueue`. Verified end-to-end: enqueued verification + reset jobs landed in Mailpit with correct subjects, recipients, `from`, and frontend links (`{FRONTEND_URL}/verify-email?token=…`)

## 3. Backend: email verification [you implement]

- [x] 3.1 On register, set `emailVerified: false`, generate a CSPRNG verification token, store `verify:{token} → userId` in Redis with TTL, and enqueue a verification email linking to `{APP_URL}/verify-email?token=…` — extracted a private `sendVerificationEmail` helper; enqueue wrapped in a logged try/catch so a queue hiccup never fails registration
- [x] 3.2 `POST /auth/verify-email` (public): look up the token in Redis; if valid, mark the user verified and delete the token; else reject — atomic single-use via `redisService.getDel` (Redis `GETDEL`)
- [x] 3.3 `POST /auth/resend-verification` (JwtAuthGuard): if the caller is still unverified, issue a fresh token and enqueue a new email
- [x] 3.4 Add `emailVerified` to the `GET /auth/me` payload (extend `getPublicUser`)

## 4. Backend: password reset [you implement]

- [x] 4.1 `POST /auth/forgot-password` (public): always return the same success response; only when the email exists, generate a CSPRNG reset token, store `reset:{token} → userId` with a short TTL, and enqueue a reset email linking to `{APP_URL}/reset-password?token=…` — neutral message returned unconditionally (enumeration-safe)
- [x] 4.2 `POST /auth/reset-password` (public): validate the token; on success update the password hash (bcrypt via `PasswordService`), delete the token, and revoke the user's refresh-token families; validate the new password against the same rules as register — token consumed atomically via `getDel`; sessions revoked via new `user:{id}:families` index + `revokeAllSessions`
- [x] 4.3 Add DTOs for verify-email, forgot-password, reset-password with class-validator rules — password rules shared via `IsValidPassword` composed decorator (used by register + reset)

> Known debt: `logout` and `refresh` reuse-detection delete `family:` sets but don't remove the familyId from `user:{id}:families`, so stale familyIds accumulate there. `revokeAllSessions` still works (deletes already-empty families). Clean up when touching those call sites.

## 5. Frontend: client + pages [you implement — backend-integration]

- [x] 5.1 Add client functions for the four endpoints (verify-email, resend-verification, forgot-password, reset-password) following the existing `auth.ts` / `authFetch` patterns — `resendVerification` delegates to `authFetch` (auto-refresh); `parseOrThrow` now tolerates empty 201 bodies; `AuthUser` gained `emailVerified`
- [x] 5.2 `/verify-email` page: read `token` from the query string, POST it, show success/failure, redirect appropriately — status page (verifying/success/error), StrictMode double-invoke guarded (single-use token); updates the session store so the banner clears live. Verified in-browser: success + reused-token error path
- [x] 5.3 `/forgot-password` page: email input → POST → show the neutral "if that email exists, we sent a link" confirmation — verified in-browser end-to-end
- [x] 5.4 `/reset-password` page: read `token` from query string + new-password form (Zod mirroring backend rules) → POST → redirect to `/login` on success — added confirm-password field; verified in-browser: valid reset → redirect → new password logs in (old rejected)

## 6. Frontend: unverified banner [AI-authored]

- [x] 6.1 Surface an "email not verified — resend" banner to logged-in-but-unverified users (reads `emailVerified` from the session/`useAuth`), wired to the resend endpoint — `VerificationBanner` in the dashboard shell (`(dashboard)/dashboard/layout.tsx`); reads `emailVerified` from the auth store directly (not `useAuth`, which drops the flag); resend delegates to `resendVerification` with store-backed `getToken`/`setSession`/`clearSession`. Verified in-browser: banner shows for unverified session, resend → "sent" state → real email in Mailpit. Also fixed the `onSessionLost: () => null` → `() => void` signature nit flagged in 5.1.

## 7. Verification

- [x] 7.1 Register a new account; confirm a verification email lands in Mailpit (UI at `:8025`) and the account shows `emailVerified: false` via `/auth/me` — verified via curl + Mailpit API
- [x] 7.2 Click the emailed verification link; confirm the account becomes verified and the token can't be reused (second attempt rejected) — 1st verify → `emailVerified: true`; 2nd → 400
- [x] 7.3 Resend verification while unverified; confirm a fresh email and that the old token is no longer required (either token/behavior consistent with single-use) — resend produced a 2nd email
- [x] 7.4 Forgot-password for a registered email: confirm a reset email in Mailpit; for an unregistered email: confirm the same success response and no email sent — identical body/status both cases; only 1 email actually sent
- [x] 7.5 Reset the password with the emailed token; confirm login works with the new password, the token can't be reused, and pre-existing sessions are revoked (an old refresh token no longer refreshes) — old refresh → 401, old pw → 401, new pw → 201, token reuse → 400
- [x] 7.6 Confirm register/login are unchanged for an unverified user (soft gate — login still works) — unverified login → 201
- [x] 7.7 Confirm a slow/failed email send doesn't block or fail the triggering request (send is queued) — register returns a session immediately; send happens in the BullMQ worker

> Follow-up (frontend-facing): the `register` response omits `emailVerified` (its `select` doesn't include it) while `login` and `/auth/me` include it. Add `emailVerified: true` to register's `select` so the client gets a consistent shape right after signup (needed for the 6.1 banner).
