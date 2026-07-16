## 1. Session store [you implement]

- [ ] 1.1 Create the Zustand auth store: `accessToken`, `user`, `status` (`loading | authenticated | unauthenticated`), plus actions to set/clear the session
- [ ] 1.2 Confirm nothing in the store is persisted to `localStorage`/`sessionStorage` (no `persist` middleware on this store)

## 2. API client [you implement]

- [ ] 2.1 Create the auth API client wrapping `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, all with `credentials: 'include'`
- [ ] 2.2 Add the one-shot 401 → refresh → retry wrapper around authenticated calls; on refresh failure, set store status to `unauthenticated` and propagate the original error

## 3. Silent refresh + route guard [you implement]

- [ ] 3.1 On app mount (e.g. a client provider in the root layout), call refresh once to attempt session recovery; set status to `loading` until it resolves
- [ ] 3.2 Build `<RequireAuth>`: renders nothing while `loading`, redirects to `/login` on `unauthenticated`, renders children on `authenticated`

## 4. Login page [you implement]

- [ ] 4.1 Add `app/(auth)/login/page.tsx` and the shared `(auth)` layout (centered card)
- [ ] 4.2 Build the login form: React Hook Form + Zod schema (email, non-empty password), `zodResolver`
- [ ] 4.3 Wire submit to the API client; on success populate the store and redirect to `/`; on failure show one flat form-level error

## 5. Register page [you implement]

- [ ] 5.1 Add `app/(auth)/register/page.tsx` reusing the `(auth)` layout
- [ ] 5.2 Build the register form: Zod schema mirroring `register.dto.ts` (email, password 8–32 chars)
- [ ] 5.3 Wire submit to the API client; on success populate the store and redirect to `/`; on failure show one flat form-level error

## 6. Wire up real auth state [you implement]

- [ ] 6.1 Replace `useAuth.ts`'s mock internals with a selector over the new store, keeping the `{ isLoggedIn, user }` return shape unchanged
- [ ] 6.2 Confirm the Navbar requires no code changes and correctly reflects login/logout without edits

## 7. Verification

- [ ] 7.1 Register a new account through the UI and confirm it lands authenticated
- [ ] 7.2 Log out, log back in with the same credentials, confirm success
- [ ] 7.3 Log in, then hard-reload the page, confirm the session is silently recovered (no redirect to login, no re-entering credentials)
- [ ] 7.4 Submit invalid login credentials and confirm a single flat error, not a field-specific one
- [ ] 7.5 Submit a register with an already-used email and confirm a single flat error
- [ ] 7.6 Inspect application storage in devtools and confirm the access token is not present in `localStorage` or `sessionStorage` at any point
- [ ] 7.7 Manually expire/clear the access token in memory (or wait out its TTL) and confirm one authenticated call transparently recovers via refresh
- [ ] 7.8 Visit a `<RequireAuth>`-wrapped route while logged out and confirm redirect to `/login`
