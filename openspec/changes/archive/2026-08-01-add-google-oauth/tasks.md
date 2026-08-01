## 1. Schema + dependencies [you implement]

- [x] 1.1 In `apps/backend/prisma/schema.prisma`, change `passwordHash
      String` to `passwordHash String?` and add `googleId String? @unique`
      on `User`
- [x] 1.2 Run `npx prisma migrate dev --name add_google_oauth` (from
      `apps/backend`) to generate and apply the migration
- [x] 1.3 Add `passport-google-oauth20` and `@types/passport-google-
      oauth20` to `apps/backend/package.json`
- [x] 1.4 Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
      `GOOGLE_CALLBACK_URL` to `apps/backend/.env.example` and to the real
      `.env` (values from a Google Cloud OAuth client — dev redirect URI
      `http://localhost:3000/auth/google/callback`)

## 2. Google strategy + guard [you implement]

- [x] 2.1 Create `apps/backend/src/auth/google.strategy.ts`: a
      `PassportStrategy(Strategy, 'google')` reading
      `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_CALLBACK_URL`,
      scope `['email', 'profile']`; its `validate` resolves the profile to
      a `User` (via `AuthService`) using the googleId → email-match →
      create order from `design.md` Decision 2, and returns `{ userId,
      role }` matching `JwtStrategy`'s shape
- [x] 2.2 Create `apps/backend/src/auth/guards/google.auth.guard.ts`:
      `AuthGuard('google')` with `handleRequest` overridden to redirect to
      `${FRONTEND_URL}/login?error=oauth_failed` on error/no-user instead
      of throwing (design.md Decision 4)

## 3. Account resolution + session issuance [you implement]

- [x] 3.1 Add `AuthService.findOrCreateGoogleUser(profile)` (or similar):
      implements the googleId → email-link → create resolution, returning
      the same public-user shape `register`/`login` use
- [x] 3.2 Update `AuthService.login` to treat `user.passwordHash === null`
      as a non-match, throwing the same generic
      `UnauthorizedException('Email or password is wrong')` without
      calling `PasswordService.compare` against `null`
- [x] 3.3 In `AuthController`, add `GET /auth/google` (guarded by
      `GoogleAuthGuard`, empty handler — the guard performs the redirect to
      Google) and `GET /auth/google/callback` (guarded by
      `GoogleAuthGuard`): on `req.user` present, call
      `AuthService.issueToken`, set the refresh cookie via the existing
      `setRefreshTokenCookie` helper, and `res.redirect(FRONTEND_URL/)`; if
      `req.user` is absent, return immediately (the guard already
      redirected)
- [x] 3.4 Register `GoogleStrategy` as a provider in `AuthModule`

## 4. Docs + tests [AI-authored — testing/docs exception]

- [x] 4.1 Swagger: document `GET /auth/google` and `GET
      /auth/google/callback` (redirect responses, not JSON)
- [x] 4.2 Unit tests for `AuthService`: googleId match returns existing
      user; email match with no googleId links and returns that user; no
      match creates a new user with `passwordHash: null` and
      `emailVerified: true`; `login` against a null-`passwordHash` account
      rejects with the generic error
- [x] 4.3 Unit tests for `GoogleAuthGuard`: failure path redirects to
      `/login?error=oauth_failed` rather than throwing

## 5. Frontend: Continue with Google [AI-authored — frontend exception]

- [x] 5.1 Add a "Continue with Google" control to
      `apps/frontend/app/(auth)/login/page.tsx` and `.../register/page.tsx`
      — a real `<a>`/navigation to `${NEXT_PUBLIC_API_URL}/auth/google`,
      not a fetch call
- [x] 5.2 On `/login`, read an `error=oauth_failed` query param (if
      present) and show the existing flat error-message UI for it

## 6. Verification

- [x] 6.1 With the backend and a real Google OAuth client configured,
      start from `/login`, complete Google consent, and confirm the
      browser lands back on the app fully authenticated (via
      `SessionBootstrap`, no manual refresh needed) — confirmed live with a
      real Google account after fixing the double-`done()` bug in
      `validate` (see below)
- [ ] 6.2 Confirm signing in with Google using an email that already has a
      password account links to that account (same `id`, existing role
      untouched) rather than creating a duplicate — covered by a unit test
      (`findOrCreateGoogleUser` email-link case) but not exercised live
      end-to-end
- [x] 6.3 Confirm a denied/failed Google consent screen lands back on
      `/login` with a visible error, not a broken JSON response —
      confirmed live (this path fired repeatedly while diagnosing the
      double-`done()` bug, and the `?error=oauth_failed` banner was
      verified separately in the browser)
- [ ] 6.4 Confirm attempting `POST /auth/login` with the email of a
      Google-only account returns the same generic invalid-credentials
      error as any other wrong password — covered by a unit test, not
      exercised live

## 7. Bug found during live verification (fixed)

- [x] 7.1 `GoogleStrategy.validate` was calling the passport `done`
      callback itself *and* returning a value, which — combined with the
      `@nestjs/passport` wrapper that also calls `done` with the returned
      value — invoked `GoogleAuthGuard.handleRequest` twice per callback
      request (once with the real user, immediately followed by a second
      call with `user: false`), causing every real sign-in to bounce to
      `/login?error=oauth_failed` right after succeeding (and, before a
      guard fix, an `ERR_HTTP_HEADERS_SENT` crash). Fixed by making
      `validate` return the user / throw instead of touching `done`,
      matching the `@nestjs/passport` contract.
