## Context

`apps/frontend` is the unmodified Next.js 16 / Tailwind 4 scaffold — no theme, no components beyond the default page. This change establishes the base design system (palette, typography) and builds the hero: a word-cycling headline, a drifting star field that inverts text on contact, and a scoped chromatic-aberration effect. Per `CLAUDE.md`'s Frontend Exception, the AI authors the effect implementation directly (GSAP timelines, the SVG filter, blend-mode layering) and explains it thoroughly; the user implements page/route scaffolding and wires the authored components in.

## Goals / Non-Goals

**Goals:**
- Design tokens (colors, font) defined once, in Tailwind v4's CSS-native `@theme` block, reusable by every future section.
- `WordCycler`: `BUILD` fixed, second word slides through `FASTER → SAFER → SMARTER → FEARLESSLY` on a loop, with an occasional brief per-letter vertical stretch.
- `StarField`: rounded stars drift right-to-left at randomized intervals; overlapping hero text inverts via `mix-blend-mode: difference`.
- `ChromaticAberration`: a constant, subtle SVG-filter-driven RGB channel split, scoped to the hero only.
- All three respect `prefers-reduced-motion` — reduced motion isn't "everything OFF," it's "convey the same content without motion-heavy decoration."

**Non-Goals:**
- The 3D constellation (separate future change).
- Any content below the hero (Features/Pricing/FAQ/Contact — separate future changes).
- Server-side rendering of these effects — all three are inherently client-side/interactive; this change accepts that tradeoff (marked `'use client'`) rather than fighting it.

## Decisions

**Decision: Tailwind v4 theme tokens live in `app/globals.css` via `@theme`, not a `tailwind.config.js`.**
v4's CSS-first configuration is the current idiomatic approach (confirmed against Tailwind's own docs) — `tailwind.config.js` still works for edge cases but isn't where new projects should start. Tokens needed for this change:
```css
@theme {
  --color-bg: oklch(0.08 0 0);        /* near-black, not pure #000 — pure black crushes contrast against the CA/blend effects */
  --color-ink: oklch(1 0 0);          /* white */
  --color-cosmic: oklch(0.55 0.22 300); /* cosmic purple accent */
  --font-display: "Newsreader", serif;
}
```
Using `oklch` rather than hex is deliberate: perceptually uniform lightness makes it easier to tune the purple's intensity later without accidentally shifting its hue, and it's Tailwind v4's own documented convention.

**Decision: `WordCycler` uses `@gsap/react`'s `useGSAP` hook with a `scope` ref, not raw `useEffect` + manual `gsap.context`.**
`useGSAP` automatically reverts (cleans up) every animation created inside it when the component unmounts or dependencies change — critical in the App Router, where navigating away and back can remount the hero. Hand-rolling this with `useEffect` risks leaked/stacking timelines on fast navigation. The word-cycle itself is a repeating GSAP timeline: current word animates up-and-out (`y: -100%, opacity: 0`) while the next word animates in from below (`y: 0, opacity: 1`), on an infinite loop with a per-word hold duration. The letter-stretch accent is a separate, randomly-scheduled `gsap.to` targeting one random letter span with a fast `scaleY` pulse — decoupled from the word-cycle timeline so it can fire independently and unpredictably, matching "occasionally."

**Decision: Stars are a small pool of absolutely-positioned DOM elements animated by GSAP, not a canvas/WebGL particle system.**
The blend-mode trick (`mix-blend-mode: difference`) only works on real composited DOM/CSS layers — a canvas particle system would need per-pixel readback to achieve the same inversion, which is exactly the expensive/fragile approach this design explicitly avoids (see `CLAUDE.md`'s framing). A handful of `<span>` elements, each animated right-to-left with GSAP and recycled (reset off-screen-right, re-triggered) after they exit, is cheap and composites on the GPU.

**Decision: The star field's parent container needs `isolation: isolate`.**
`mix-blend-mode: difference` blends against *everything painted behind it in the current stacking context* — without `isolation: isolate` scoping that context to the hero, stars could blend against unrelated content elsewhere on the page (e.g. if something behind the hero in DOM order, outside this section, happens to render there). This is a real, easy-to-miss bug class with blend modes, called out explicitly so it's not discovered later.

**Decision: Chromatic aberration is one `<svg>` `<filter>` definition (`feOffset` × 2 + `feBlend`), applied via `filter: url(#hero-ca)` on a single wrapper div around the hero's content.**
Splitting the red and blue channels a fraction of a pixel apart in opposite directions and recombining via `feBlend` produces the aberration look without any WebGL/canvas — pure CSS `filter`, GPU-composited, works on real DOM (text stays selectable, accessible). Scoping it to one wrapper (not `body` or `:root`) is what keeps it cheap: the browser only has to re-rasterize that subtree, not the whole page, avoiding the scroll-jank failure mode flagged back when this idea was first discussed.

**Decision: `prefers-reduced-motion: reduce` disables the star field and CA filter entirely, and turns the word-cycle into an instant swap (no slide animation) at the same interval.**
The headline's content (the cycling words) is meaningful copy, not pure decoration — reduced motion should still let a user read it, just without the animated transition. Stars and CA are pure decoration with no informational content, so they're fully removable with no loss.

## Risks / Trade-offs

- [Risk] `isolation: isolate` forgotten on the star field's container → stars blend against the wrong background. Mitigation: called out explicitly in tasks.md as its own checklist item, not buried inside a bigger task.
- [Risk] SVG filter performance if the wrapper div is too large/complex a subtree → Mitigation: wrapper scoped tightly to just the hero, not the full page; verified by testing scroll performance specifically past this section.
- [Trade-off] `Newsreader` (a Google Font) adds a network request / FOUT risk → Mitigation: use `next/font` for automatic self-hosting and font-display optimization, standard Next.js practice, avoids a render-blocking external request.

## Migration Plan

Additive only — no existing hero to migrate from. Rollback is deleting the new components and reverting `globals.css`.
