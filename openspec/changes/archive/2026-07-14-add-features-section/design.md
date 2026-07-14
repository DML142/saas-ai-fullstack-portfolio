## Context

The landing page currently ends at the hero. This adds the features section below it — the first place the product is actually explained. It reuses and extends motifs already established: the hero's drifting-star field, the cosmic-purple accent, the restrained serif/mono typography.

Two distinct parts with two distinct topologies and two distinct animation models:

```
  ═════════  ONE COMMAND, FULLY WIRED  ═════════   (Part 1: full-screen, ambient)

                                              ★ CodeRabbit
                                           ╱  │   (Dubhe)
    ★ .md context                       ╱     │
     (Alkaid)                        ╱        │
       ╲                          ╱           │
        ★ Agent ─── ★ MCP ─── ★ cos init      │
         (Mizar)   (Alioth)    (Megrez) ╲     │
                                         ╲    │
                                          ★ ──★ Skills
                                       OpenSpec  (Merak)
                                       (Phecda)

        └──────── the handle ────────┘└─── the bowl ───┘

   (the Big Dipper, plotted from catalogue coordinates. `cos init` takes
    Megrez — the join where handle meets bowl, and the only one of the
    seven with three connections. Every star reaches it along the real
    figure; Alkaid is three hops out at the tip.)


  ═══════════════  COS CODE FEATURES  ═══════════════  (Part 2: chained scroll pillar)

              ★ (1) FAST INIT
               ╲    run `coscode init` …
                ╲
                 ★ (2) CLI TOOL
                ╱      …
               ╱
              ★ (3) IN-BROWSER WORKSPACE / COS CLOUD
              │       …
              │
              ★ (4) IMPORT / EXPORT
                      …
        (chained pillar: 1 → 2 → 3 → 4. No star reaches more than one
         other, so the path never forks — but star 2 steps out to its own
         lane, so the chain zigzags rather than running dead straight,
         keeping the skill-tree/git-graph feel instead of a plain list)
```

## Goals / Non-Goals

**Goals:**
- Part 1: a real constellation that _shows_ "one command wires everything," with `cos init` at its join and only the lines ambiently alive (no scroll dependency, stars static).
- Part 2: a vertical scroll journey of feature-stars, connected in sequence, carrying the marketing copy, with a subtle fake-3D text warp.
- A shared dim ambient star background; light-cosmic foreground so content reads against it.
- Full reduced-motion story (both parts convey real content, so reduced motion must still show everything — just without drift/scrub).

**Non-Goals:**
- Three.js / WebGL — text-heavy content makes DOM/SVG the right tool.
- The grid background (explicitly dropped).
- Real routes behind the copy's links (e.g. "COS Project Manager") — those stay dead anchors until built, same pattern as the navbar links.

## Decisions

**Decision: Two topologies on purpose — a real constellation (Part 1) + a sequential path (Part 2).**
Earlier exploration framed these as competing options. They're not — each fits a different job. The init story is _inherently_ centered ("everything from one command"), so Part 1 puts `cos init` at a join every other star reaches. The feature tour is _inherently_ sequential (you scroll through it one beat at a time), so a vertical connected path fits.

**Decision: Part 1 is the Big Dipper, plotted from real catalogue data.**
Superseding the original abstract hub-and-spoke. Positions come from real right ascension/declination, projected with an RA·cos(dec) correction so the figure keeps its true proportions, and star sizes come from real apparent magnitude. Two honest costs: the Dipper is a chain with a closed bowl rather than a radial figure, so "everything radiates from one command" reads less directly than a literal hub would (Alkaid is three hops from Megrez); and Megrez is famously the *faintest* of the seven, yet `cos init` sizes it largest — the one deliberate departure from the catalogue, with the other six keeping their true magnitude ordering.

**Decision: Part 1 is ambient; Part 2 is scroll-scrubbed (GSAP `ScrollTrigger`).**
Part 1 doesn't earn anything from scroll-coupling — it's a full-screen statement you look at, with gentle idle motion confined to the lines (the stars are static; a constellation that drifts stops being one). Part 2 is where `ScrollTrigger` with `scrub` finally earns its place: feature-stars and their connecting lines reveal/draw as you scroll. This is the first use of ScrollTrigger in the project — deliberately avoided for the navbar (a binary toggle didn't need it), justified here (continuous scroll-linked animation is exactly its purpose).

**Decision: DOM + SVG + CSS transforms, no Three.js.**
The "3D text" is a CSS `perspective` + `rotateX/Y` warp, not a WebGL scene. Nodes are DOM (selectable text, real links, accessible); connecting lines are SVG. Three.js stays uninstalled. This is the same reasoning that reshaped CLAUDE.md's original "3D constellation" — and this section now _is_ that constellation, realized in 2D.

**Decision: The shared star background is a dimmed, blend-mode-free variant of the hero's `StarField`, not a direct reuse.**
The hero's `StarField` uses `mix-blend-mode: difference` specifically to invert white text on contact — a hero-only trick. Here the background stars are pure ambiance and must _not_ invert the cosmic-purple foreground. So this needs a simpler variant: dimmer stars, no blend mode. Whether that's a new component or a `variant` prop on the existing one is an implementation detail for the tasks phase.

**Decision: Figure/ground split via color, not just brightness.**
Background stars: dim white. Foreground connectors + text: light cosmic-purple (likely a new `--color-cosmic-light` token, a lighter tint of the existing `--color-cosmic`). Keeping foreground on a different hue — not merely brighter — guarantees content never blends into the ambient field, even where a bright bg star happens to sit behind text.

**Decision: No pixel-fill effect — feature-stars activate via glow, not a top-to-bottom color fill.**
The earlier brainstorm's signature "waterline fill" (clip-path over a stacked cosmic copy) is explicitly dropped. Feature-stars appear/brighten as glowing dots with their text, matching the star/constellation language of the rest of the page. This also removes the double-rendered-node complexity (duplicate links/hit-targets) that the fill approach carried.

**Decision: Part 1 labels sit beside their star, direction chosen per star.**
Each tool name is placed at its own star rather than along a line, so each reads as "a star named X". Because the figure is a fixed, known shape, the direction (up/down/left/right, or a diagonal for the hub — the only star with lines leaving on all four sides) is hand-assigned per star rather than derived, which is both simpler and more controllable than an algorithm. Tool→star assignment is also deliberate: short labels go mid-handle where stars crowd in from both sides, and the longest goes to the handle's tip where it has open space.

**Decision: Part 2 is a zigzagging chain, not a fork and not a straight line.**
Connection graph: 1 → 2 → 3 → 4. No star reaches more than one other, so there is only ever a single line to follow. The skill-tree/git-graph quality is carried by *lane* instead of by branching — star 2 sits in its own indented lane, so the chain steps right then back left rather than running dead straight. Document and scroll order stay a plain top-to-bottom 1 → 2 → 3 → 4.

**Decision: Part 2's reveal is one scrubbed timeline, not a ScrollTrigger per element.**
Each line must finish drawing before the next one starts. Per-element triggers can't promise that — their scroll ranges overlap whenever two rows sit close together, so the ordering would merely tend to hold at some viewport heights. Appending every tween to a single timeline scrubbed over the whole pillar makes the sequencing structural. The stars are spaced evenly enough down the pillar that equally-weighted beats keep timeline progress tracking scroll position closely.

**Decision: Page-wide smooth scrolling via GSAP ScrollSmoother.**
ScrollSmoother keeps the native scrollbar as the source of truth — it sets the body's height and translates the content to catch up — so `window.scrollY` and the `scroll` event keep working (the navbar's `useScrolled` needs no change) and ScrollTrigger integrates with it natively (the feature-star reveals and the ambient parallax need no change). It ships free in the installed GSAP (3.13+ made the formerly-Club plugins free). Two constraints follow: `position: fixed` elements must live outside `#smooth-wrapper` (hence the navbar staying a sibling in the root layout), and no CSS is authored for the wrapper — ScrollSmoother applies its own at create time, so the reduced-motion path, where no smoother is created, is left with plain native scrolling.

**Decision: The ambient star background parallaxes slower than the foreground.**
The bg star layer translates at a fraction of scroll speed while the content scrolls normally — depth without the grid. Implemented as a scroll-linked transform on the bg layer (ScrollTrigger scrub or a lightweight scroll transform), disabled under reduced motion (bg becomes static; stars still visible).

## Risks / Trade-offs

- [Resolved] SVG connector lines need pixel positions, and the fixed-stage-vs-measured fork landed differently per part. Part 1 uses a **fixed SVG coordinate stage**: node positions are computed from the viewBox and never measured, so `preserveAspectRatio` does the responsive work and there's no ResizeObserver or layout thrash. Part 2 **measures**: its rows are flowing text whose height depends on copy, font loading and wrap width, so there is no honest way to know where a star lands without asking the DOM — a ResizeObserver re-measures and refreshes ScrollTrigger, since font-load reflow isn't a window resize. Both parts have a distinct simplified mobile layout (precedent: hero and navbar both needed one).
- [Risk] `ScrollTrigger` + `useGSAP` cleanup in the App Router (remount on navigation) → Mitigation: register the plugin once, scope triggers to a ref, rely on `useGSAP`'s revert-on-unmount (same discipline used for the hero timelines).
- [Trade-off] Part 1 at full `100vh` adds a full screen of scrolling before the feature copy → acceptable; it's the "wow" beat that earns attention before the pitch.

## Resolved Questions

All four blocking questions from the exploration phase were settled explicitly:

1. **Pixel-fill effect** — dropped; glow-star activation instead (see Decisions).
2. **Part 2 topology/content** — chained pillar (1 → 2 → 3 → 4), superseding the earlier branching graph: no star reaches more than one other, and the zigzag comes from star 2's lane offset instead of a fork. Working star list: FAST INIT, CLI TOOL, IN-BROWSER WORKSPACE / COS CLOUD (merged from the overlapping workspace/cloud items), IMPORT / EXPORT. "Everything from the box" becomes section-level tagline copy, not a node. Final wording refined during implementation.
3. **Spoke labels (Part 1)** — at the outer endpoint dot.
4. **Star bg parallax** — yes, bg parallaxes slower than foreground.

## Migration Plan

Additive only — new section appended below the hero. No existing behavior changes.
