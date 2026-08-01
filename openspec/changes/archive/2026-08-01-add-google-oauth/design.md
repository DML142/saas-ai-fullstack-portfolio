## Context

Auth today is entirely fetch/JSON: `login`/`register` return `{ accessToken,
refreshToken, ...user }` in a response body, the controller peels off
`refreshToken` into an httpOnly cookie (`AuthController.setRefreshTokenCookie`)
and returns the rest as JSON, and the frontend (`lib/stores/auth.ts`) calls
these with `fetch`. `AuthService.issueToken(userId, role, familyId?)` is the
single place that mints an access/refresh pair and registers the refresh
token in its Redis-tracked family — every session, however it started, needs
to go through it so refresh rotation and reuse detection keep working
uniformly.

OAuth 2.0's redirect flow doesn't fit that shape: `GET /auth/google` has to
be a real top-level browser navigation to Google, and Google redirects back
with a top-level navigation too (`GET /auth/google/callback?code=...`) — the
callback can't return a `fetch`-style JSON body to a page that's expecting
one, because there is no page waiting on a fetch; the browser is mid
navigation. Whatever the callback does, it has to end in a redirect the
browser can follow.

The frontend already has a mechanism for "I have a valid session but no
access token in memory yet": `SessionBootstrap` (mounted once in
`app/layout.tsx`) calls `refresh()` then `me()` on every app mount,
recovering a session purely from the httpOnly refresh cookie. That mechanism
already exists for a different reason (surviving a page reload), but it's
exactly the primitive an OAuth callback needs too.

`User.passwordHash` is currently `String` (non-null) — every existing row
has one because password auth was the only path to account creation. An
account created purely via Google has no password to hash.

## Goals / Non-Goals

**Goals:**
- Reuse `AuthService.issueToken` and the existing refresh-cookie mechanism
  unchanged for OAuth-issued sessions — no second session/token shape.
- Link Google sign-in to an existing password account sharing the same
  email, rather than creating a duplicate account.
- Fail closed but gracefully: a denied/failed OAuth attempt lands the user
  back on `/login` with a visible-but-generic error, not a broken JSON page.
- Zero new frontend session-handling code — the callback's job is to leave
  the browser in a state `SessionBootstrap` already knows how to recover
  from.

**Non-Goals:**
- Letting a user unlink Google from their account, or manage multiple linked
  providers — out of scope; this is a one-time link at first sign-in.
- Passing Google's `access_token`/`refresh_token` through to anything —
  Google's tokens are only used once, inside `GoogleStrategy.validate`, to
  read the profile (email, sub, verified status). Nothing is stored.
- Requiring a password for OAuth-only accounts — they simply have none until
  (if ever) the user goes through `forgot-password`, which already works
  generically off email and doesn't care whether a password existed before.

## Decisions

### 1. Callback sets the cookie and redirects to `/`; no token-exchange endpoint
Alternative considered: have the callback redirect to a frontend page like
`/oauth/callback?token=...` carrying the access token in the URL, which the
page reads and hands to `setSession`. Rejected — it leaks a live access
token into browser history, referrer headers, and server logs, and it
requires new frontend code to parse and consume it.

Chosen instead: the callback does exactly what `login`/`register` already
do to establish a session — call `issueToken`, set the refresh cookie via
the same `setRefreshTokenCookie` helper — and then redirects to
`FRONTEND_URL/`. That redirect is a full page navigation, so
`SessionBootstrap` mounts fresh and immediately calls `refresh()` (reads the
now-present cookie) then `me()`, landing in the exact same `authenticated`
state a page-reload session recovery would. The access token never appears
in a URL.

### 2. Account resolution order: `googleId` → email match → create
`GoogleStrategy.validate` resolves the signed-in Google profile to a `User`
in three steps, in this order:
1. **`googleId` match** — a returning Google-authenticated user.
2. **Email match with no `googleId` yet** — an existing password account
   signing in with Google for the first time. Link by setting `googleId` on
   that row (single `update`); do not touch `passwordHash`. The account
   keeps working with both methods from then on.
3. **No match** — create a new `User` with `googleId` set, `passwordHash`
   `null`, and `emailVerified: true` (Google has already verified the
   address as a precondition of returning profile data with
   `email_verified: true` — no reason to make this user click a verification
   link for an email Google already confirmed).

This mirrors how `AuthService.register` already creates a `User` — same
`role: USER` default, same shape — just via a different entry point, which
is why `rbac`'s "new registration defaults to USER" requirement is described
as applying uniformly rather than duplicated for OAuth.

### 3. `passwordHash` becomes nullable; `login` treats null as no-match
The alternative — a separate `AuthProvider` join table (one row per linked
method) — is the textbook "multiple auth providers" design and scales to
more providers later, but it's real schema complexity (a new model, a new
relation, a rewrite of how `login`/`register` read the password) for a
change whose actual requirement is "one optional second sign-in method."
Given the project's single planned provider (Google — no GitHub/etc. on the
roadmap), a nullable column is the proportionate choice; a join table is the
natural follow-up if a second provider is ever added.

`AuthService.login` currently does
`this.passwordService.compare(password, user.passwordHash)` unconditionally.
With `passwordHash` nullable, an OAuth-only account attempting password
login must fail the same generic `UnauthorizedException('Email or password
is wrong')` every other mismatch produces — not a distinguishable error,
and not a bcrypt call against `null`/`undefined` (which would throw a
different, revealing error). This is the same anti-enumeration posture the
existing `user-auth` spec already commits to for ordinary wrong-password
attempts.

### 4. OAuth failure handled in the guard, not the controller
`AuthGuard('google')`'s default `handleRequest` throws on failure, which Nest
serializes as a JSON 401 — on a top-level browser navigation (the callback
is not a fetch) that renders as a broken page, not a redirect back to the
app. A custom `GoogleAuthGuard extends AuthGuard('google')` overrides
`handleRequest`: on `err`/no `user`, it reaches into the execution context
for the raw `Response` and issues `res.redirect(FRONTEND_URL/login?error=
oauth_failed)` itself, then returns `null` instead of throwing. Passport's
guard machinery still lets the request reach the controller after that (Nest
guards can't short-circuit by returning null from `handleRequest`), so
`googleCallback` checks `if (!req.user) return;` as the first line — the
response is already sent by the guard, so the handler does nothing further.

## Risks / Trade-offs

- **[Risk]** Nullable `passwordHash` weakens the type-level guarantee that
  every user can log in with a password → **Mitigation**: `login` is the
  single read site and is updated in the same change; no other code path
  reads `passwordHash`.
- **[Risk]** Auto-linking by email trusts that "same email at Google" means
  "same person" without re-authenticating the existing password account →
  **Mitigation**: acceptable because Google itself already verified
  ownership of that email address (`email_verified: true` is required before
  `validate` even considers the profile) — this is the standard
  "verified-email account linking" pattern, not a bypass of any existing
  check.
- **[Risk]** `res.redirect` called from inside a guard, ahead of the
  controller, is a slightly unusual Nest pattern → **Mitigation**: it's the
  documented/standard way to handle Passport OAuth failures in a redirect
  flow (there's no other point before the controller where the guard can
  hand control back to the browser); the controller's `if (!req.user)
  return;` guard makes the "guard already responded" case explicit rather
  than implicit.

## Migration Plan

1. Add `googleId String? @unique` and change `passwordHash String` →
   `passwordHash String?` on `User`; generate and run the Prisma migration.
   Purely additive/widening — no data backfill needed, no existing row
   becomes invalid.
2. Install `passport-google-oauth20` (+ types); add `GoogleStrategy`,
   `GoogleAuthGuard`, the two new controller routes, and register the
   strategy as a provider in `AuthModule`.
3. Add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` to
   `.env.example` (backend) and to the real `.env` from a Google Cloud
   OAuth-consent-screen + credentials setup (dev-only redirect URI:
   `http://localhost:3000/auth/google/callback`).
4. Frontend: add the "Continue with Google" control to `/login` and
   `/register`. No rollback concerns beyond removing the button — the
   backend change is additive to existing routes.

## Open Questions

None — the shape of this change (redirect + cookie + silent-refresh,
account linking by verified email, nullable password) follows directly from
mechanisms already in the codebase.
