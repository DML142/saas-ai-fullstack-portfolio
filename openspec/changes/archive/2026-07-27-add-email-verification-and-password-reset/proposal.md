## Why

Registration issues a session but never confirms the user actually owns the email address, and there's no way to recover a forgotten password — both standard expectations for a real auth system. The infrastructure to do this is already in place: Mailpit runs in the Docker stack (SMTP on `localhost:1025`, UI on `8025`) and Nodemailer is in the intended tech stack, so email-driven flows are the natural next step.

## What Changes

- Add a mailer module (Nodemailer → Mailpit SMTP in dev) that sends transactional emails; not tied to auth so later features can reuse it.
- Add `emailVerified Boolean @default(false)` to the `User` model (+ migration).
- **Email verification (soft gate):** on register, generate a single-use verification token (stored in Redis with a TTL, mirroring the refresh-token pattern) and email a verification link. Register and login are otherwise **unchanged** — the user is still logged in immediately; they're just flagged unverified until they click the link. `GET /auth/me` exposes `emailVerified`. Add `POST /auth/verify-email` (consumes the token) and `POST /auth/resend-verification`.
- **Password reset:** `POST /auth/forgot-password` (always responds success, to avoid revealing whether an email is registered; if it is, emails a single-use, TTL-bound reset token) and `POST /auth/reset-password` (token + new password → updates the hash, invalidates the token, and revokes existing refresh-token families so other sessions are logged out).
- Frontend: a `/verify-email` page that consumes the token from the emailed link, `/forgot-password` and `/reset-password` pages, and an "unverified — resend" banner surfaced to logged-in-but-unverified users.

## Capabilities

### New Capabilities
- `account-email-flows`: transactional email delivery, email verification (token issue/consume, verified state, resend), and password reset (request/consume, session revocation on reset).

### Modified Capabilities
(none — register/login/refresh keep their current `user-auth` behavior; verification is additive and non-blocking. The new `emailVerified` field and the register-sends-an-email behavior are specified under `account-email-flows`.)

## Impact

- Backend: new `mail` module (Nodemailer transport + templated sends), `User` schema field + migration, `AuthService`/`AuthController` additions (verify-email, resend-verification, forgot-password, reset-password), Redis token storage (new key namespaces alongside `refresh:`), `GET /auth/me` gains `emailVerified`
- Frontend: new `/verify-email`, `/forgot-password`, `/reset-password` pages, chat/auth client additions for the four new endpoints, an unverified-account banner
- New dependency: `nodemailer` (+ `@types/nodemailer`)
- Reuses as-is: Redis (`RedisService`), the JWT access token / `authFetch`, Mailpit (already running), the bcrypt `PasswordService`, the existing refresh-family revocation for the reset-logs-out-other-sessions behavior
- Config: new env vars for SMTP host/port and the app's public base URL (for building email links)
