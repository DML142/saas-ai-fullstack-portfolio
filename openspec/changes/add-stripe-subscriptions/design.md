## Context

The app already has: NestJS + Prisma + PostgreSQL, Redis, a working BullMQ `email` queue and `EmailProcessor`, JWT auth with refresh-token rotation, an RBAC `Role` enum (`USER | PREMIUM | ADMIN`), and a frontend pricing section whose `Lite / Pro / Ultra` names are explicitly documented as marketing labels decoupled from roles. There is no payment integration of any kind. This design adds Stripe-backed subscriptions using Stripe's hosted surfaces so the app never handles card data.

## Goals / Non-Goals

**Goals:**
- Let an authenticated user subscribe to Lite / Pro / Ultra (monthly) and manage/cancel billing.
- Keep an accurate `tier` on the account that reflects Stripe reality, updated by webhooks, usable to gate features and usage.
- Treat Stripe as the source of truth; the DB is a webhook-synced cache.
- Production-correct webhook handling: raw-body signature verification + idempotency.
- Reuse the existing BullMQ `email` queue for billing emails.

**Non-Goals:**
- Yearly/annual billing, coupons, proration UI, tax handling, multiple seats — future work.
- A custom card form (Stripe Elements) — hosted Checkout is used instead.
- Changing RBAC roles or the auth/refresh design.
- Real usage metering/enforcement logic beyond exposing `tier` (the actual per-tier limits are a separate feature).

## Decisions

### 1. Hosted Stripe Checkout + Billing Portal (not Elements)
Card entry, SCA, and subscription management are handled on Stripe-hosted pages. **Why:** minimal PCI scope, far less code, and Stripe maintains the payment UI. **Alternative considered:** Stripe Elements (embedded card form) — rejected: more compliance surface and UI work for no portfolio benefit.

### 2. Stripe is the source of truth; DB `tier` is written ONLY by webhooks
Access control reads a persisted `tier`; that column is mutated exclusively by the webhook handler reacting to `customer.subscription.*` / `invoice.*` events. **Why:** the checkout redirect is spoofable/abandonable and subscriptions change asynchronously (failed renewals, portal cancellations). **Alternative considered:** grant tier on the `success_url` redirect — rejected as the classic drift/security bug.

### 3. Data model — dedicated `Subscription` model + `stripeCustomerId` on `User`
```
User.stripeCustomerId  String? @unique      // created lazily at first checkout

enum SubscriptionTier { FREE LITE PRO ULTRA }

model Subscription {
  id                   String  @id @default(cuid())
  userId               String  @unique       // one active subscription per user
  user                 User    @relation(...)
  stripeSubscriptionId String  @unique
  stripeCustomerId     String
  stripePriceId        String
  tier                 SubscriptionTier
  status               String                 // Stripe status: active, past_due, canceled, ...
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean @default(false)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```
The account's effective tier = the `Subscription.tier` when `status` is active/trialing, else `FREE`. **Why a separate model:** mirrors Stripe's object model, preserves billing state, and keeps `User` lean. **Alternative:** flat `tier`/`stripeSubId` columns on `User` — rejected: loses structure and history.

### 4. `tier` is a separate axis from RBAC `Role`
`SubscriptionTier` gates paid features/usage; `Role` (USER/ADMIN) governs permissions. They are orthogonal — an ADMIN can be FREE, a USER can be ULTRA. **Why:** billing status and authorization are different concerns; the pricing UI already assumes this separation. **Alternative:** reuse `PREMIUM` role for "any paid" — rejected: can't distinguish Lite/Pro/Ultra, and conflates the axes.

### 5. Prices live in Stripe; mapped by env price IDs
Create Products/Prices in the Stripe dashboard; map `tier ↔ STRIPE_PRICE_LITE|PRO|ULTRA` via env. The webhook maps an incoming subscription's **product** (not price) → tier. **Why:** amounts, currency, and future price changes belong in Stripe, not code; the UI's dollar figures are marketing copy. **Alternative:** hardcode amounts/tier logic in code — rejected: drift and env-per-environment pain.

### 6. Webhook route: raw body + signature verification + idempotency
The `/billing/webhook` route receives the **raw** request body (global `ValidationPipe`/JSON parser bypassed for just this path) so `stripe.webhooks.constructEvent()` can verify the signature against `STRIPE_WEBHOOK_SECRET`. Each event's `id` is recorded (a `ProcessedWebhookEvent` table or equivalent) and re-delivered events are skipped. **Why:** Stripe signs the raw bytes and delivers at-least-once, out of order. **Alternative:** trust parsed JSON / no dedup — rejected: signature fails on parsed body, and replays double-apply.

### 7. Handler does DB sync fast, enqueues slow work
The webhook updates the `Subscription`/`tier` and returns `200` quickly; emails (payment failed, subscription confirmed) are enqueued on the existing BullMQ `email` queue. **Why:** Stripe retries on slow/failed responses; keep the handler tight. Reuses existing infra.

### 8. Endpoints
- `POST /billing/checkout` (JwtAuthGuard): body `{ tier }` → ensure/create Stripe Customer → create Checkout Session (`mode: 'subscription'`, mapped price, customer) → return `{ url }`.
- `POST /billing/portal` (JwtAuthGuard): create Billing Portal session for the user's customer → return `{ url }`.
- `POST /billing/webhook` (public, raw body): verify signature, dedup, apply state.
- `tier` is added to the `GET /auth/me` / session payload so the frontend can gate UI.

### 9. Local testing via Stripe CLI
`stripe listen --forward-to localhost:3000/billing/webhook` provides the webhook secret and forwards events; `stripe trigger` simulates lifecycle events. Documented as a dev step (not added to `docker compose`, since the CLI authenticates to a personal Stripe test account).

## Risks / Trade-offs

- **Raw-body misconfiguration breaks signature checks** → scope the raw body to only the webhook path; add a test that a tampered/unsigned payload is rejected and a correctly-signed one is accepted.
- **Out-of-order / duplicate events cause wrong tier** → idempotency by event id + always derive tier from the event's current `status`/product rather than assuming sequence.
- **Checkout completes but subscription webhook lags** → tier flips on the webhook, not the redirect; the success page shows a "finalizing" state and reads tier from `/auth/me`, which becomes correct once the event lands.
- **Test vs live keys / price IDs mismatch** → all Stripe identifiers come from env; document a `.env.example` block and keep test-mode keys locally.
- **Stripe API version drift** → pin the SDK and set an explicit `apiVersion` on the client so behavior is reproducible.

## Migration Plan
- Additive Prisma migration: `SubscriptionTier` enum, `Subscription` table, `ProcessedWebhookEvent` table, `User.stripeCustomerId`. Existing users default to effective tier `FREE` (no `Subscription` row).
- No destructive changes; rollback = drop the new tables/column (no existing data depends on them).
- Deployment: register the webhook endpoint + secret in the Stripe dashboard for the deployed URL (local dev uses the Stripe CLI).

## Open Questions
- Should the effective tier be **denormalized** onto `User.tier` for cheap reads, or always derived from the `Subscription` row? (Leaning: derive via a small service method to avoid a second source of truth; revisit if read volume warrants a cached column.)
- Do downgrades take effect **immediately** or at `currentPeriodEnd`? (Leaning: honor Stripe/portal behavior — at period end — and rely on `cancelAtPeriodEnd`/`currentPeriodEnd`.)
