## MODIFIED Requirements

### Requirement: Local infrastructure via Docker Compose
The system SHALL provide a root-level `docker-compose.yml` that provisions
Postgres, Redis, Mailpit, the backend API, the frontend app, and a Stripe CLI
webhook forwarder required for local development, startable with a single
`docker compose up` command with no local Node/pnpm install required.

#### Scenario: Starting all services
- **WHEN** a developer runs `docker compose up` from the repo root
- **THEN** Postgres, Redis, Mailpit, backend, frontend, and the Stripe CLI
  forwarder all start, and the backend and frontend become reachable on
  their configured host ports once Postgres and Redis report healthy

#### Scenario: Postgres data persistence
- **WHEN** a developer stops and restarts the services with `docker compose down` followed by `docker compose up`
- **THEN** previously written Postgres data is still present (not lost), because Postgres data is stored in a named Docker volume

#### Scenario: Full data reset
- **WHEN** a developer runs `docker compose down -v`
- **THEN** the Postgres named volume is removed and the next `docker compose up` starts with an empty database

#### Scenario: Backend waits for its dependencies
- **WHEN** the `backend` service starts
- **THEN** it does not attempt to connect to Postgres or Redis until both
  report healthy, and it runs pending Prisma migrations before accepting
  requests

#### Scenario: Building from source
- **WHEN** a developer runs `docker compose up --build`
- **THEN** the backend and frontend images are built via multi-stage
  Dockerfiles that produce a slim runtime image without dev dependencies or
  build toolchains

### Requirement: Environment-driven configuration
The system SHALL expose all configurable values (database name/user/password, service ports, container network URLs) as environment variables, with a `.env.example` file at the repo root documenting every variable the compose file and applications require, including which values are server-to-server (container-network hostnames) versus browser-facing (must remain host-reachable).

#### Scenario: New developer onboarding
- **WHEN** a developer clones the repo and copies `.env.example` to `.env` without modification
- **THEN** `docker compose up` succeeds using the example values as defaults

#### Scenario: Port remapping
- **WHEN** a developer changes a port variable in their local `.env` (e.g. because 5432 is already in use on their machine)
- **THEN** `docker compose up` binds the affected service to the new host port without requiring edits to `docker-compose.yml`

#### Scenario: Browser-facing URLs stay host-reachable
- **WHEN** the backend runs inside the Compose network and issues a redirect, an emailed link, or a Stripe Checkout/Portal URL
- **THEN** that URL points at a `localhost`-reachable host port, never a container-network hostname the user's browser cannot resolve

### Requirement: Mail sandbox for outgoing email
The system SHALL run a Mailpit container that captures outgoing SMTP mail sent by the backend during local development, with a web UI to inspect captured messages.

#### Scenario: Inspecting a captured email
- **WHEN** the backend sends an email via SMTP configured to point at the Mailpit service
- **THEN** the email does not leave the local environment and is viewable in Mailpit's web UI

## ADDED Requirements

### Requirement: Stripe webhook forwarding via Compose
The system SHALL run a Stripe CLI container that forwards Stripe test-mode webhook events to the backend's webhook endpoint automatically when the stack starts, authenticated headlessly via an API key environment variable.

#### Scenario: Webhook events reach the backend without a manual command
- **WHEN** a developer runs `docker compose up` and triggers a Stripe test-mode event (e.g. a Checkout completion)
- **THEN** the event is forwarded by the `stripe` service to the backend's `/billing/webhook` endpoint without the developer having run `stripe listen` by hand

#### Scenario: Webhook signing secret is stable across restarts
- **WHEN** a developer captures the signing secret once via `stripe listen --print-secret` for the configured forward target and stores it as `STRIPE_WEBHOOK_SECRET` in `.env`
- **THEN** that secret remains valid across `docker compose down` / `docker compose up` cycles without needing to be re-captured
