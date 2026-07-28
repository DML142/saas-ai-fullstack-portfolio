## 1. Stripe setup + config [you implement]

- [ ] 1.1 In the Stripe dashboard (test mode): create 3 Products (Lite/Pro/Ultra) each with a monthly recurring Price; note the price IDs
- [ ] 1.2 Install `stripe` (Node SDK); instantiate one Stripe client with a pinned `apiVersion`
- [ ] 1.3 Add env vars + document in `.env.example`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_LITE`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ULTRA`, `STRIPE_PORTAL_RETURN_URL`, checkout success/cancel URLs
- [ ] 1.4 Add a single tier↔priceId map (env-driven) used by both checkout (tier→price) and the webhook (product/price→tier)

## 2. Schema + migration [you implement]

- [ ] 2.1 Add `SubscriptionTier` enum (`FREE LITE PRO ULTRA`) and `User.stripeCustomerId String? @unique`
- [ ] 2.2 Add `Subscription` model (userId unique, stripeSubscriptionId, stripeCustomerId, stripePriceId, tier, status, currentPeriodEnd, cancelAtPeriodEnd, timestamps)
- [ ] 2.3 Add a `ProcessedWebhookEvent` model (Stripe event id, processedAt) for idempotency
- [ ] 2.4 Generate + run the migration; confirm existing users default to effective tier `FREE`

## 3. Billing module + Stripe service [you implement]

- [ ] 3.1 Create a `billing` module (controller + service); inject Prisma and the Stripe client
- [ ] 3.2 `ensureStripeCustomer(userId)` — return the user's `stripeCustomerId`, lazily creating a Stripe Customer (with the user's email + id metadata) on first use
- [ ] 3.3 Helper to derive a user's effective tier from their `Subscription` row (active/trialing → tier, else `FREE`)

## 4. Checkout + portal endpoints [you implement]

- [ ] 4.1 `POST /billing/checkout` (JwtAuthGuard): validate the requested tier via DTO, ensure customer, create a `mode:'subscription'` Checkout Session for the mapped price, return `{ url }`
- [ ] 4.2 `POST /billing/portal` (JwtAuthGuard): create a Billing Portal session for the user's customer, return `{ url }`; reject if the user has no customer yet
- [ ] 4.3 DTOs + class-validator rules for the checkout body (tier must be a configured paid tier)

## 5. Webhook handler [you implement]

- [ ] 5.1 Configure the app so `POST /billing/webhook` receives the RAW body (bypass the global JSON/validation parser for only this route)
- [ ] 5.2 Verify the signature with `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`; reject invalid/missing signatures
- [ ] 5.3 Idempotency: skip events whose id is already in `ProcessedWebhookEvent`; record id on successful handling
- [ ] 5.4 Handle `customer.subscription.created/updated/deleted`: upsert the `Subscription` row and derive tier from product + status (source of truth)
- [ ] 5.5 Handle `checkout.session.completed` (initial provision) and `invoice.paid` / `invoice.payment_failed` (keep status in sync)
- [ ] 5.6 On payment failure / cancellation, enqueue the appropriate email on the existing BullMQ `email` queue; return `200` fast
- [ ] 5.7 Add distinct billing email copy (payment failed, subscription confirmed) in `EmailProcessor`, reusing the themed template

## 6. Tier exposure + gating [you implement]

- [ ] 6.1 Include the effective `tier` in the `GET /auth/me` (and login/register session) payload
- [ ] 6.2 Provide a reusable way to gate access by tier (guard/decorator or service check) for later use by dashboard/chat limits

## 7. Frontend: client + wiring [you implement — backend-integration]

- [ ] 7.1 Add client functions `startCheckout(tier)` and `openBillingPortal()` (guarded → use `authFetch`), following `auth.ts` patterns; both return `{ url }` and the caller redirects
- [ ] 7.2 Add `tier` to `AuthUser`/session type and surface it (mirrors the `emailVerified` addition)

## 8. Frontend: UI touches [AI-authored]

- [ ] 8.1 Wire pricing "Choose <plan>" buttons to `startCheckout(tier)` → redirect to Stripe (auth-gated: send guests to `/login` first)
- [ ] 8.2 Add a "Manage billing" control in the dashboard (settings or account area) → `openBillingPortal()` → redirect
- [ ] 8.3 Checkout success/cancel landing handling: success page shows a brief "finalizing…" state and reads tier from `/auth/me` (which becomes correct once the webhook lands)

## 9. Docs + tests [you implement]

- [ ] 9.1 Swagger-document the billing endpoints (`/billing/checkout`, `/billing/portal`, `/billing/webhook`)
- [ ] 9.2 Tests: signature verification rejects tampered/unsigned payloads and accepts a valid one; idempotency skips a duplicate event; tier derivation (active paid → tier, inactive/none → FREE)

## 10. Verification (Stripe CLI, test mode)

- [ ] 10.1 `stripe listen --forward-to localhost:3000/billing/webhook`; capture the webhook secret into env
- [ ] 10.2 Run a full checkout with a Stripe test card → confirm `customer.subscription.created` lands, `Subscription` row is written, and `/auth/me` reports the paid tier
- [ ] 10.3 `stripe trigger invoice.payment_failed` → confirm status sync + queued email in Mailpit; `stripe trigger customer.subscription.deleted` → confirm tier returns to `FREE`
- [ ] 10.4 Open the billing portal, cancel → confirm the subscription event flips stored state and effective tier
- [ ] 10.5 Re-deliver a processed event → confirm it is acknowledged but not applied twice (idempotency)
