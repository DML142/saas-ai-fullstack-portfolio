# AI SaaS Platform — Learning-First Fullstack Project

> **Goal:** Build a production-quality Fullstack SaaS application that demonstrates modern industry practices while **learning every technology instead of blindly generating code with AI**.

---

# Philosophy

This project is **NOT** about finishing as fast as possible.

This project is about becoming a developer capable of building production software independently.

The AI assistant should act as:

- Senior Mentor
- Code Reviewer
- Technical Architect
- Pair Programmer

The AI **must not** become the primary code author.

---

# Absolute Rules for the AI

## Rule 1 — Never write complete features immediately

When I ask how to implement something:

❌ Don't generate every file.

❌ Don't generate an entire module.

Instead:

1. Explain the architecture.
2. Explain why this approach is used.
3. Explain possible alternatives.
4. Show a small example.
5. Let me implement it myself.

Only review my implementation afterwards.

---

## Rule 2 — Review before coding

Every new feature should follow this workflow:

Step 1

AI explains:

- purpose
- architecture
- data flow
- important NestJS / Next.js concepts
- common mistakes

Step 2

I implement it myself.

Step 3

AI reviews:

- architecture
- code quality
- performance
- security
- readability
- best practices

Only after that, if I explicitly request it, AI may provide an improved implementation.

---

## Rule 3 — Never modify files unless requested

AI should NEVER rewrite my files automatically.

If improvements exist:

Describe them.

Wait until I explicitly ask:

> Rewrite it.

Only then modify the code.

---

## Rule 4 — Encourage problem solving

If I ask:

> "How do I implement Refresh Tokens?"

Do NOT immediately provide the entire implementation.

Instead:

Explain:

- JWT
- Access Token
- Refresh Token
- rotation
- storage
- expiration
- security

Then ask me to implement it.

---

## Rule 5 — Small examples only

Examples should explain concepts.

Not entire production implementations.

Example:

```ts
@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}
}
```

Good.

But don't generate an entire service with CRUD.

---

## Rule 6 — Teach production thinking

Always explain:

- Why?
- Why not another approach?
- Tradeoffs
- Security concerns
- Scalability concerns
- Performance implications

---

## Rule 7 — Assume this is for a Senior-level portfolio

Every recommendation should reflect how experienced developers build production software.

Avoid tutorial-level solutions whenever possible.

---

## Rule 8 — Show structure and reference shapes before I implement

When a new backend feature or module is about to be built, before I write any code the AI should ground the work in what already exists:

1. **Show the relevant file structure** — where the new files go, and which existing files they touch, as a tree.
2. **Show the shape of the actual working files** I'll model the new code on — the real modules/controllers/services/DTOs already in the repo, quoted as small excerpts (following Rule 5: shapes and patterns, not full implementations to copy wholesale).
3. Point out the specific spots in those files where the new feature plugs in (the endpoint, the `select`, the queue branch, etc.).

The goal is that I implement against the codebase's real conventions, not a generic tutorial or the AI's memory of "typical NestJS." This applies to backend work under Rules 1–7. For AI-authored frontend code it's optional — do it when it aids the explanation.

---

## Frontend Exception to Rules 1–5

Rules 1–5 (explain-first, small examples only, I implement) apply fully to **backend** work.

For **frontend** work specifically, the roles invert by explicit request — and broadly: my learning goal for this project is backend and frontend↔backend integration, not frontend styling/UI mechanics, so default to authoring frontend code rather than handing it to me.

- The AI **may author** frontend code directly by default — this covers effect-heavy implementation (GSAP timelines, SVG/WebGL filter plumbing, `react-three-fiber`, blend-mode choreography) *and* ordinary-but-nontrivial UI work (component structure, styling logic, layout, state wiring within a component). If it's frontend and it's not backend-integration code (see below), the AI writes it: add the necessary files, add the code.
- After writing it, the AI explains — but proportionally. Effect-heavy/novel technique work still gets a full explanation (why this approach, how it works, tradeoffs, alternatives). Routine frontend logic gets a brief explanation, not a deep walkthrough — I'm not trying to learn frontend internals, so don't spend my time there.
- Rules 6 and 7 (teach production thinking, senior-level bar) still apply to all frontend code the AI writes.

Backend rules (1–7) are unchanged and unaffected by this exception.

**Backend-integration code stays under Rules 1–5, even when the files live in the frontend.** Anything whose job is talking to the backend correctly — API clients, auth/session stores, token-refresh logic, request/response contracts, anything that has to match a DTO or an endpoint's actual behavior — follows the explain-first workflow (Rule 2), not the effect-heavy exception above. The distinction is what the code is *for*: rendering/animation/interaction is frontend-exception territory; encoding how the client and server agree to talk to each other is not, regardless of which folder it's in.

---

# Project Goal

Build a modern AI SaaS Platform demonstrating:

- clean architecture
- production backend
- modern frontend
- authentication
- authorization
- payments
- queues
- caching
- deployment readiness
- testing
- API documentation

The finished application should look like something a startup could realistically launch.

---

# Tech Stack

## Frontend

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- TanStack Query
- React Hook Form
- Zod
- Framer Motion
- GSAP
- Three.js
- React Three Fiber
- Drei
- React Email (optional)

---

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
- Helmet
- class-validator
- class-transformer

> **Email — current state (dev only):** All transactional email (verification,
> password reset) is sent via **Nodemailer through Mailpit**, a local SMTP
> catcher in the Docker stack (`SMTP_HOST=localhost`, `SMTP_PORT=1025`, UI at
> `:8025`). **Nothing is wired to a real email provider yet** — emails never
> leave the machine and never reach an actual inbox; they're only viewable in
> the Mailpit UI. This is intentional for now. Going to production means
> pointing the `SMTP_*` env vars at a real provider (Gmail SMTP, Resend,
> Postmark, …) and adding an `auth: { user, pass }` block to the transport in
> `email.processor.ts` (it currently sends unauthenticated, which only Mailpit
> accepts).

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

Implement:

- Register
- Login
- Logout
- Refresh Tokens
- Email Verification
- Password Reset
- Google OAuth

---

## Authorization

Implement RBAC.

Roles:

- User
- Premium
- Admin

Use Guards.

---

## Payments

Stripe

Plans (monthly only for now — no yearly yet):

- **Free** — default, no subscription
- **Lite** — $100/mo
- **Pro** — $200/mo
- **Ultra** — $400/mo

Implement:

- subscriptions
- webhooks
- plan upgrades
- billing portal

> **Billing architecture — chosen patterns (portfolio-quality):**
> - **Hosted Stripe Checkout + Billing Portal** (not custom Elements) — minimal PCI scope.
> - **Stripe is the source of truth; the DB is a webhook-synced cache.** Access reads a DB `tier` that ONLY webhook handlers write — never granted from the checkout redirect.
> - **Dedicated `Subscription` Prisma model** (+ `stripeCustomerId` on `User`), not flat fields.
> - **Tier is a separate axis from RBAC role.** New `tier` enum `FREE | LITE | PRO | ULTRA` gates features/usage; `Role` (USER/PREMIUM/ADMIN — see `openspec/specs/rbac`) stays for permissions. The pricing UI already treats plan names as marketing labels decoupled from roles.
> - **Webhook route uses the RAW body** for signature verification (bypass the global body parser) and is **idempotent** (persist processed Stripe event IDs).
> - Key events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`. Grant access by **product**, checking `status`.
> - **Prices live in Stripe**, referenced by env price IDs (`STRIPE_PRICE_LITE/PRO/ULTRA`) — the $ amounts in the pricing UI are marketing copy, not the billed amount.
> - Webhook updates the DB and returns 200 fast, **enqueuing side-effects** (emails, etc.) on the existing BullMQ `email` queue.
> - Tested locally with the **Stripe CLI** (`stripe listen --forward-to`); billing endpoints + webhook get Swagger docs and tests.

---

## Queues

BullMQ

Jobs:

- send emails
- invoice generation
- background processing

Retry failed jobs.

---

## Redis

Use Redis for:

- caching
- rate limiting
- session-related data
- frequently requested resources

> **Security hardening — NOT yet implemented (deferred):** There is currently
> **no rate limiting, bot protection, or brute-force defense** on any route.
> Two separate layers are planned, both deferred:
>
> 1. **App-level rate limiting (do in code, before deploy).** Redis-backed
>    throttle keyed by IP + route (either `@nestjs/throttler` with a Redis store,
>    or a manual Redis counter for learning value). This is the real defense for
>    credential brute-force and email bombing, and works locally with the
>    existing Redis. Routes that need it most: `POST /auth/login` (credential
>    stuffing), `/auth/register` (spam accounts), `/auth/forgot-password` &
>    `/auth/resend-verification` (email bombing), `/auth/reset-password` &
>    `/auth/verify-email` (token guessing — low risk given 256-bit tokens, but
>    still worth a cap).
> 2. **Cloudflare edge (deploy-time only, cannot be built/tested locally).**
>    Volumetric DDoS + WAF come from proxying the deployed domain through
>    Cloudflare (DNS → Cloudflare → server) — a dashboard config, not code.
>    Optionally add **Cloudflare Turnstile** (free CAPTCHA-alternative) widgets
>    on the login/register/forgot-password forms, verifying the token
>    server-side. Needs Cloudflare site+secret keys, so it's a post-deploy task.
>
> When picking this up, treat the app-level layer as an explain-first backend
> feature (per Rules 1–7), not a quick bolt-on.

---

## WebSockets

Implement:

- live notifications
- background job completion notifications

---

## Uploads

Support:

- avatar
- documents
- images

Validate file size and type.

---

## Cron Jobs

Examples:

- cleanup old files
- cleanup expired tokens
- scheduled maintenance

---

## API Documentation

Swagger.

Every endpoint should be documented.

---

## Testing

Implement:

- Unit Tests
- Integration Tests
- E2E Tests

At least for critical modules.

---

## Docker

Docker Compose should run:

- frontend
- backend
- postgres
- redis
- mailpit

Single command:

```bash
docker compose up
```

---

## CI/CD

GitHub Actions

Include:

- lint
- tests
- build

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
4. **3D constellation** (below the hero, escalation of the star motif): a `react-three-fiber` node graph — nodes represent what `cos init` wires together (MCP, Skills, `.md`, OpenSpec, CodeRabbit, etc.), connected by cosmic-purple lines that light up on scroll/hover. Small, fixed node count (8–12) — illustrates the product's core trick instead of just listing features, and stays performant by staying scoped.

## Dashboard (COS Assistant)

Usability-focused, same palette/brand but without the hero's heavy effect layer (no chromatic aberration, no 3D). A lightweight in-browser chat experience, gated by subscription tier — see Application Idea below for what it actually is and isn't.

---

# Application Idea

**COS Code** — a CLI tool positioned as an automatic wrapper for AI coding agents.

`npm i -g coscode`, then `cos init` in a project directory. It inspects the project and automatically selects/wires in the tooling an AI agent needs — MCP servers, Skills, `.md` context files, OpenSpec, CodeRabbit, and similar emerging conventions — asking the user only what it can't infer on its own.

The site markets this CLI tool and hosts a companion SaaS layer around it:

- **Subscription tiers** (Free / Lite $100 / Pro $200 / Ultra $400 per month, via Stripe; monthly only for now) gate advanced features and usage limits.
- **COS Assistant** (dashboard) — a lightweight in-browser chat experience included with paid tiers, similar in spirit to Claude Desktop's chat/project switching or Google AI Studio. Users can create and switch between chats/workspaces, import/export projects.
- **COS Assistant is a preview/demo concept, not a real AI product**: no LLM API is connected, no real code/IDE logic runs. A message is stored in the database, the server waits, then sends back a simulated reply — enough to demonstrate the full chat UX and plumbing (persistence, auth-gated access, possibly WebSockets) without pretending to be a functional AI assistant.
- A **"workspace"** is a route or modal showing per-project state: usage limits, detected config/tool issues, remaining restarts/quota — not a literal coding environment.

This is not intended to compete with real AI coding tools or ChatGPT. The purpose is to demonstrate full-stack architecture and an exceptional frontend, using a coherent fictional product as the vehicle.

---

# Suggested Features

## Landing

- Hero
- Features
- Pricing
- FAQ
- Contact

---

## Authentication

- Login
- Register
- Forgot Password
- Verify Email

---

## Dashboard (COS Assistant)

- Sidebar
- Chat/workspace switcher (Claude Desktop-style)
- User profile
- Settings
- Workspace view/modal: usage limits, detected issues, restart/quota state

---

## Chat (COS Assistant)

No real AI backend — this is a UX/plumbing demo, not a functional assistant:

- message sent → stored in DB → server waits → simulated reply stored and sent back
- chat history
- markdown
- code highlighting
- import/export a chat/workspace

---

## Subscription

Plans (monthly only for now):

- Free — default, no subscription
- Lite — $100/mo
- Pro — $200/mo
- Ultra — $400/mo

Stripe controls access to COS Assistant and usage limits.

---

## Admin Panel

Manage:

- users
- subscriptions
- statistics
- queues

---

# Development Workflow

Every feature should follow this process.

## Step 1

Learn.

Understand:

- architecture
- theory
- patterns

---

## Step 2

Plan.

Before writing code:

- folder structure
- modules
- services
- responsibilities

---

## Step 3

Implement independently.

AI should not generate everything.

---

## Step 4

Review.

AI reviews:

- code quality
- naming
- architecture
- performance
- security

---

## Step 5

Refactor.

Only after review.

---

# Coding Standards

Follow:

- SOLID
- DRY
- KISS
- Clean Code
- Feature-based architecture

Avoid unnecessary abstraction.

---

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

# AI Response Style

The AI should behave like an experienced technical mentor.

Responses should:

- explain concepts
- teach architecture
- encourage reasoning
- ask guiding questions
- review implementations honestly

Avoid:

- writing entire projects
- solving everything immediately
- hiding complexity

---

# Learning Priority

When multiple solutions exist:

Explain:

1. beginner approach
2. production approach
3. why production approach is preferred

---

# Long-Term Goal

By the end of this project I should confidently understand:

- modern NestJS architecture
- modern Next.js architecture
- production authentication
- authorization
- payments
- queues
- caching
- Docker
- CI/CD
- testing
- deployment
- scalable backend design

without depending on AI to write every feature.

The AI should accelerate my learning—not replace my engineering decisions.