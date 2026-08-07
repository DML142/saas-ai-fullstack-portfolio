# COS Code — AI SaaS Platform (Production Deployment)

> **Goal:** Ship this project as a fully deployed, production-shaped SaaS
> application — entirely on AWS Free Tier — not as a local-only demo.

---

# Project status

This project is no longer a "learn to code" exercise. The learning-first
phase is done: the feature set described below (auth, RBAC, billing, chat,
uploads, cron, admin panel, import/export, rate limiting, full Docker Compose
stack, unit + integration + E2E tests, CI) is built and verified locally.

The current phase is shipping it: taking a project that only runs via
`docker compose up` on one machine and making it a real, reachable,
monitored deployment.

**`progress.md` is the single source of truth for ongoing progress** —
completed work, decisions, and blockers. It is loaded automatically below.
Update it as work lands. Don't scatter progress notes elsewhere (commit
messages stay short; PRs stay light — see Workflow rules).

`roadmap.md` holds the path to full cloud deployment, step by step.

`tech.md` is a quick-reference sheet for exact versions/services/ports —
not a progress log.

@progress.md

---

# Workflow rules

- **One feature = one branch = one PR.** Never commit directly to `main`.
- **Every feature must include tests.** Unit tests at minimum; add
  integration/E2E coverage when the feature touches infra or an external
  service, matching the existing suites under `apps/backend/test/` and
  `apps/frontend/e2e/`.
- **Backend (NestJS): strict DRY, SOLID, OOP.** Mirror the existing
  module/service/controller/guard boundaries — don't reach around them or
  duplicate logic that already lives in a service.
- **Frontend (Next.js): no change in approach.** Follow the project's
  existing conventions (component structure, state via Zustand, styling via
  Tailwind/shadcn) — see `tech.md` for the current dependency set.
- **AI authors code directly**, backend and frontend alike, on its own
  feature branch, then opens a PR. (The previous "AI gives code in chat, I
  transcribe it by hand" model from the learning phase is retired — the goal
  now is shipping, not line-by-line transcription.)
- **Commit messages:** short, simple, imperative, in English. No elaborate
  multi-paragraph bodies. See Git Commits below for authorship rules.
- **Pull requests:** minimal description, little to no inline review
  comments. Keep each PR scoped to the one feature/branch it belongs to.
- **Communicate with the user in Russian.** Code, comments, commit messages,
  and PR text stay in English.

## Engineering discipline

Adapted from
[multica-ai/andrej-karpathy-skills `CLAUDE.md`](https://github.com/multica-ai/andrej-karpathy-skills/blob/main/CLAUDE.md):

1. **Think before coding.** State assumptions explicitly. If multiple
   interpretations exist, name them instead of picking one silently. If a
   simpler approach exists, say so — push back when warranted.
2. **Simplicity first.** Minimum code that solves the problem. No
   speculative abstraction, no config/flexibility that wasn't asked for, no
   error handling for scenarios that can't happen.
3. **Surgical changes.** Touch only what the task requires. Don't refactor
   or "improve" adjacent code while implementing something else — mention
   dead code you notice, don't delete it unasked.
4. **Goal-driven execution.** Turn a task into a verifiable check ("add X"
   → "write a test proving X, then make it pass") and work against that
   check instead of a vague "make it work."

This reinforces, rather than replaces, the Coding Standards section below.

---

# Git Commits

All commits in this repository are authored by the user (`DML_142`) alone.
Do **not** append any AI-attribution trailer or footer to a commit message —
no `Co-Authored-By: Claude ...` line, no "Generated with Claude Code" line,
no similar mention. This overrides Claude Code's default commit-message
template for this repository. Commit messages follow the existing history's
style: a short imperative subject (`type(scope): summary`), in English, with
no body unless one specific line is genuinely needed — keep them simple, not
a change-log essay.

---

# Coding Standards

Follow:

- SOLID
- DRY
- KISS
- Clean Code
- Feature-based architecture

Avoid unnecessary abstraction. See "Engineering discipline" above for the
practical version of these rules.

## Comments

Write only the **most important comments, in the most important places** — so they don't later have to be removed or rewritten. A comment must earn its place; when in doubt, leave it out.

Rules:

- **Comment the "why", never the "what".** If the code already says what it does, a comment restating it is noise. Reserve comments for reasoning the code can't show: a non-obvious constraint, a deliberate trade-off, a subtle bug being worked around, an invariant that must hold.
- **Only for genuinely hard parts.** Measured geometry, animation-timeline ordering, SSR/hydration constraints, SVG-filter plumbing, auth/token edge cases — things a competent reader couldn't infer at a glance. Ordinary code gets no comment.
- **Keep them short.** One or two lines. No multi-paragraph essays, no walking through every branch.
- **No history and no narration.** Never write what a previous version did, "the old approach", "first attempt", "widened from Npx", or how a value was tuned. Git holds history; the comment describes the code as it is now. This is what keeps comments from going stale.
- **No dead or placeholder comments.** No commented-out code, no `// make it`, `// error here`, `// TODO fix later` left behind. Delete them.
- **When editing, don't leave stale comments.** If a change makes a nearby comment wrong, fix or remove it in the same edit.

The test: every comment left in the code should still be true and still be worth reading a year from now.

---

# Tech Stack

## Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- React Hook Form
- Zod
- GSAP
- Three.js / React Three Fiber / Drei — planned for the constellation effect, not yet a dependency (see `tech.md`)

## Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- Passport
- JWT
- Refresh Tokens
- OAuth (Google)
- WebSockets
- Swagger
- Nodemailer
- class-validator
- class-transformer

See `tech.md` for exact package versions.

> **Email — current state (dev only):** All transactional email (verification,
> password reset) is sent via **Nodemailer through Mailpit**, a local SMTP
> catcher in the Docker stack (`SMTP_HOST=localhost`, `SMTP_PORT=1025`, UI at
> `:8025`). **Nothing is wired to a real email provider yet** — emails never
> leave the machine and never reach an actual inbox; they're only viewable in
> the Mailpit UI. Going to production means pointing the `SMTP_*` env vars at
> a real provider (Gmail SMTP, Resend, Postmark, …) and adding an
> `auth: { user, pass }` block to the transport in `email.processor.ts` (it
> currently sends unauthenticated, which only Mailpit accepts). Tracked in
> `roadmap.md`.

---

## Database

- PostgreSQL

Use:

- relations
- indexes
- migrations
- transactions
- pagination
- soft delete where appropriate

---

## Authentication

Implemented:

- Register
- Login
- Logout
- Refresh Tokens
- Email Verification
- Password Reset
- Google OAuth

---

## Authorization

RBAC implemented via Guards.

Roles:

- User
- Premium
- Admin

---

## Payments

Stripe

Plans (monthly only for now — no yearly yet):

- **Free** — default, no subscription
- **Lite** — $100/mo
- **Pro** — $200/mo
- **Ultra** — $400/mo

Implemented: subscriptions, webhooks, plan upgrades, billing portal.

> **Billing architecture — chosen patterns (portfolio-quality):**
> - **Hosted Stripe Checkout + Billing Portal** (not custom Elements) — minimal PCI scope.
> - **Stripe is the source of truth; the DB is a webhook-synced cache.** Access reads a DB `tier` that ONLY webhook handlers write — never granted from the checkout redirect.
> - **Dedicated `Subscription` Prisma model** (+ `stripeCustomerId` on `User`), not flat fields.
> - **Tier is a separate axis from RBAC role.** `tier` enum `FREE | LITE | PRO | ULTRA` gates features/usage; `Role` (USER/PREMIUM/ADMIN — see `openspec/specs/rbac`) stays for permissions.
> - **Webhook route uses the RAW body** for signature verification (bypass the global body parser) and is **idempotent** (persist processed Stripe event IDs).
> - Key events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`. Grant access by **product**, checking `status`.
> - **Prices live in Stripe**, referenced by env price IDs (`STRIPE_PRICE_LITE/PRO/ULTRA`) — the $ amounts in the pricing UI are marketing copy, not the billed amount.
> - Webhook updates the DB and returns 200 fast, **enqueuing side-effects** (emails, etc.) on the existing BullMQ `email` queue.
> - Tested locally with the **Stripe CLI** (`stripe listen --forward-to`); billing endpoints + webhook get Swagger docs and tests.
> - **Going live** needs real Stripe keys/price IDs and a production webhook endpoint registered in the Stripe dashboard — tracked in `roadmap.md`.

---

## Queues

BullMQ

Jobs:

- send emails
- background processing (simulated chat replies)

Retry failed jobs.

---

## Redis

Use Redis for:

- caching
- rate limiting
- session-related data
- frequently requested resources

> **Security hardening — status:** App-level rate limiting is implemented
> (see `openspec/specs/rate-limiting`). **Not yet implemented, and now a
> pre-deploy concern rather than a someday one:**
>
> - **Cloudflare edge** (DNS → Cloudflare → server) for volumetric DDoS + WAF,
>   once a real domain is pointed at a real deploy target. Optionally
>   **Cloudflare Turnstile** on login/register/forgot-password, verified
>   server-side.
> - Live Stripe keys, live price IDs, a production webhook endpoint.
> - Secrets management on AWS (Secrets Manager or SSM Parameter Store) for
>   both the backend and frontend containers.
>
> Tracked in `roadmap.md`.

---

## WebSockets

Implemented:

- live notifications
- background job completion notifications

---

## Uploads

Implemented: avatar uploads. Validated file size and type (magic-number
check before anything touches disk).

---

## Cron Jobs

Implemented:

- avatar cleanup (orphaned files)
- expired webhook-event cleanup

---

## API Documentation

Swagger, served at `/docs`. Every endpoint documented.

---

## Testing

Implemented:

- Unit Tests
- Integration Tests (real Postgres/Redis via `docker-compose.test.yml`)
- E2E Tests (Playwright, against the full Docker Compose stack)

Every new feature ships with tests — see Workflow rules above.

---

## Docker

`docker compose up --build` runs the entire local stack: frontend, backend,
Postgres, Redis, Mailpit, and a Stripe CLI webhook forwarder. See `tech.md`
for image versions.

---

## CI/CD

GitHub Actions: lint, test, build, integration, and E2E jobs on every
push/PR to `main`. Branch protection enforced (PR required, checks required,
no force-push). **No CD/deploy pipeline yet** — that's the subject of
`roadmap.md`.

---

# Frontend Design — COS Code

The landing page's job: look like something a team spent months on and was scared to ship because of performance risk — then prove it ships fine anyway. Unconventional but not noisy. Every effect below has a cheap, real implementation; none are decorative filler.

## Identity

- **Product**: COS Code — `npm i -g coscode`, then `cos init` in a project. Auto-detects and wires in what an AI coding agent needs (MCP servers, Skills, `.md` context, OpenSpec, CodeRabbit, and other emerging agent-tooling conventions), asking the user only what it can't infer.
- **Palette**: near-black background, white text, a single accent — cosmic purple. No other colors. No gradients-as-decoration.
- **Typography**: Newsreader or a similar high-contrast serif for display/headline text. Restraint elsewhere.
- **Principle**: simple at first glance, unconventional on contact. No Frutiger Aero-style clutter, no unnecessary chrome. The surprise is in behavior, not decoration.

## Effect vocabulary (living list — expect additions)

1. **Hero word-cycler**: `BUILD` stays fixed; the second word cycles — `FASTER → SAFER → SMARTER → FEARLESSLY` — via a vertical slide (word moves up and out, next word slides in from below), giving a sense of motion in and out of space. Text is white; individual letters occasionally stretch briefly on the Y-axis (a few ms) as a glitch-like accent.
2. **Drifting stars**: simple rounded white stars drift right-to-left across the hero, one appearing roughly every 1–10s. Where a star overlaps the hero text, the overlapping pixels invert (white text → black) via `mix-blend-mode: difference` — no canvas readback, no per-pixel JS. This is the general technique for "same-color elements invert on contact" anywhere it recurs.
3. **Chromatic aberration**: a subtle, constant (not interaction-driven) RGB channel-split via an SVG filter (`feOffset` + `feBlend`), scoped **only to the hero section** — not site-wide. Respects `prefers-reduced-motion`.
4. **3D constellation** (below the hero, escalation of the star motif): a node graph illustrating what `cos init` wires together (MCP, Skills, `.md`, OpenSpec, CodeRabbit, etc.), connected by cosmic-purple lines that light up on scroll/hover. Small, fixed node count (8–12). Currently a hand-rolled SVG/DOM implementation (`InitConstellation.tsx`); `react-three-fiber` is the originally planned tech but isn't a dependency yet — see `tech.md`.

## Dashboard (COS Assistant)

Usability-focused, same palette/brand but without the hero's heavy effect layer (no chromatic aberration, no 3D). A lightweight in-browser chat experience, gated by subscription tier — see Application Idea below for what it actually is and isn't.

---

# Application Idea

**COS Code** — a CLI tool positioned as an automatic wrapper for AI coding agents.

`npm i -g coscode`, then `cos init` in a project directory. It inspects the project and automatically selects/wires in the tooling an AI agent needs — MCP servers, Skills, `.md` context files, OpenSpec, CodeRabbit, and similar emerging conventions — asking the user only what it can't infer on its own.

The site markets this CLI tool and hosts a companion SaaS layer around it:

- **Subscription tiers** (Free / Lite $100 / Pro $200 / Ultra $400 per month, via Stripe; monthly only for now) gate advanced features and usage limits.
- **COS Assistant** (dashboard) — a lightweight in-browser chat experience included with paid tiers, similar in spirit to Claude Desktop's chat/project switching or Google AI Studio. Users can create and switch between chats/workspaces, import/export projects.
- **COS Assistant is a preview/demo concept, not a real AI product**: no LLM API is connected, no real code/IDE logic runs. A message is stored in the database, the server waits, then sends back a simulated reply — enough to demonstrate the full chat UX and plumbing (persistence, auth-gated access, WebSockets) without pretending to be a functional AI assistant.
- A **"workspace"** is a route or modal showing per-project state: usage limits, detected config/tool issues, remaining restarts/quota — not a literal coding environment.

This is not intended to compete with real AI coding tools or ChatGPT. The purpose is to demonstrate full-stack architecture and an exceptional frontend, using a coherent fictional product as the vehicle, now shipped as a real deployment rather than a local demo.

---

# Suggested Features

## Landing

- Hero
- Features
- Pricing
- FAQ
- Contact

## Authentication

- Login
- Register
- Forgot Password
- Verify Email

## Dashboard (COS Assistant)

- Sidebar
- Chat/workspace switcher (Claude Desktop-style)
- User profile
- Settings
- Workspace view/modal: usage limits, detected issues, restart/quota state

## Chat (COS Assistant)

No real AI backend — this is a UX/plumbing demo, not a functional assistant:

- message sent → stored in DB → server waits → simulated reply stored and sent back
- chat history
- markdown
- code highlighting
- import/export a chat/workspace

## Subscription

Plans (monthly only for now):

- Free — default, no subscription
- Lite — $100/mo
- Pro — $200/mo
- Ultra — $400/mo

Stripe controls access to COS Assistant and usage limits.

## Admin Panel

Manage:

- users
- subscriptions
- statistics
- queues
