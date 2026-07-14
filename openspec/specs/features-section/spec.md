# features-section Specification

## Purpose

Defines the landing page's features section — the first place the product is actually explained, sitting below the hero and targeted by the navbar's `#features` anchor. Two parts: a full-screen constellation showing how `cos init` wires tooling together, and a scroll-driven pillar of feature-stars covering what the product does.

## Requirements

### Requirement: Init constellation (Part 1)
The system SHALL render a full-screen section headed "One Command, Fully Wired" containing a real constellation — the Big Dipper, plotted from catalogue coordinates — whose seven stars are labeled: `cos init` at Megrez, where the handle meets the bowl, and the six tools it auto-wires (MCP, CodeRabbit, Agent, OpenSpec, Skills, `.md` context) at the remaining stars.

#### Scenario: Real constellation structure
- **WHEN** a user scrolls to the init section
- **THEN** the seven stars are joined by the Big Dipper's own figure — a closed four-star bowl and a three-star handle — with every star reaching `cos init` along that figure

#### Scenario: Stars are static
- **WHEN** the section is in view
- **THEN** the stars themselves do not move, drift, or parallax; only the connecting lines carry a slow ambient breathe, which does not depend on scroll position

### Requirement: Feature-stars scroll pillar (Part 2)
The system SHALL render a section headed "COS Code Features" containing four glowing feature-stars — FAST INIT, CLI TOOL, IN-BROWSER WORKSPACE / COS CLOUD, IMPORT / EXPORT — each with a title and description, connected as a single chain: star 1 to star 2, star 2 to star 3, star 3 to star 4. No star connects to more than one other star, so the path never forks.

#### Scenario: Chained connections
- **WHEN** a user views the feature pillar
- **THEN** connector lines link star 1 to star 2, star 2 to star 3, and star 3 to star 4 — no other connections, and no star has more than one outgoing line

#### Scenario: Scroll-linked reveal
- **WHEN** the user scrolls down through the section and motion is not reduced
- **THEN** feature-stars and their connecting lines reveal progressively in scroll order (glow activation, not a color-fill), tied to scroll position

#### Scenario: Strictly sequential line drawing
- **WHEN** a connector line is drawing as the user scrolls
- **THEN** it finishes drawing completely before the next line in the chain begins — the reveals never overlap

#### Scenario: Fake-3D text treatment
- **WHEN** feature-star text is displayed
- **THEN** it carries a subtle CSS perspective/warp treatment that reads as tilted in space, implemented without WebGL

### Requirement: Ambient star background with parallax
The section SHALL display a dim ambient star background behind both parts — visually quieter than the hero's star field and without its blend-mode inversion — that translates slower than the foreground content while scrolling (parallax).

#### Scenario: Figure/ground separation
- **WHEN** foreground content (connectors, labels, feature text in light cosmic-purple) overlaps background stars (dim white)
- **THEN** the foreground remains clearly distinguishable — background stars never invert or visually merge with foreground content

#### Scenario: Parallax depth
- **WHEN** the user scrolls through the section and motion is not reduced
- **THEN** the background star layer moves slower than the foreground content, producing a depth effect

### Requirement: Reduced-motion accessibility
The section SHALL remain fully readable under `prefers-reduced-motion: reduce`: all stars, labels, connectors, and feature copy visible in their final state, with ambient drift, scroll-scrubbed reveals, and parallax disabled.

#### Scenario: Reduced motion
- **WHEN** the user's system has `prefers-reduced-motion: reduce` set
- **THEN** both parts render complete and static — no content is hidden behind scroll-triggered reveals, and no ambient/parallax motion plays
