## Why

The pricing UI (Lite $100 / Pro $200 / Ultra $400 per month) and the plan-gated dashboard already exist, but nothing behind them is real — there is no payment provider, no subscription state, and no enforcement. Adding Stripe turns the fictional tiers into an actual billing system, which is the core SaaS pillar this portfolio is missing.

## What Changes

- Introduce **Stripe subscriptions** via **hosted Stripe Checkout** and the **Billing Portal** — no card data touches our servers.
- Add a subscription **`tier`** axis (`FREE | LITE | PRO | ULTRA`) to the account, kept in sync with Stripe by webhooks and used to gate features/usage. `tier` is separate from the RBAC `Role`.
- Add a **`Subscription`** record (and `stripeCustomerId` on `User`) as a webhook-synced cache of Stripe's state — Stripe remains the source of truth.
- Add backend endpoints to **start a checkout session**, **open the billing portal**, and **receive Stripe webhooks** (raw-body, signature-verified, idempotent).
- Wire the pricing/dashboard UI "Choose plan" / "Manage billing" actions to these endpoints (backend-integration on the frontend side).
- Enqueue billing **side-effect emails** (payment failed, subscription confirmation) on the existing BullMQ `email` queue.
- Monthly billing only for now — **no yearly** (noted as future work).

## Capabilities

### New Capabilities
- `billing-subscriptions`: How a user starts a paid subscription, how the app learns about and stores subscription state from Stripe (checkout, webhooks, billing portal), and how the account's `tier` is derived, exposed, and enforced.

### Modified Capabilities
<!-- No existing spec's REQUIREMENTS change. Tier gating is new behavior captured in
     the new capability above; RBAC roles (user-auth / rbac specs) are unchanged. -->

## Impact

- **Backend:** new `billing` module (controller + service + Stripe client + webhook handler); Prisma schema gains `Subscription` model, `SubscriptionTier` enum, and `User.stripeCustomerId` (migration). New env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_LITE`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ULTRA`, `STRIPE_PORTAL_RETURN_URL`.
- **Webhook raw body:** the global body parser must be bypassed for the webhook route so Stripe signature verification sees the raw payload.
- **Frontend:** pricing "Choose plan" and a dashboard "Manage billing" control call the new endpoints; `AuthUser`/session gains `tier`.
- **Dependencies:** `stripe` (Node SDK) on the backend; Stripe CLI as a local dev tool for webhook testing.
- **Docs/tests:** Swagger for the billing endpoints; tests for the webhook handler and tier derivation.
