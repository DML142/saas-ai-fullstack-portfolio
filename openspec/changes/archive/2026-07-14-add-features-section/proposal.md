## Why

The landing page has a hero and a navbar, but the navbar's `#features` link points at nothing, and the product is never actually explained. This section fills that gap and does double duty: **Part 1 shows _how_ COS Code works** (one command wires everything together), and **Part 2 sells _what_ you get** (the feature set). It's the next section down the page after the hero.

## What Changes

Add a two-part features section to the landing page, under the hero, targeted by the navbar's `#features` anchor.

**Part 1 — "One Command, Fully Wired"** (full-screen, ~`100vh`):
- A real constellation — the Big Dipper, plotted from catalogue coordinates — with `cos init` at Megrez (where the handle meets the bowl) and the tools it auto-wires (MCP, CodeRabbit, Agent, OpenSpec, Skills, `.md` context) on the other six stars.
- Every star reaches `cos init` along the Dipper's own figure, so "everything from one command" is carried by a shape the sky actually makes rather than one drawn to suit us.
- Stars are static. Only the connecting lines carry a slow ambient breathe — **not** scroll-scrubbed; you scroll past it, it doesn't need scroll to come alive.

**Part 2 — "COS Code Features"** (vertical scroll journey):
- A sequence of feature "stars" — each a glowing dot with a title + description — chained one to the next (1→2→3→4, never forking) as you scroll down. Lines draw strictly one at a time: each finishes before the next starts.
- Descriptions carry the marketing copy (FAST INIT, CLI tool, in-browser workspace/cloud, import/export — final list TBD, see Open Questions).
- Text gets a subtle **fake-3D warp** (CSS `perspective`/transform, not WebGL) so it reads as tilted in space.

**Shared across both parts:**
- A dim ambient star-field background (a dimmed variant of the hero's drifting stars) behind the whole section.
- Foreground connectors and text render in **light cosmic-purple**, deliberately distinct from the dim white background stars — a figure/ground split so content never dissolves into ambiance.
- Two section headers: "One Command, Fully Wired" and "COS Code Features".
- Page-wide smooth scrolling (GSAP ScrollSmoother), which both parts' scroll-linked effects ride on.

**Explicitly dropped** from the earlier brainstorm: the grid background (out entirely).

## Capabilities

### New Capabilities
- `features-section`: Defines the two-part features section — the Big Dipper init constellation and the scrollable feature-stars journey — including its ambient star background and figure/ground color treatment.

### Modified Capabilities
(none — the navbar's `#features` anchor requirement is already satisfied by the navbar spec; this just gives the anchor something to point at. `landing-hero` is untouched.)

## Impact

- Affected code: `apps/frontend` — new components (an init-workflow constellation, a scrollable feature-stars journey, a dimmed ambient star-background variant), landing `page.tsx` composition, possibly a new `--color-cosmic-light` token, and first-time use of GSAP's `ScrollTrigger` plugin (already ships with the installed `gsap`, just needs registering).
- No Three.js — everything is DOM/SVG/CSS/GSAP (the text-heavy content makes WebGL the wrong tool, same reasoning that reshaped the original CLAUDE.md "3D constellation" idea into this).
- Per `CLAUDE.md`'s Frontend Exception: the effect-heavy pieces (constellation animation, scroll-scrubbed feature reveals, the star bg) are AI-authored with explanation; routine composition/layout can be handed off.
- This section **replaces** the deferred "3D react-three-fiber constellation" from CLAUDE.md's effect vocabulary — that idea is now realized here as 2D DOM, split into these two parts.

## Resolved Questions

All four open questions were settled during exploration (details in design.md):

1. Pixel-fill effect: **dropped** — glow-star activation instead.
2. Part 2: **chained pillar** — 1 → 2 → 3 → 4, no star reaching more than one other; star 2 sits in its own lane so the chain zigzags. Four stars: FAST INIT, CLI TOOL, IN-BROWSER WORKSPACE / COS CLOUD (merged), IMPORT / EXPORT.
3. Part 1 labels: **beside their own star**, direction hand-assigned per star.
4. Star bg: **parallaxes** slower than the foreground.
