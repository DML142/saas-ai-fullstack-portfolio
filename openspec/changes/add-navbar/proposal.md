## Why

The site has a hero but no persistent navigation — no way to jump to Features/Pricing/FAQ once those sections exist, no branding outside the hero, no path to auth (login/register) or the dashboard. A navbar is the next piece of site-wide chrome needed before building out the rest of the landing page, since Features/Pricing/FAQ will be built as anchor targets the nav links to.

## What Changes

- Add `components/layout/Navbar.tsx`: logo (`cosico.png`, now available in `public/`) on the left, anchor nav links (Features, Pricing, FAQ) in the center/right, a CTA button on the far right.
- Render it in the root layout (`app/layout.tsx`), not inside the hero page — it's persistent site-wide chrome, not a hero-specific effect, and needs to exist above `{children}` so it appears on every future page/route.
- Sticky positioning: stays visible on scroll. Background transitions from transparent (at the top, over the hero) to a solid/blurred dark surface once the user scrolls past a threshold — standard modern pattern, and means the navbar doesn't fight the hero's chromatic aberration/star field visually while at rest.
- Mobile: a hamburger toggle opening a simple slide-down/full-screen menu with the same links.
- Deliberately restrained: no chromatic aberration, no star field, no heavy effect layer on the navbar itself — matches `CLAUDE.md`'s "restraint elsewhere" principle and the existing precedent that the dashboard also skips the hero's heavy effects.

## Capabilities

### New Capabilities
- `navbar`: Defines the persistent site navigation — logo, links, CTA, scroll-based background transition, and mobile menu behavior.

### Modified Capabilities
(none — `landing-hero` is consumed as-is; the navbar sits alongside it, not inside it)

## Impact

- Affected code: `apps/frontend` — new `components/layout/Navbar.tsx` (+ a small mobile-menu sub-component if warranted), `app/layout.tsx` (render the navbar above `{children}`).
- Assets: `public/cosico.png` (already present).
- Nav links point to in-page anchors (`#features`, `#pricing`, `#faq`) that don't exist yet — they'll resolve once those sections are built in future changes; this change only needs the anchors to be syntactically present, not functional yet.
- Out of scope: the actual Features/Pricing/FAQ sections, auth-aware nav state (showing "Dashboard" vs "Login" depending on session) — deferred until auth is wired into the frontend.
