## Context

`app/layout.tsx` currently renders only the page content, no persistent chrome. The hero (`add-landing-hero`) is a self-contained section; the navbar needs to sit above/outside it so it persists across every future route (dashboard, auth pages, etc.), not just the landing page.

## Goals / Non-Goals

**Goals:**
- Logo + nav links + CTA, rendered once in the root layout so every page gets it for free.
- Sticky (stays visible while scrolling), with a background that starts transparent (over the hero) and transitions to a solid/blurred dark surface past a scroll threshold, so text/links stay readable once real content scrolls underneath.
- Mobile hamburger menu with the same links.
- Deliberately plain relative to the hero: no chromatic aberration, no star field — matches the existing "dashboard skips heavy effects" precedent from `CLAUDE.md`.

**Non-Goals:**
- Real session verification — auth state is mocked on the frontend for this change (see Decisions); wiring to the actual backend session is a separate future change.
- The actual Home/Features/Reviews/Pricing sections the nav links point to — separate future changes. Links use anchors (`#home` etc.) that simply don't scroll anywhere yet.

## Decisions

**Decision: Navbar lives in `app/layout.tsx`, not in the hero's `page.tsx`.**
It's site-wide chrome, not a hero effect — every future route needs it, so it belongs in the layout that wraps `{children}`, not nested inside the landing page's own composition.

**Decision: Scroll-based background transition via a plain scroll listener + CSS transition, not GSAP ScrollTrigger.**
This is a simple boolean threshold (past N px of scroll, or not) driving a Tailwind class toggle with `transition-colors` — CSS handles the actual visual interpolation natively and cheaply. Pulling in GSAP's ScrollTrigger plugin for a single binary state change would be reaching for a heavier tool than the job needs; GSAP stays reserved for the hero's genuinely complex timelines (word-cycle, stars). Consistent with `CLAUDE.md`'s "avoid unnecessary abstraction."

**Decision: Mobile menu is a simple conditional render + CSS transition, not a separate animation library.**
A hamburger toggle flipping a boolean, with the menu panel sliding/fading in via Tailwind transition utilities — no need for GSAP or a dedicated menu library for something this standard.

**Decision: AI-authored directly, per explicit request — normally this would default to `[you implement]`.**
A sticky nav with a scroll listener and a mobile toggle is standard, well-trodden UI, not effect-heavy in the `WordCycler`/`StarField`/`ChromaticAberration` sense — the Frontend Exception would normally carve this out as user-implemented. Built directly here because it was explicitly requested, with full explanation of each piece as it's written.

**Decision: Auth state comes from a placeholder `useAuth()` hook, hardcoded, not real session data.**
Per explicit instruction: build the frontend UI for both auth states now, wire it to the real backend session later. `useAuth()` returns `{ isLoggedIn: boolean, user: { name: string } | null }` — today it's a hardcoded constant; later its internals get replaced with a real call to the backend's `/auth/me` (already built and verified in `add-user-auth`) or a shared auth context, without the Navbar itself needing to change, since it only ever consumes the hook's return shape, not how that data is obtained.

## Risks / Trade-offs

- [Risk] Nav links pointing to anchors that don't exist yet (`#home`, `#features`, `#reviews`, `#pricing`) are effectively dead until those sections are built → Mitigation: acceptable and expected at this stage; syntactically correct anchors that "activate" once the target sections land in later changes.
- [Risk] The hardcoded `useAuth()` mock could be forgotten and shipped as-is → Mitigation: named and commented explicitly as a placeholder; the interface is intentionally the exact shape real auth would need, minimizing rework, but this is worth flagging as a follow-up task explicitly in a future auth-integration change.

## Migration Plan

Additive only — no existing navbar to migrate from.
