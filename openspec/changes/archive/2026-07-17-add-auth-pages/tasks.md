## 1. Session store [you implement]

- [x] 1.1 Create the Zustand auth store: `accessToken`, `user`, `status` (`loading | authenticated | unauthenticated`), plus actions to set/clear the session
- [x] 1.2 Confirm nothing in the store is persisted to `localStorage`/`sessionStorage` (no `persist` middleware on this store)

## 2. API client [you implement]

- [x] 2.1 Create the auth API client wrapping `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, all with `credentials: 'include'`
- [x] 2.2 Add the one-shot 401 → refresh → retry wrapper around authenticated calls; on refresh failure, set store status to `unauthenticated` and propagate the original error

## 3. Silent refresh + route guard [you implement]

- [x] 3.1 On app mount (e.g. a client provider in the root layout), call refresh once to attempt session recovery; set status to `loading` until it resolves
- [x] 3.2 Build `<RequireAuth>`: renders nothing while `loading`, redirects to `/login` on `unauthenticated`, renders children on `authenticated`

## 4. Login page [you implement]

- [x] 4.1 Add `app/(auth)/login/page.tsx` and the shared `(auth)` layout (centered card)
- [x] 4.2 Build the login form: React Hook Form + Zod schema (email, non-empty password), `zodResolver`
- [x] 4.3 Wire submit to the API client; on success populate the store and redirect to `/`; on failure show one flat form-level error

## 5. Register page [you implement]

- [x] 5.1 Add `app/(auth)/register/page.tsx` reusing the `(auth)` layout
- [x] 5.2 Build the register form: Zod schema mirroring `register.dto.ts` (email, password 8–32 chars)
- [x] 5.3 Wire submit to the API client; on success populate the store and redirect to `/`; on failure show one flat form-level error

## 6. Wire up real auth state [you implement]

- [x] 6.1 Replace `useAuth.ts`'s mock internals with a selector over the new store, keeping the `{ isLoggedIn, user }` return shape unchanged
- [x] 6.2 Confirm the Navbar requires no code changes and correctly reflects login/logout without edits

## 7. Logout control [you implement]

*(Gap found during verification — not in the original scope. The API client already wraps `logout()`, but nothing in the UI calls it.)*

- [x] 7.1 Add a logout action to the Navbar's logged-in state (`AuthControls` in `Navbar.tsx`) — call `logout()`, then `clearSession()`, regardless of whether the API call succeeds or fails (a network hiccup shouldn't leave the user stuck "logged in" client-side when the cookie may already be gone)
- [x] 7.2 After logout, confirm the Navbar reverts to the logged-out state without a manual page reload

## 8. Verification

- [x] 8.1 Register a new account through the UI and confirm it lands authenticated
- [x] 8.2 Log out (task 7), log back in with the same credentials, confirm success
- [x] 8.3 Log in, then hard-reload the page, confirm the session is silently recovered (no redirect to login, no re-entering credentials)
- [x] 8.4 Submit invalid login credentials and confirm a single flat error, not a field-specific one
- [x] 8.5 Submit a register with an already-used email and confirm a single flat error
- [x] 8.6 Inspect application storage in devtools and confirm the access token is not present in `localStorage` or `sessionStorage` at any point
- [x] 8.7 Manually expire/clear the access token in memory (or wait out its TTL) and confirm one authenticated call transparently recovers via refresh
- [x] 8.8 Visit a `<RequireAuth>`-wrapped route while logged out and confirm redirect to `/login`

*(8.7/8.8/3.2 verified via a throwaway `app/verify-test` route, deleted after — no permanent route exists yet since the real protected destination (dashboard) is a separate future change.)*
