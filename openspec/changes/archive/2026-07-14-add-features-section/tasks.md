## 1. Foundations [you implement]

- [x] 1.1 Add `--color-cosmic-light` token to the `@theme` block in `globals.css` (lighter tint of `--color-cosmic`, for foreground connectors/labels/feature text)
- [x] 1.2 Register GSAP's `ScrollTrigger` plugin (ships with installed `gsap`; register once alongside `useGSAP`)
- [x] 1.3 Add the `#features` anchor target and the two section headers ("One Command, Fully Wired", "COS Code Features") to the landing page structure below the hero
- [x] 1.4 Page-wide smooth scrolling via GSAP `ScrollSmoother` (ships free in the installed `gsap` — 3.13+ released the formerly-Club plugins). Wrap the root layout's children in `#smooth-wrapper`/`#smooth-content`, keeping the `fixed` navbar outside; author no CSS for the wrapper so the reduced-motion path falls back to native scroll

## 2. Ambient star background [AI-authored]

- [x] 2.1 Create the dim ambient star variant (new component or `variant` prop on `StarField`): dimmer stars, **no** `mix-blend-mode`, spanning both parts of the section
- [x] 2.2 Add the parallax: bg layer translates at a fraction of scroll speed relative to foreground
- [x] 2.3 Reduced-motion fallback: static bg stars (visible, not drifting, no parallax)

## 3. Part 1 — Init constellation [AI-authored]

- [x] 3.1 Build the full-screen constellation: the Big Dipper from catalogue coordinates on a fixed SVG stage, `cos init` at Megrez, the six tools labeled on the remaining stars (MCP, CodeRabbit, Agent, OpenSpec, Skills, `.md` context)
- [x] 3.2 Ambient idle animation: gentle line pulse/breathe only, running independent of scroll. Stars are static — no drift, glow pulse, or parallax
- [x] 3.3 Foreground styling in `--color-cosmic-light`, distinct from dim white bg stars; stars themselves are white-cored with a cosmic bloom
- [x] 3.4 Mobile layout: simplified below `md` (own narrower stage; wing-tip and hub labels reposition to avoid running off it)
- [x] 3.5 Reduced-motion fallback: full constellation rendered static

## 4. Part 2 — Feature-stars pillar [AI-authored]

- [x] 4.1 Build the chained pillar layout: four feature-stars (FAST INIT, CLI TOOL, IN-BROWSER WORKSPACE / COS CLOUD, IMPORT / EXPORT) chained 1→2→3→4 — no star connects to more than one other. Star 2 sits in its own indented lane so the chain zigzags rather than running straight
- [x] 4.2 Feature-star content: glowing dot + title + description; code snippets (e.g. `coscode init`) in mono font with chip styling; in-copy links (e.g. "COS Project Manager") in cosmic, pointing at not-yet-built routes
- [x] 4.3 Scroll-scrubbed reveal via ScrollTrigger: stars glow in and connector lines draw as the user scrolls, in scroll order — strictly sequential, each line finishing before the next begins (one scrubbed timeline, not a trigger per element)
- [x] 4.4 Fake-3D text warp: subtle CSS `perspective`/`rotate` treatment on feature text
- [x] 4.5 Mobile layout: simplified below `md` (lane offset reduced so the chain still zigzags but fits; fake-3D warp dropped)
- [x] 4.6 Reduced-motion fallback: all stars/lines/text rendered complete and static

## 5. Composition [you implement]

- [x] 5.1 Compose both parts + shared bg into the landing `page.tsx` below the hero, confirming the navbar's `#features` link now scrolls to the section
- [x] 5.2 Final copy pass on all feature descriptions and the section tagline ("everything from the box" as section-level copy, not a node)

## 6. Verification

- [x] 6.1 Part 1 renders: the Big Dipper's seven labeled stars and its bowl+handle figure, stars static, line breathe present without scrolling
- [x] 6.2 Part 2 renders: four stars, correct chain topology (1→2→3→4, no star with two outgoing lines), scroll-scrubbed reveal working in order with no two lines drawing at once
- [ ] 6.3 Parallax: bg stars visibly slower than foreground while scrolling
- [x] 6.4 Figure/ground: cosmic-light foreground clearly distinct from dim white bg stars everywhere they overlap
- [x] 6.5 Navbar `#features` link scrolls to the section
- [x] 6.6 Mobile: both parts usable/readable at 375px with their simplified layouts
- [x] 6.7 Reduced motion: everything visible and static, nothing hidden behind scroll reveals
- [ ] 6.8 Scroll performance: no visible jank through the section (first real test of task 8.5 deferred from add-landing-hero — there's finally content below the hero to scroll into)
