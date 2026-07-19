## 1. Route + layout [AI-authored]

- [x] 1.1 Create `app/(dashboard)/dashboard/layout.tsx` wrapping `{children}` in `<RequireAuth>`, matching the `(auth)` route group's pattern
- [x] 1.2 Create `app/(dashboard)/dashboard/page.tsx` as the default dashboard view
- [x] 1.3 Confirm the Navbar's existing "Open Chat" link now resolves instead of 404ing

## 2. Sidebar navigation [AI-authored]

- [x] 2.1 Build a persistent sidebar component visible across all `/dashboard` routes, with entries for the workspace/chat switcher and settings
- [x] 2.2 Style consistent with the landing page's palette/typography — no `ChromaticAberration`, no `react-three-fiber`, no ambient star fields

## 3. Workspace/chat switcher [AI-authored]

- [x] 3.1 Define a placeholder workspace data shape (`{ id, name }`) and local state (component state or a small dedicated store, not `useAuthStore`) holding a short mock list
- [x] 3.2 Build the switcher UI: list of workspaces, one selected as active by default, clicking another updates the active selection
- [x] 3.3 Main panel reflects the currently active workspace selection

## 4. Placeholder chat panel [AI-authored]

- [x] 4.1 Build the main panel's empty/placeholder state — no fabricated message history, a visibly disabled or "coming soon" send box

## 5. Profile display [AI-authored]

- [x] 5.1 Show the authenticated user's email and role, sourced from `useAuth()` / the session store — no invented display name
  - Email + role both render in `AccountBadge`, verified end-to-end after a silent-refresh recovery (not just post-login), confirming the `useAuth()` shape extension and the `/auth/me` backend fix both actually work together at runtime.

*(Found and fixed along the way, not originally scoped here: `GET /auth/me` was returning only `{ userId, role }` — the raw JWT payload — instead of the full profile. `login`/`register` masked this since they return the full user directly; only silent-refresh recovery (every hard reload) was actually broken. Fixed in `auth.service.ts`/`auth.controller.ts` per the backend-integration explain-first workflow.)*

## 6. Settings section [AI-authored]

- [x] 6.1 Build a settings section/page reachable from the sidebar
- [x] 6.2 Include logout, wired to the existing logout flow (`logout()` + `clearSession()`) — verified: real `POST /auth/logout` fires, redirects to `/login` via `<RequireAuth>`'s own guard reacting to the session clearing (not an explicit redirect in the settings page) — lands on `/login` rather than `/` like the Navbar's logout does, since Settings starts from inside the protected shell; same mechanism, different landing page
- [x] 6.3 Keep scope minimal — no controls for features that don't exist yet (billing, notifications)

## 7. Workspace usage/quota view [AI-authored]

- [ ] 7.1 Build a modal or view showing usage limits/quota as static placeholder data
- [ ] 7.2 Reference the Pricing section's existing tier vocabulary (Lite/Pro/Ultra) for consistency rather than inventing new tier names
- [ ] 7.3 Make clear in the copy/UI that this data is illustrative, not derived from real billing or usage tracking

## 8. Verification

- [ ] 8.1 Visit `/dashboard` while logged out, confirm redirect to `/login` (no new bug introduced in the shared guard)
- [ ] 8.2 Visit `/dashboard` while logged in, confirm the shell renders: sidebar, switcher, profile, settings all reachable
- [ ] 8.3 Switch between workspace entries, confirm the active selection updates and the placeholder panel reflects it
- [ ] 8.4 Confirm the chat panel does not display any fake conversation history
- [ ] 8.5 Confirm profile shows the real logged-in user's email and role
- [ ] 8.6 Log out from the settings section, confirm it behaves identically to logging out from the Navbar
- [ ] 8.7 Confirm no chromatic aberration or 3D/particle effects appear anywhere in the dashboard
- [ ] 8.8 Confirm the workspace usage/quota view's placeholder nature is clear from the UI copy, not just from code comments
