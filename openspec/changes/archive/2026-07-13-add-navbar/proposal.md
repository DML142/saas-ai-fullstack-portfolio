## Why

The site has a hero but no persistent navigation — no way to jump to Features/Pricing/FAQ once those sections exist, no branding outside the hero, no path to auth (login/register) or the dashboard. A navbar is the next piece of site-wide chrome needed before building out the rest of the landing page, since Features/Pricing/FAQ will be built as anchor targets the nav links to.

## What Changes

- Add `components/layout/Navbar.tsx`: logo (`cosico.png`) + nav links (Home, Features, Reviews, Pricing) on the left; auth-conditional controls on the right.
- Right side, left to right: **Register + Login** buttons (logged out) or **Open Chat** button (logged in) → user's name (logged in only, hidden when logged out) → user avatar icon (`userico.png`, always visible as a generic placeholder regardless of auth state).
- Auth state is **mocked on the frontend for now** via a small `useAuth()` placeholder hook returning a hardcoded `{ isLoggedIn, user }` shape — real session verification (calling the backend's `/auth/me`) is explicitly deferred to a later change. The hook's interface is the seam: swapping its internals later shouldn't require touching the Navbar itself.
- Render it in the root layout (`app/layout.tsx`), not inside the hero page — it's persistent site-wide chrome, not a hero-specific effect, and needs to exist above `{children}` so it appears on every future page/route.
- Sticky positioning: stays visible on scroll. Background transitions from transparent (at the top, over the hero) to a solid/blurred dark surface once the user scrolls past a threshold — standard modern pattern, and means the navbar doesn't fight the hero's chromatic aberration/star field visually while at rest.
- Mobile: a hamburger toggle opening a simple slide-down/full-screen menu with the same links and auth controls.
- Deliberately restrained: no chromatic aberration, no star field, no heavy effect layer on the navbar itself — matches `CLAUDE.md`'s "restraint elsewhere" principle and the existing precedent that the dashboard also skips the hero's heavy effects.

## Capabilities

### New Capabilities
- `navbar`: Defines the persistent site navigation — logo, links, CTA, scroll-based background transition, and mobile menu behavior.

### Modified Capabilities
(none — `landing-hero` is consumed as-is; the navbar sits alongside it, not inside it)

## Impact

- Affected code: `apps/frontend` — new `components/layout/Navbar.tsx` (+ a small mobile-menu sub-component if warranted), new `hooks/useAuth.ts` (mock placeholder), `app/layout.tsx` (render the navbar above `{children}`).
- Assets: `public/cosico.png`, `public/userico.png` (both already present).
- Nav links point to in-page anchors (`#home`, `#features`, `#reviews`, `#pricing`) that don't exist yet — they'll resolve once those sections are built in future changes; this change only needs the anchors to be syntactically present, not functional yet.
- Out of scope: real session verification / backend auth check (mocked for now, per explicit instruction — "frontend first, backend part will be later"), the actual Features/Reviews/Pricing sections, "Open Chat" actually navigating to a real chat/dashboard route.
