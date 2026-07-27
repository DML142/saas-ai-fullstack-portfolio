## Context

`user-auth` (archived) established the token patterns this builds on: short-lived JWT access tokens, refresh tokens stored in Redis with TTL and family-based revocation, bcrypt hashing via `PasswordService`. Mailpit is already running (SMTP `localhost:1025`), BullMQ is already wired (chat reply queue), and `RedisService` already exposes `set(key, value, ttl)` / `get` / `del`. This change adds email delivery plus two token-driven flows on top of that foundation.

## Goals / Non-Goals

**Goals:**
- Confirm a user owns their email (soft gate — never blocks login), and let them recover a forgotten password.
- Reuse the existing Redis-token + TTL + single-use pattern rather than inventing a new one.
- Keep the user-facing request fast and resilient to a slow/failing mail server.
- Be enumeration-safe on the public reset flow.

**Non-Goals:**
- Blocking login or gating features on verification (soft gate only — the flag exists; enforcement is a later change if wanted).
- Google OAuth, 2FA, magic-link login.
- A production email provider — dev targets Mailpit; the transport is env-configured so prod can point elsewhere.

## Decisions

**Tokens are opaque random strings stored in Redis, not JWTs.**
`verify:{token} → userId` and `reset:{token} → userId`, each with a TTL (verification ~24h, reset ~1h — reset is more sensitive so it's shorter). Single-use is trivial: delete the key on consume. This is the same reasoning refresh tokens use — native TTL and instant invalidation — and avoids the "can't revoke a stateless JWT" problem. Tokens are generated with a CSPRNG (`crypto.randomBytes`), not `Math.random`.

**Emails link to the frontend, which then calls the API — not directly to an API endpoint.**
The link is `{APP_URL}/verify-email?token=…` (and `/reset-password?token=…`). The frontend page reads the token from the query string and POSTs it to the backend, so the user sees a real success/failure page and can be redirected — rather than landing on raw JSON. `APP_URL` comes from a new env var (it's the *frontend* origin, distinct from the API origin).

**Email sending goes through a BullMQ queue, not inline in the request.**
A slow or down SMTP server must never slow down or fail a register / forgot-password request. Enqueuing the send (reusing the BullMQ pattern already built for chat replies) decouples it and gives free retries on transient SMTP failures. `CLAUDE.md` explicitly lists "send emails" as a queue job, so this also matches the intended architecture. The request enqueues and returns immediately; a worker performs the actual Nodemailer send.

**Forgot-password is enumeration-safe: always responds success.**
`POST /auth/forgot-password` returns the same 200 whether or not the email is registered — only enqueuing an email when it actually exists. This matches the enumeration-safety already chosen for login ("email or password is wrong") and the workspace endpoints (404, not 403). *(Note: the existing `register` endpoint DOES leak "email already exists" via a 400 — a pre-existing gap this change deliberately does not widen, and does not fix here.)*

**Password reset revokes existing sessions.**
On successful reset, besides updating the hash and deleting the reset token, the user's refresh-token families are revoked (reusing the existing family-revocation in `RedisService`). A password reset should log out every existing session — if the reset was triggered because the account was compromised, lingering refresh tokens would defeat the point. Access tokens are short-lived and expire on their own.

**Soft gate keeps register/login untouched.**
Register still hashes, creates the user (now with `emailVerified: false`), issues tokens, and enqueues a verification email — the auto-login behavior is unchanged. Login never checks `emailVerified`. `GET /auth/me` simply includes the flag so the frontend can show an "unverified — resend" banner. `resend-verification` is authenticated (the user is logged in under the soft gate); `verify-email`, `forgot-password`, and `reset-password` are public (token-authenticated, since the user may click a link in a browser where they aren't logged in).

## Risks / Trade-offs

- **[Risk] Tokens travel in URL query strings (referer/history leakage)** → **Mitigation:** single-use + short TTL; standard tradeoff for email links, acceptable for this threat model.
- **[Risk] A queued email that never sends leaves a user unable to verify/reset** → **Mitigation:** BullMQ retries transient failures; resend-verification and re-request-reset let the user try again; dev uses Mailpit which won't fail.
- **[Risk] Reset revoking all sessions logs the user out of their current tab too** → **Mitigation:** intended — after reset they re-authenticate with the new password; the reset-password page redirects to `/login`.
- **[Risk] Mailpit is dev-only; prod needs a real provider** → **Mitigation:** the Nodemailer transport reads host/port from env, so prod is a config change, not a code change.

## Open Questions

- Exact email templates (HTML/copy) are left to implementation; keep them minimal and clearly branded, matching the COS Code identity.
