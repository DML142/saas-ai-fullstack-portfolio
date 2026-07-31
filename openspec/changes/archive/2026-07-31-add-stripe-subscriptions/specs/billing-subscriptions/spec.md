## ADDED Requirements

### Requirement: Starting a subscription via hosted checkout
The system SHALL allow an authenticated user to begin a subscription to a paid tier (Lite, Pro, or Ultra) by creating a Stripe-hosted Checkout session, without handling card data itself.

#### Scenario: Authenticated user starts checkout for a paid tier
- **WHEN** an authenticated user requests checkout for a valid paid tier
- **THEN** the system ensures the user has an associated Stripe customer, creates a subscription-mode Checkout session for that tier's configured price, and returns the hosted checkout URL

#### Scenario: Checkout requested for an invalid tier
- **WHEN** a checkout is requested for a tier that is not a configured paid tier
- **THEN** the request is rejected and no Checkout session is created

#### Scenario: Unauthenticated checkout request
- **WHEN** an unauthenticated caller requests checkout
- **THEN** the request is rejected

### Requirement: Stripe as the source of truth for subscription state
The system SHALL treat Stripe as the authoritative source of subscription state and SHALL update the stored subscription and account tier only in response to verified Stripe webhook events, never based solely on the post-checkout redirect.

#### Scenario: Access is not granted from the redirect alone
- **WHEN** a user is redirected back from checkout to the success page
- **THEN** the account tier is not changed by the redirect itself; it changes only once the corresponding Stripe webhook event is processed

#### Scenario: Subscription lifecycle updates the stored state
- **WHEN** a subscription created, updated, or deleted event is received from Stripe
- **THEN** the system records the subscription (Stripe subscription id, customer id, price, status, current period end, cancel-at-period-end) and derives the account tier from the subscription's product and status

### Requirement: Webhook authenticity and idempotency
The system SHALL verify the signature of every Stripe webhook using the raw request body and SHALL process each event at most once, so that unsigned, tampered, or duplicated deliveries do not affect subscription state.

#### Scenario: Valid signed event is accepted
- **WHEN** a webhook arrives with a valid Stripe signature for the configured signing secret
- **THEN** the event is accepted and processed

#### Scenario: Invalid or missing signature is rejected
- **WHEN** a webhook arrives with a missing or invalid signature
- **THEN** the event is rejected and no subscription state changes

#### Scenario: Duplicate event is ignored
- **WHEN** a webhook event whose id has already been processed is delivered again
- **THEN** the event is acknowledged but not applied a second time

#### Scenario: Slow side-effects do not block acknowledgement
- **WHEN** processing an event requires a side-effect such as sending an email
- **THEN** the state change is persisted and the webhook is acknowledged promptly while the side-effect is performed asynchronously

### Requirement: Managing an existing subscription
The system SHALL allow an authenticated user who has a Stripe customer to open the Stripe Billing Portal to update, cancel, or change their subscription.

#### Scenario: Existing customer opens the billing portal
- **WHEN** an authenticated user with an associated Stripe customer requests the billing portal
- **THEN** the system creates a billing portal session for that customer and returns its URL

#### Scenario: Cancellation from the portal is reflected
- **WHEN** a user cancels or changes their plan in the billing portal and Stripe emits the corresponding subscription event
- **THEN** the system updates the stored subscription and the account's effective tier accordingly

### Requirement: Effective tier derivation and exposure
The system SHALL expose the authenticated account's effective subscription tier, where the effective tier is the subscription's tier while its status is active (or trialing) and `FREE` otherwise, and tier SHALL be independent of the account's RBAC role.

#### Scenario: Active paid subscription yields its tier
- **WHEN** an account has a subscription whose status is active for a paid tier
- **THEN** the account's effective tier is that paid tier

#### Scenario: No or inactive subscription yields Free
- **WHEN** an account has no subscription, or its subscription status is not active/trialing
- **THEN** the account's effective tier is `FREE`

#### Scenario: Tier is reported to the authenticated client
- **WHEN** an authenticated client requests its own profile
- **THEN** the response includes the account's effective tier

### Requirement: Failed payments and dunning
The system SHALL react to failed subscription payments by keeping the stored subscription status in sync with Stripe and notifying the user, without prematurely revoking access before Stripe marks the subscription inactive.

#### Scenario: Payment fails on renewal
- **WHEN** a subscription payment fails and Stripe reports the subscription as past due
- **THEN** the stored subscription status is updated and a payment-failure notification is queued to the user

#### Scenario: Subscription becomes inactive after continued failure
- **WHEN** Stripe transitions the subscription to a canceled or unpaid status
- **THEN** the account's effective tier returns to `FREE`
