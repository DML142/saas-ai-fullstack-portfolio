## Why

The backend already has a complete, working auth API (`user-auth` spec: register, login, refresh rotation, logout, guards) and the navbar already renders auth-conditional UI — but only against a hardcoded mock (`useAuth.ts`). There is no way for a real user to actually create an account or sign in. This change wires the frontend to the real API so the mock can be retired.

## What Changes

- Add a Zustand auth store holding the access token (in-memory only, never persisted to `localStorage`), the current user, and a `loading | authenticated | unauthenticated` status.
- Add a silent-refresh-on-mount flow: on app load, call `POST /auth/refresh` (`credentials: 'include'`) to recover a session from the httpOnly refresh cookie, since the in-memory access token doesn't survive a hard reload.
- Add an auth API client wrapping `login`, `register`, `refresh`, `logout`, `me` against the existing backend endpoints, always `credentials: 'include'`, with a single 401-retry-once-via-refresh pattern for expired access tokens.
- Add `/login` and `/register` pages (route group with a shared centered-card layout), built with React Hook Form + Zod, showing a single flat form-level error on failure (never field-specific "wrong password" vs "no such account", to avoid user-enumeration).
- Add a client-side auth guard component for routes that require a session, which waits on the silent-refresh resolution before redirecting (not a security boundary — the backend guards remain that; this is UX only).
- **BREAKING**: Replace the mocked `useAuth.ts` internals with a thin selector over the new store. The returned shape (`{ isLoggedIn, user }`) is unchanged, so the Navbar itself needs no changes.

Out of scope for this change: Forgot Password and Verify Email. The backend has no corresponding endpoints yet (`auth.controller.ts` only exposes register/login/refresh/logout/me/admin-check) — adding those is backend work and a separate proposal.

## Capabilities

### New Capabilities
- `auth-pages`: Frontend login/register pages, the client-side session store, silent-refresh-on-load, and route-guard UX — everything needed for a real user to authenticate through the UI against the existing backend API.

### Modified Capabilities
(none — the backend `user-auth` API's requirements are unchanged; this change only consumes it)

## Impact

- New: `apps/frontend/app/(auth)/login/page.tsx`, `apps/frontend/app/(auth)/register/page.tsx` and a shared layout
- New: Zustand auth store, auth API client, Zod schemas, route-guard component
- Modified: `apps/frontend/hooks/useAuth.ts` (mock → real, same public shape)
- No backend changes; consumes existing `apps/backend/src/auth/*` endpoints as-is
