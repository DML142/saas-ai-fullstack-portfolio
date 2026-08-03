## ADDED Requirements

### Requirement: End-to-end coverage of the registration and login journey
The system SHALL provide an E2E test that drives a real browser through
registration, email verification via the Mailpit-caught email, and login,
against the full containerized stack.

#### Scenario: New user registers, verifies, and logs in
- **WHEN** a browser session submits the registration form with a new
  email, retrieves the verification link from the Mailpit API, navigates to
  it, and then submits the login form with the same credentials
- **THEN** the session ends authenticated and lands on the dashboard, with
  each intermediate step (registration success, verification success, login
  success) observable in the UI or via the backend's real database state

### Requirement: End-to-end coverage of the checkout-to-tier-flip journey
The system SHALL provide an E2E test that drives a checkout flow and
verifies the resulting Stripe webhook flips the user's effective tier in
the database.

#### Scenario: Webhook event flips the user's tier
- **WHEN** an authenticated test user's Checkout session is simulated via a
  Stripe CLI test-mode event forwarded through the running webhook
  endpoint
- **THEN** the user's effective tier, as returned by `/auth/me`, reflects
  the subscribed plan once the webhook has been processed, without the
  tier ever being set by anything other than the webhook handler

### Requirement: End-to-end coverage of the chat send-and-reply journey
The system SHALL provide an E2E test that sends a chat message through the
UI and verifies the simulated reply arrives over the real WebSocket
connection.

#### Scenario: Sent message receives a simulated reply
- **WHEN** an authenticated test user submits a message in the chat UI
- **THEN** the message appears in the conversation immediately, and a
  simulated assistant reply is delivered and rendered without a page reload,
  sourced from the real BullMQ job and WebSocket delivery path

### Requirement: E2E suite runs against the full containerized stack
The system SHALL run E2E specs against the same Docker Compose stack used
for local development and deployment-style builds, not against a
lightweight or mocked dev server.

#### Scenario: E2E run requires the full stack
- **WHEN** the E2E test command is invoked
- **THEN** it targets the frontend's containerized URL and fails clearly if
  the full stack (frontend, backend, Postgres, Redis, Mailpit, Stripe CLI
  forwarder) is not reachable, rather than silently falling back to a
  different server
