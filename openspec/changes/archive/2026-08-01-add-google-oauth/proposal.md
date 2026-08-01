## Why

Email+password is currently the only way to register or log in. Google
OAuth is the next step on `tech.md` (Step 2): it removes the password-entry
friction for new users and, because Google has already verified the email
address, sidesteps the verification-email step entirely for accounts
created this way. It also exercises a login path the app doesn't have yet —
a top-level browser redirect flow, session issuance from a source other
than a submitted password, and account-linking between two identity
methods for the same email — all real production auth concerns.

## What Changes

- Add a Passport Google OAuth 2.0 strategy (`passport-google-oauth20`) with
  two new routes: `GET /auth/google` (starts the redirect to Google) and
  `GET /auth/google/callback` (Google redirects back here).
- On callback success, resolve a `User` by `googleId`, falling back to
  linking-by-email for an existing password account, falling back to
  creating a new account — then issue the same access/refresh token pair
  via the existing `AuthService.issueToken`, set the refresh cookie the same
  way `login`/`register` already do, and redirect to the frontend. No new
  token/session shape.
- On callback failure (user denies consent, Google error), redirect to
  `/login?error=oauth_failed` instead of surfacing a bare JSON 401 on a
  top-level navigation.
- **BREAKING (internal only, no external API change)**: `User.passwordHash`
  becomes nullable (`String?`) to represent OAuth-only accounts that never
  set a password. `AuthService.login` must treat a null `passwordHash` as a
  non-match (generic "Email or password is wrong", same as any other
  mismatch — never reveal that the account is Google-linked).
- Add `User.googleId String? @unique` and a Prisma migration.
- Frontend: a "Continue with Google" control on `/login` and `/register`
  that navigates the browser to `${NEXT_PUBLIC_API_URL}/auth/google` (not a
  fetch call — this has to be a real top-level navigation for the Google
  consent screen to work). No new session-handling code needed — the
  existing `SessionBootstrap` silent-refresh-on-mount already picks up the
  cookie the callback sets.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `user-auth`: adds Google OAuth as a second way to establish a session
  (alongside register/login), including account-linking rules and the
  passwordHash-nullability change to `login`'s matching behavior.
- `rbac`: clarifies that role assignment (`USER` by default) applies
  uniformly regardless of which auth method created the account.
- `auth-pages`: adds the "Continue with Google" entry point on `/login` and
  `/register`, which feeds into the same silent-session-recovery mechanism
  already specified there.

## Impact

- **Affected code**: `apps/backend/src/auth/{auth.controller,auth.service,
  auth.module}.ts` (new routes, new linking/session logic), new
  `apps/backend/src/auth/google.strategy.ts` and
  `apps/backend/src/auth/guards/google.auth.guard.ts`,
  `apps/backend/prisma/schema.prisma` + a new migration
  (`passwordHash` nullable, `googleId` added).
- **New dependency**: `passport-google-oauth20` (+ `@types/passport-google-
  oauth20`).
- **New env vars**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_CALLBACK_URL`.
- **Frontend**: `apps/frontend/app/(auth)/login/page.tsx` and
  `.../register/page.tsx` get a new "Continue with Google" control; no
  changes to `lib/stores/auth.ts`, `auth.store.ts`, or `SessionBootstrap.tsx`
  — the existing refresh-on-mount flow already covers this entry point.
- **No breaking change to any existing endpoint contract** — `login`,
  `register`, `refresh`, `logout`, `me` are unchanged for existing
  password-based users.
