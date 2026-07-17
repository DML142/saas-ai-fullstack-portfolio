## Why

The Navbar's "Open Chat" button already links to `/dashboard` for logged-in users ([Navbar.tsx](apps/frontend/components/layout/Navbar.tsx)), and `<RequireAuth>` exists and was verified working — but there is nothing behind either yet, so the link 404s. This change builds the dashboard shell (COS Assistant's chrome) that both currently depend on: the workspace/chat switcher, sidebar, profile, settings, and workspace modal described in `CLAUDE.md`'s "Dashboard (COS Assistant)" section.

## What Changes

- Add a protected `/dashboard` route (wrapped in `<RequireAuth>`) with the dashboard's own layout: sidebar navigation, a Claude-Desktop-style chat/workspace switcher, and a main content area.
- Add a user profile surface (email, plan tier) and a settings section/page.
- Add a workspace modal/view showing usage limits, quota, and detected config state — as static/placeholder data for now, since there is no real usage-tracking or Stripe billing yet.
- Style per `CLAUDE.md`'s dashboard design note: same palette/brand as the landing page, but usability-focused — no chromatic aberration, no 3D, no hero-style effect layer.
- The chat/workspace switcher and main panel render an empty/placeholder chat state (no message list, no send box wired up yet) — the chat feature itself (DB-backed persistence, simulated replies, history, import/export) is out of scope, see below.

**Explicitly out of scope for this change:**
- The chat feature itself — sending/receiving messages, simulated-reply persistence, chat history, import/export. This needs new backend models and a new NestJS module, and follows the standard explain-first backend workflow in its own future change.
- Real subscription-tier gating. Stripe/billing isn't built yet, so any authenticated user can reach the dashboard for now; tier-specific UI (usage limits, locked features) is illustrative, not enforced. Wiring real tier gating is a future change once billing exists.

## Capabilities

### New Capabilities
- `dashboard-shell`: The protected dashboard route and its chrome — sidebar, workspace/chat switcher, profile display, settings, and the workspace (usage/quota) modal. Does not include real chat functionality.

### Modified Capabilities
(none — this consumes the existing `auth-pages` session store and route guard as-is, no requirement changes to either)

## Impact

- New: `apps/frontend/app/(dashboard)/dashboard/...` routes, `apps/frontend/components/dashboard/*` (sidebar, switcher, profile, settings, workspace modal)
- Consumes existing `<RequireAuth>` ([RequireAuth.tsx](apps/frontend/components/auth/RequireAuth.tsx)) and `useAuth()` ([useAuth.ts](apps/frontend/hooks/useAuth.ts)) unchanged
- Fixes the Navbar's existing `/dashboard` link, which currently 404s
- No backend changes; no new endpoints, no new Prisma models
