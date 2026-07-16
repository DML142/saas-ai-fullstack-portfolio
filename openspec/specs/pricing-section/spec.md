# pricing-section Specification

## Purpose

Defines the landing page's pricing section — the last section CLAUDE.md's original landing list owed. Three plan cards (Lite / Pro / Ultra), deliberately quiet relative to Features and Reviews except for one bespoke effect on the Ultra card, plus a sales-contact link for plans outside the three shown.

## Requirements

### Requirement: Three plan cards
The system SHALL render a `#pricing` section with three plan cards — Lite ($100/mo), Pro ($200/mo), Ultra ($400/mo) — laid out left-to-right as Lite, Ultra, Pro, with Ultra visually centered despite not being the middle price.

#### Scenario: Card content
- **WHEN** a user views the pricing section
- **THEN** each card shows its plan name, monthly price, and feature list: Lite (CLI only, bring-your-own agent, 5GB cloud), Pro (Lite's features plus COS Agent integrated in CLI and workspace with ChatGPT/Claude/GLM API access, 10GB cloud), Ultra (Pro's features at higher usage limits, 25GB cloud)

#### Scenario: Visual order independent of DOM order
- **WHEN** a user tabs through the cards with a keyboard
- **THEN** focus moves in price-ascending order (Lite, Pro, Ultra) regardless of the visual left-to-right position (Lite, Ultra, Pro)

### Requirement: Tier-scaled star mark
Each card SHALL display a star above it, reusing the shared `StarMark`, sized and brightened according to plan tier — larger and brighter for higher tiers.

#### Scenario: Star scales with tier
- **WHEN** a user compares the stars above the three cards
- **THEN** Ultra's star is the largest and brightest, Pro's is mid-sized, and Lite's is the smallest and dimmest

### Requirement: Ultra card glow system
The Ultra card SHALL display a cosmic-purple glow behind it with an uneven, cloud-textured shape, and a thin glowing segment that continuously travels the card's border perimeter in one direction without illuminating the full border at once. The card's own surface SHALL remain visually unaffected by the glow directly.

#### Scenario: Traveling border segment
- **WHEN** a user views the Ultra card and motion is not reduced
- **THEN** a short glowing segment moves continuously around the card's border in one direction, with most of the border unlit at any given moment

#### Scenario: Cloud-textured glow, cosmic purple only
- **WHEN** a user views the glow behind the Ultra card
- **THEN** its shape is uneven/irregular rather than a uniform blur, and its color is cosmic purple — never green, blue, or any other hue

#### Scenario: Cloud shape deforms continuously
- **WHEN** a user watches the glow behind the Ultra card over a few seconds, with motion not reduced
- **THEN** the cloud-textured edges visibly shift and breathe rather than holding a single fixed shape

#### Scenario: Glass rim reveals the glow, card body stays clean
- **WHEN** a user views the Ultra card's edge versus its interior
- **THEN** a thin, translucent, blurred rim at the edge shows the glow bleeding through, while the card's interior content sits on an opaque surface unaffected by the glow

#### Scenario: Reduced motion
- **WHEN** the user's system has `prefers-reduced-motion: reduce` set
- **THEN** the Ultra card's border renders as a static, evenly-present soft glow with no traveling segment

### Requirement: Ultra card is visually larger
The Ultra card SHALL occupy more horizontal space than the Lite and Pro cards on desktop, via a real layout size increase rather than a visual-only transform.

#### Scenario: Wider than its siblings
- **WHEN** a user views the three cards on a desktop-width viewport
- **THEN** the Ultra card measures visibly wider than the Lite and Pro cards, and the glow system's border outline matches the Ultra card's actual rendered size

### Requirement: Ultra title treatment
The Ultra card's plan name SHALL render with a continuously shimmering cosmic-to-white gradient, and a "MOST POPULAR" label SHALL appear beside it. No other card's name carries this treatment.

#### Scenario: Gradient sweeps seamlessly
- **WHEN** a user watches the "Ultra" title over several seconds, with motion not reduced
- **THEN** a light gradient sweeps continuously across the letters with no visible jump or reset at the loop point

#### Scenario: Most Popular label
- **WHEN** a user views the Ultra card's title
- **THEN** a small "MOST POPULAR" label appears to the right of the plan name

#### Scenario: Reduced motion
- **WHEN** the user's system has `prefers-reduced-motion: reduce` set
- **THEN** the Ultra title still renders with its gradient coloring, statically, with no sweeping animation

### Requirement: Elevated plan buttons with hover-press
Each card's call-to-action button SHALL use a gradient fill and a layered-shadow elevation effect that reads as popped forward at rest, compressing inward specifically on hover.

#### Scenario: Hover compresses the button
- **WHEN** a user hovers a plan button and motion is not reduced
- **THEN** the button's shadow flattens and the button shifts slightly toward the surface, reading as pressed in

#### Scenario: Click remains distinguishable from hover
- **WHEN** a user clicks (or presses) a plan button while it is already in its hovered state
- **THEN** the button reaches a further, distinguishable pressed state beyond the hover-press alone

#### Scenario: Keyboard focus is independent of hover
- **WHEN** a user tabs to a plan button without hovering it
- **THEN** the button shows a clear focus indicator, independent of the hover-press treatment

### Requirement: Sales contact link
A link reading "or contact our sales manager for other plans" SHALL appear below the pricing cards, pointing at `/contact`.

#### Scenario: Link target
- **WHEN** a user clicks the sales contact link
- **THEN** the browser navigates toward `/contact` (a dead route until it is built, consistent with other not-yet-built destinations already linked elsewhere on the page)

### Requirement: Shared ambient background, no section-specific star mechanic
The section SHALL display the shared ambient star background and the hero's chromatic aberration filter, without introducing a section-wide bespoke star choreography of its own.

#### Scenario: Calm relative to Features and Reviews
- **WHEN** a user scrolls from Reviews into Pricing
- **THEN** the ambient star field and chromatic aberration are present, but no constellation, marquee, or cycling star mechanic spans the section — only the Ultra card carries a bespoke effect
