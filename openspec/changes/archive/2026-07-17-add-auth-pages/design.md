## Context

The backend (`user-auth` spec, already archived) exposes `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`. Login/register/refresh split their response: an httpOnly, `secure`-in-prod, `sameSite: strict` cookie carries the refresh token; everything else (access token + user) comes back in the JSON body (`auth.controller.ts`). The frontend currently has no real session handling at all — `useAuth.ts` is a hardcoded mock the Navbar reads from, and there are no auth routes.

Constraints already set by the project:
- `CLAUDE.md`'s frontend split: this is routine form/CRUD UI, not the effect-heavy category the AI authors outright. Structure and review, user implements.
- Stack is fixed: Next.js 15 App Router, Zustand, React Hook Form, Zod (per `CLAUDE.md`'s tech stack).

## Goals / Non-Goals

**Goals:**
- A real user can register and log in through the UI, backed by the actual API.
- Session survives a hard page reload without ever putting the access token in persistent storage.
- `useAuth.ts`'s public shape is unchanged, so the Navbar requires no edits.
- Route protection has an honest security story: client-side checks are UX only, backend guards are the real boundary.

**Non-Goals:**
- Forgot Password / Verify Email (no backend endpoints exist yet — separate future change).
- A dashboard or any post-login destination beyond redirecting home — the dashboard itself is a later change.
- Refresh-token rotation logic, reuse detection, RBAC — already implemented backend-side; this change only consumes it.

## Decisions

**Access token in memory (Zustand), never `localStorage`/`sessionStorage`.**
Any XSS on the page can read persistent storage; it cannot read a JS closure's in-memory state unless it can already execute arbitrary code in that same context, in which case the token is the least of the problem. The cost is that a hard reload loses the token — accepted, and solved by silent refresh below. Alternative considered: storing the access token in a second, non-httpOnly cookie for easy recovery on reload — rejected, since that reintroduces the exact XSS-readable-token problem this decision exists to avoid.

**Silent refresh on app mount.**
On mount, the store fires `POST /auth/refresh` with `credentials: 'include'`. The httpOnly cookie (which does survive reload) authenticates this call; success repopulates the in-memory token + user, failure means logged-out. Status starts as `loading` so the UI (Navbar, guards) can distinguish "haven't checked yet" from "checked, no session" and avoid a flash of logged-out content.

**One 401-retry-via-refresh, not a general interceptor stack.**
The API client wraps calls to the five auth endpoints. On a 401 from any authenticated call, it calls `/auth/refresh` once; if that succeeds, the original call is retried once with the new token; if either fails, the store moves to `unauthenticated` and the caller's original error propagates. No retry loops, no exponential backoff — an expired access token is recovered in one hop or the session is over.

**Flat, form-level errors only.**
Login and register both surface exactly one error string on failure, never "this field is wrong." The backend's own `Invalid credentials` scenario (see `user-auth` spec) is already written this way for login; register mirrors it for the same reason — distinguishing "email taken" from "password too weak" as different *field* errors is fine (those are pre-submission Zod checks), but a *server*-rejected register attempt should not become a signal generator either.

**Client-side route guard, not `middleware.ts`.**
`middleware.ts` runs at the edge before any JS state exists, so it cannot see the in-memory access token — it could only check for the refresh cookie's *presence*, which proves nothing about validity and would need its own backend round-trip to mean anything. Simpler and equally honest: a `<RequireAuth>` component that reads the store's status, renders nothing (or a skeleton) while `loading`, and redirects to `/login` once resolved to `unauthenticated`. The backend's `JwtAuthGuard`/`RolesGuard` remain the actual authorization boundary, unchanged by this decision.

**Route group `app/(auth)/`.**
Groups `login` and `register` under one shared centered-card layout without adding a URL segment (`/login`, not `/auth/login`) and without affecting layouts elsewhere in the app.

## Risks / Trade-offs

- **[Risk] A hard reload always shows a brief `loading` state before the Navbar knows if you're logged in** → Mitigation: this is the correct trade-off for not persisting the token; keep the loading state visually minimal (e.g. render the logged-out Navbar shape, not a spinner, to avoid layout jump).
- **[Risk] Multiple tabs each holding their own in-memory token can drift** (e.g. logout in one tab doesn't affect another until that tab's next 401) → Mitigation: acceptable for this change; a `storage` event–based cross-tab sync is a reasonable future addition, not required now.
- **[Risk] Zod schemas mirroring backend validation can drift from the DTOs over time** (`register.dto.ts`'s password length changes, Zod schema doesn't) → Mitigation: client validation is explicitly UX-only per the Decisions above; a drift means a slightly worse error message, not a security gap, since the backend DTO still enforces the real rule.

## Open Questions

- Post-login redirect target: sending users to `/` for now since there's no dashboard yet. Revisit once a dashboard route exists.
