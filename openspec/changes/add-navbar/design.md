## Context

`app/layout.tsx` currently renders only the page content, no persistent chrome. The hero (`add-landing-hero`) is a self-contained section; the navbar needs to sit above/outside it so it persists across every future route (dashboard, auth pages, etc.), not just the landing page.

## Goals / Non-Goals

**Goals:**
- Logo + nav links + CTA, rendered once in the root layout so every page gets it for free.
- Sticky (stays visible while scrolling), with a background that starts transparent (over the hero) and transitions to a solid/blurred dark surface past a scroll threshold, so text/links stay readable once real content scrolls underneath.
- Mobile hamburger menu with the same links.
- Deliberately plain relative to the hero: no chromatic aberration, no star field — matches the existing "dashboard skips heavy effects" precedent from `CLAUDE.md`.

**Non-Goals:**
- Auth-aware state (logged-in vs logged-out nav) — deferred until frontend auth exists.
- The actual Features/Pricing/FAQ sections the nav links point to — separate future changes. Links use anchors (`#features` etc.) that simply don't scroll anywhere yet.

## Decisions

**Decision: Navbar lives in `app/layout.tsx`, not in the hero's `page.tsx`.**
It's site-wide chrome, not a hero effect — every future route needs it, so it belongs in the layout that wraps `{children}`, not nested inside the landing page's own composition.

**Decision: Scroll-based background transition via a plain scroll listener + CSS transition, not GSAP ScrollTrigger.**
This is a simple boolean threshold (past N px of scroll, or not) driving a Tailwind class toggle with `transition-colors` — CSS handles the actual visual interpolation natively and cheaply. Pulling in GSAP's ScrollTrigger plugin for a single binary state change would be reaching for a heavier tool than the job needs; GSAP stays reserved for the hero's genuinely complex timelines (word-cycle, stars). Consistent with `CLAUDE.md`'s "avoid unnecessary abstraction."

**Decision: Mobile menu is a simple conditional render + CSS transition, not a separate animation library.**
A hamburger toggle flipping a boolean, with the menu panel sliding/fading in via Tailwind transition utilities — no need for GSAP or a dedicated menu library for something this standard.

**Decision: This is routine/structural UI, not an effect-heavy piece — per `CLAUDE.md`'s Frontend Exception, tasks default to `[you implement]`.**
Unlike the hero's `WordCycler`/`StarField`/`ChromaticAberration` (genuinely complex GSAP/SVG-filter work), a sticky nav with a scroll listener and a mobile toggle is standard, well-trodden UI — the kind of thing the Frontend Exception explicitly carves out as still the user's to build, with guidance rather than direct authorship.

## Risks / Trade-offs

- [Risk] Nav links pointing to anchors that don't exist yet (`#features`, `#pricing`, `#faq`) are effectively dead until those sections are built → Mitigation: acceptable and expected at this stage; syntactically correct anchors that "activate" once the target sections land in later changes.
- [Trade-off] No auth-aware nav state means the CTA is generic ("Try COS Code" or similar) rather than context-aware ("Dashboard" for logged-in users) → Mitigation: explicitly deferred, revisit once frontend auth exists.

## Migration Plan

Additive only — no existing navbar to migrate from.
