## 1. Route + layout [you implement]

- [ ] 1.1 Create `app/(dashboard)/dashboard/layout.tsx` wrapping `{children}` in `<RequireAuth>`, matching the `(auth)` route group's pattern
- [ ] 1.2 Create `app/(dashboard)/dashboard/page.tsx` as the default dashboard view
- [ ] 1.3 Confirm the Navbar's existing "Open Chat" link now resolves instead of 404ing

## 2. Sidebar navigation [you implement]

- [ ] 2.1 Build a persistent sidebar component visible across all `/dashboard` routes, with entries for the workspace/chat switcher and settings
- [ ] 2.2 Style consistent with the landing page's palette/typography — no `ChromaticAberration`, no `react-three-fiber`, no ambient star fields

## 3. Workspace/chat switcher [you implement]

- [ ] 3.1 Define a placeholder workspace data shape (`{ id, name }`) and local state (component state or a small dedicated store, not `useAuthStore`) holding a short mock list
- [ ] 3.2 Build the switcher UI: list of workspaces, one selected as active by default, clicking another updates the active selection
- [ ] 3.3 Main panel reflects the currently active workspace selection

## 4. Placeholder chat panel [you implement]

- [ ] 4.1 Build the main panel's empty/placeholder state — no fabricated message history, a visibly disabled or "coming soon" send box

## 5. Profile display [you implement]

- [ ] 5.1 Show the authenticated user's email and role, sourced from `useAuth()` / the session store — no invented display name

## 6. Settings section [you implement]

- [ ] 6.1 Build a settings section/page reachable from the sidebar
- [ ] 6.2 Include logout, wired to the existing logout flow (`logout()` + `clearSession()`)
- [ ] 6.3 Keep scope minimal — no controls for features that don't exist yet (billing, notifications)

## 7. Workspace usage/quota view [you implement]

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
