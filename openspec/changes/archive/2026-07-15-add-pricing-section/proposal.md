## Why

The landing page ends at Reviews. The navbar's `#pricing` link already exists and points at nothing — same dead-anchor pattern `#features` and `#reviews` were in before their sections landed. This section fills it: three plan cards, so a visitor who's just read the FAQ's pricing answer ("why does it cost what it costs?") can immediately see the actual numbers.

## What Changes

Add one new section to the landing page, below Reviews, targeted by the navbar's existing `#pricing` anchor.

**Three plan cards — Lite ($100/mo), Ultra ($400/mo, centered), Pro ($200/mo)** — deliberately laid out left-to-right as Lite / Ultra / Pro, not price order, so the most expensive plan sits in the visually dominant center slot rather than the conventional "middle = recommended" position:

- **Lite**: CLI only, bring-your-own agent (custom agent API or GLM 5.2 Lite Connect), 5GB cloud.
- **Pro**: everything Lite has, plus COS Agent integrated in both the CLI and the workspace (ChatGPT, Claude, and GLM API access), 10GB cloud.
- **Ultra**: everything Pro has, at higher usage limits/rate, plus 25GB cloud. Same agent integrations as Pro — not new capability, more headroom (the Claude-Max-vs-Claude-Pro pattern: same features, bigger ceiling).

A star sits above each card, reusing `StarMark` from `starVisuals.tsx` — larger and brighter as the tier goes up, the same continuity thread `features-section` and `reviews-sponsors-faq` already established.

**This is deliberately the "calm" section.** After Features (constellation + chained pillar) and Reviews (ignite-cluster + marquee + fade), Pricing gets the shared ambient star background and the hero's `ChromaticAberration` treatment, but no bespoke star mechanic of its own — a rest beat before the page's rhythm resumes.

**The Ultra card gets the one bespoke effect in the section**: a thin glowing border-segment that travels the perimeter continuously in one direction (not the whole edge lit at once), with an uneven, cloud-textured glow behind the card — in cosmic purple, never green/blue/other hues. The card's own surface sits at a higher z-layer and stays visually clean, unaffected by the glow directly; only a thin glass-transparent, blurred rim at its edge lets the glow behind bleed through, frosted-glass style.

**Buttons get a bespoke elevation treatment**: resting "popped up" with a 3D protrusion look (gradient fill, layered shadow), and — deliberately unconventional — the press-in compression happens on **hover**, not on click/`:active`.

**Below the cards**: a link to `/contact` ("or contact our sales manager for other plans") — not yet built, same dead-route precedent `/dashboard` already has in `reviews-sponsors-faq`'s FAQ.

**Naming clarified during exploration**: "Lite / Pro / Ultra" are pure marketing/display names, decoupled from the backend's actual RBAC roles (`USER` / `PREMIUM` / `ADMIN`, already implemented — see `openspec/specs/rbac/spec.md`). This section is frontend-only; wiring these tiers to real backend gating (new role values, guard changes) is explicitly out of scope and would be separate, backend-lane work following this project's normal explain-first workflow, not something bundled into a frontend-exception pass.

## Capabilities

### New Capabilities
- `pricing-section`: Defines the three-plan pricing section — plan cards, the Ultra card's traveling-glow border treatment, the elevation-effect buttons, and the sales-contact link — sharing the site's ambient star background and reusing the hero's chromatic aberration filter.

### Modified Capabilities
(none — the navbar's `#pricing` anchor requirement is already satisfied by the navbar spec; this just gives the anchor something to point at. `rbac`'s roles are explicitly untouched by this change — see "Naming clarified" above.)

## Impact

- Affected code: `apps/frontend` — new pricing components, landing `page.tsx` composition below `<ReviewsSection />`, reuse of `AmbientStarField` and `StarMark`.
- `ChromaticAberration` needs a small refactor before reuse: it currently hardcodes its SVG filter `id`, so a second usage on the page as-is would collide with the hero's — fixed by parameterizing the id, not by copy-pasting the component.
- First use of CSS `offset-path`/`offset-distance` (motion path) in this project, for the Ultra card's traveling border segment.
- First use of `feTurbulence`/`feDisplacementMap` in this project's SVG filter vocabulary, extending the precedent `ChromaticAberration` set for reaching for real SVG filters over layered-blur approximations — chosen deliberately over a cheaper multi-blob glow because it's the more literal "cloud mask" read and stays affordable with a static (non-animated) noise seed.
- First use of `backdrop-filter` (glass/frosted border) in this project.
- Per `CLAUDE.md`'s Frontend Exception: the effect-heavy pieces (Ultra's glow system, the button elevation/press treatment) are AI-authored with explanation; routine card layout/composition can be handed off.
- No backend changes. No RBAC role changes. No real Stripe/payment wiring — buttons and the sales-contact link are presentational only at this stage, consistent with how Pricing has always been a dead anchor until now.
