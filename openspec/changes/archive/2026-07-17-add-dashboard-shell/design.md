## Context

`<RequireAuth>` and `useAuth()` already exist and are verified working (`auth-pages`, archived). The Navbar already links "Open Chat" to `/dashboard`. Nothing exists behind that route yet. `CLAUDE.md` describes the dashboard as "usability-focused, same palette/brand but without the hero's heavy effect layer" — a Claude-Desktop-style chat/workspace switcher, sidebar, profile, settings, and a workspace view/modal showing usage limits and quota state.

Two things this design has to work around, both already known:
- The `User` model has no `name` field — `useAuth()` already substitutes `user.email` where a display name would go ([useAuth.ts](apps/frontend/hooks/useAuth.ts)); the dashboard's profile surface should do the same rather than inventing a name.
- There's no real subscription/plan data on the user yet (`Role` is `USER | PREMIUM | ADMIN`, not a Stripe-backed plan tier) and no real usage tracking. Per the proposal, this change treats plan/usage as illustrative placeholder data, not gated or persisted.

## Goals / Non-Goals

**Goals:**
- A working `/dashboard` route, protected by the existing `<RequireAuth>`, with no new auth machinery.
- Sidebar + workspace/chat switcher chrome that looks and feels like the target Claude-Desktop-style pattern, even though switching doesn't yet load anything real.
- Profile and settings surfaces using real session data (`user.email`, `user.role`) wherever real data exists, placeholders only where it genuinely doesn't yet (plan tier, usage numbers).
- Visually consistent with the landing page's palette/typography, but deliberately calmer — no `ChromaticAberration`, no `react-three-fiber`, no ambient star fields.

**Non-Goals:**
- Real chat: no message persistence, no simulated-reply backend, no chat history. The switcher and main panel show an empty/placeholder state.
- Real plan/usage data: no Stripe, no usage-tracking backend. Numbers shown are static mock data, clearly not wired to enforcement.
- Any backend changes at all — this is a pure frontend consumer of what already exists.

## Decisions

**Route structure: a `(dashboard)` route group with its own layout wrapping `<RequireAuth>`.**
Mirrors the `(auth)` route group's pattern exactly — `app/(dashboard)/dashboard/layout.tsx` wraps `{children}` in `<RequireAuth>` once, so every route added under it later (settings, individual workspace views) is protected automatically without each page remembering to wrap itself. Alternative considered: wrapping in each page individually — rejected, since it's the same repeated-boilerplate risk `(auth)`'s shared layout already avoids elsewhere in this codebase.

**Workspace switcher state: local component state, not the auth store.**
Which workspace/chat is "active" isn't session data — it doesn't belong in `useAuthStore`. A local `useState` (or a small dedicated store if the sidebar and main panel need to share it across non-parent-child components) holding a list of placeholder workspace objects (`{ id, name }`) is enough for this change. Real workspace data becomes a backend concern in the future chat change, at which point this local state gets replaced by a fetch, not redesigned.

**Plan tier display reuses the Pricing section's plan metadata, not new data.**
`components/pricing/PlanButton.tsx` already defines the Lite/Pro/Ultra tier names and copy for marketing. Rather than inventing a second source of truth for tier names in the dashboard, the workspace modal's placeholder usage numbers should reference the same tier vocabulary — with a clear visual/copy signal (e.g. defaulting every user to "Free" or "Lite" tier display) that this is not derived from the user's actual subscription, since no such data exists yet.

**No new global state library, no WebSocket setup yet.**
`CLAUDE.md` calls for live notifications and WebSockets eventually, but that's tied to real backend events (job completion, chat replies) that don't exist until the chat backend change. Wiring a socket connection now with nothing on the other end to listen to would be dead infrastructure — deferred.

## Risks / Trade-offs

- **[Risk] Building placeholder UI for chat/usage risks looking "finished" to a user, implying functionality that isn't there** → Mitigation: keep placeholder states honest — an empty chat panel with a "coming soon" or disabled-send-box treatment, not a fake populated chat history that looks real.
- **[Risk] Local workspace-switcher state gets thrown away once the real chat backend arrives, wasting the work** → Mitigation: acceptable — the *chrome* (sidebar, switcher UI, layout) survives; only the placeholder data source changes, which is the whole point of separating shell from chat as two changes.
- **[Risk] Displaying a "plan tier" that isn't real could read as misleading** → Mitigation: settings/profile copy should be explicit this is a preview build, consistent with the project's own framing of COS Assistant as a demo, not a functioning product (per `CLAUDE.md`'s Application Idea section).

## Open Questions

- Exact settings fields are left to task-level judgment during implementation — keep minimal (e.g. account email display, logout, maybe a reduced-motion toggle) rather than building settings for features (billing, notifications) that don't exist yet.
