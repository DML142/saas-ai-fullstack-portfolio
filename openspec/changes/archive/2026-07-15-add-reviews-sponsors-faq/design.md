## Context

The landing page currently ends at Features. This adds the next block down: reviews, integration partners, and FAQ, stacked as one continuous section behind the navbar's already-dead `#reviews` link — same relationship `add-features-section` had to `#features`. It reuses infrastructure that change built specifically to be reusable: `AmbientStarField` (dim, parallaxing, reduced-motion-safe), `starVisuals.tsx`'s `StarMark`/`StarGradientDefs` (already mounted once on the page by `FeaturesSection`), and — new in this design — `FeatureStars`' glow-in tween shape (`scale` + `autoAlpha`), reused for a different purpose than it was built for.

This section went through a real reframe during exploration, not just a features list. The original draft treated Reviews as a sliding testimonial card (borrowing `WordCycler`'s mechanism) and Sponsors as fictional company logos (to sidestep a false-endorsement risk). Both turned out to be solving the wrong problem: Reviews felt like a generic SaaS pattern with no connection to the rest of the page's visual language, and Sponsors' fictional-company workaround was a way to avoid a claim that didn't need to be made in the first place — the tools this product actually integrates with (CodeRabbit, MCP, OpenSpec, etc.) are already real and already visualized in `features-section`'s constellation.

Three parts, three genuinely different animation shapes:

```
  ═══════════  THEY TRUST OUR PRODUCT  ═══════════   (Part 1: review star cluster)

         ·                    ★                    ·
                        "cos init read my repo   ·
        ·               and wired in exactly     ★  ← dim, unlit,
                        what I needed"                waiting its turn
              ⊙ Jae T. — backend engineer     ·
        ★  ← next star ignites here as the
           current one dims back down            ·
                (glow-transfer: scale + autoAlpha,
                 reusing FeatureStars' reveal shape —
                 not a slide, nothing leaves the screen)


  ═══════════════  INTEGRATES WITH  ═══════════════   (Part 2: real-name marquee)

    CodeRabbit   MCP   OpenSpec   Agent   Skills   .md context   →→→ (loops)
     dim/mono at rest · full color + marquee paused on hover
                    (real names — text wordmarks, no CTA)


  ═══════════════════  FAQ  ═══════════════════   (Part 3: five Q/A pairs)

              ★ Why not install the tools myself?
                answer…
       ───────────────●───────────────   (line draws outward
              ★ Why this AI for my projects?          from center on scroll)
                answer…
       ───────────────●───────────────
              … (5 total)
```

## Goals / Non-Goals

**Goals:**
- Part 1: a small scatter of unconnected stars where the active review is the one currently lit — glow-transfer cycling, not a slide, with a fictional individual attribution and an abstract avatar per review.
- Part 2: a seamless infinite marquee of real integration-partner names as text wordmarks — dim/translucent at rest, full-color and paused on hover.
- Part 3: five FAQ pairs with a star mark per question, cosmic-light question / white answer, separated by a line that draws from center outward on scroll.
- One shared ambient star background across all three parts, reusing the existing component as-is.
- Full reduced-motion story: nothing hidden — see the per-part reduced-motion decisions below, which are stricter than "just stop animating" for Part 1.

**Non-Goals:**
- A functional Pricing page — still not built; no link in this section needs it anymore now that the sponsor CTA is gone.
- A real sponsorship product (paid placement, signup flow) — "Integrates with" states a true technical fact, not an invitation to pay for a listing.
- Real logo image assets for the integration partners — the names are now real, but this project still has no rights to embed CodeRabbit's, MCP's, etc. actual brand-mark art. Wordmarks stay typographic regardless of whether the underlying name is real or fictional.
- Photorealistic avatar photos for fictional reviewers — a separate deceptive-pattern risk from the company-naming question, not solved by anything above and worth its own explicit non-goal.

## Decisions

**Decision: "Sponsors" becomes "Integrates with," using the real tool names `features-section` already established.**
The original fictional-company workaround was solving a problem this section doesn't actually have to have. `features-section`'s Big Dipper constellation already names CodeRabbit, MCP, OpenSpec, Agent, Skills, and `.md` context as things `cos init` genuinely wires in — that's not a claim invented for marketing, it's the literal premise of the product. Reusing those same names here as "Integrates with" makes the strip's content true instead of fictional, which is a strictly better resolution than the earlier "just invent companies" default: no risk to manage, no disclaimer needed, and it reinforces continuity with Part 1 of `features-section` instead of introducing a parallel cast of made-up names.

**Decision: Reviews are an ignite-in-place star cluster, not a sliding card.**
The original design reached for `WordCycler`'s slide mechanism because it already existed in the codebase — but a sliding testimonial card is a generic pattern with no connection to a page built almost entirely out of stars. Instead: 5 stars in a loose, fixed, unconnected scatter (no lines — these aren't wired to each other the way constellation nodes are). One is active — bloomed larger and brighter, per `StarMark`'s existing bloom/spike/core layering, with its quote and attribution shown beside it. On cycling, the active star dims back down to a small resting brightness (not to zero — it stays visibly present, matching the "dim, unlit, waiting its turn" language sketched above) while the next one blooms up. This reuses `FeatureStars`' glow-in tween shape (`gsap.fromTo` on `scale` + `autoAlpha`) run in both directions — up for the incoming star, down (to a resting minimum, not to invisible) for the outgoing one — rather than `WordCycler`'s `xPercent` slide. Different vocabulary for a different visual: glow-transfer instead of cards passing each other off-screen.

**Decision: Review avatars are abstract (initials-in-a-circle or equivalent), never photographic.**
Attributing a fabricated quote to a fake human face is a well-known deceptive pattern in its own right — independent of, and not solved by, making the reviewer's name generic. An abstract avatar (a colored circle with the reviewer's initials, sized to sit beside the lit star) gets the "profile picture" visual without ever implying a real photographed person exists. Fully CSS/SVG — no image assets needed.

**Decision: Reduced motion for Part 1 shows all five reviews at once, not just one.**
A naive reduced-motion fallback ("show star 1, statically") would hide four reviews behind a cycling mechanism that no longer runs — the opposite of what reduced-motion is for everywhere else on this page. Instead, under `prefers-reduced-motion: reduce`, every star renders at its lit brightness with its quote visible simultaneously (a small stacked list, effectively), matching the discipline `features-section` already set: reduced motion means "show everything, skip the choreography," not "show a frozen frame of the choreography."

**Decision (corrected after real-device review): the integrations marquee measures a copy width and renders as many copies as the viewport needs — the original "no measurement needed" design was wrong.**
The original reasoning: render the wordmark array twice, tween `xPercent` from `0` to `-50`, and the loop point is exact because both halves are the same array. That's true of the loop point in isolation, but it silently assumed the *viewport* is narrower than one copy of the content — false on a wide monitor with only six short words, where the track ran out of content before the loop wrapped: a chunk visibly vanished off the left edge while new content popped in on the right, instead of the two ends meeting invisibly. The fix reuses `features-section`'s Part 2 pillar technique after all — a `ResizeObserver` measures one copy's real rendered width, computes how many copies the current viewport needs (with a safety margin), and the tween shifts by that measured pixel width rather than a fixed percentage of a two-copy track. Verified mathematically zero-gap across a full animation cycle at 2200px (worst-case margin +2041px) and confirmed it correctly bounds down to fewer copies on mobile. The lesson: two equal-width halves guarantee a clean loop *point*, but not a loop that never runs dry — those are different guarantees, and only measurement gives you the second one.

**Decision: Hover pauses the whole marquee tween, not just the hovered wordmark.**
Unchanged. Pausing the single shared tween on `pointerenter` (any wordmark) and resuming on `pointerleave` (the track) reads correctly: the whole strip holds still while you're looking at any part of it. Per-wordmark full-color-on-hover is an independent CSS `filter` transition — dim/desaturated at rest, `filter: none` on `:hover`.

**Decision: FAQ separator lines are a single `scaleX` tween from a centered transform-origin.**
Unchanged. A `<div>` with `transform-origin: 50%` animated `scaleX: 0 → 1` grows symmetrically from center to both edges in one tween — no SVG, no measured geometry, unlike `features-section`'s Part 2 lines which ran between independently-positioned stars and needed real per-line draws.

**Decision: FAQ stars reuse `StarMark` from `starVisuals.tsx` as-is.**
Unchanged. That module was extracted during `features-section` specifically so any star mark on the page shares one gradient definition.

**Decision: Five FAQ topics, wording finalized during implementation.**
Unchanged. Why not self-install the tooling; why this AI/agent tooling over alternatives; why the price is what it is (naming what it covers — CodeRabbit, cloud, agents); whether `cos init` works on an existing project; how to add custom Skills/MCP servers.

**Decision (added after real-device review): FAQ questions get a GSAP fade-up reveal alongside the separator lines, not AOS.**
The ask was a fade-in as each question crosses the bottom of the screen — the kind of effect the `aos` library exists specifically for. Evaluated and rejected: AOS's entire vocabulary is fixed-preset, one-shot class toggles (fade/flip/slide/zoom) with no scrub and no looping, so it would only ever have covered this one reveal — everything else in the section (the marquee's infinite loop, the separators' scrub, Part 1's interval-driven crossfade) is already outside what AOS can express and already built in GSAP. AOS also tracks native scroll position directly, the same assumption that broke `scrollIntoView()` under `ScrollSmoother` earlier in this project — introducing a second animation library whose scroll-detection semantics are unverified against an already-nonstandard scroll model, for capability `ScrollTrigger` already has, wasn't worth it. Implementation: a `gsap.fromTo` per row (`autoAlpha` + `y`) with its own `ScrollTrigger` at `start: 'top bottom'`, non-scrubbed, `toggleActions: 'play none none none'` so a question doesn't re-hide if the user scrolls back up past it — same "never re-hide already-revealed content" rule the rest of the page follows.

**Decision (added after real-device review): `AmbientStarField`'s density was raised project-wide.**
The ambient background read as almost empty against the near-black page background — a handful of barely-visible dots rather than a sky. Star count went 48 → 160 and the opacity floor/range widened (0.12–0.44 → 0.18–0.55 authored, before the twinkle tween's own `+=0.15` swing). This is a shared component also used by `features-section`, so the fix applies there too — the same underlying bug, not something specific to this section.

## Risks / Trade-offs

- [Risk] Touch devices have no true hover, so the marquee's pause-and-reveal interaction is desktop-only by nature. → Mitigation: accept it — the marquee simply scrolls continuously, untouched, on mobile. Every wordmark is still visible, just never full-color there.
- [Risk] Part 1's fixed-scatter star layout needs to stay legible at 375px without the luxury of `InitConstellation`'s two-full-stage (desktop/mobile) treatment for what's meant to be a lighter, quieter section. → Mitigation: keep the scatter small (5 stars) and the bounding stage narrow enough that a single stage — not two — can serve both breakpoints; revisit with a dedicated mobile stage only if it doesn't hold up in practice.
- [Risk] Three independently-animated parts (star-cluster ignite, continuous marquee, scroll-scrubbed lines) stacked in one section is real simultaneous motion. → Mitigation: none of the three is expensive on its own — the marquee is one continuous transform, the star cluster only animates during its brief transition window every few seconds, and the FAQ lines only run while `ScrollTrigger` says that area is in view. Still worth a real jank check during verification, same discipline `features-section` deferred to a real device.

## Migration Plan

Additive only — new section appended below Features. No existing behavior changes.
