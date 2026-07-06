## ADDED Requirements

### Requirement: Local infrastructure via Docker Compose
The system SHALL provide a root-level `docker-compose.yml` that provisions Postgres, Redis, and Mailpit services required for local development, startable with a single `docker compose up` command.

#### Scenario: Starting all services
- **WHEN** a developer runs `docker compose up` from the repo root
- **THEN** Postgres, Redis, and Mailpit containers start and become ready to accept connections

#### Scenario: Postgres data persistence
- **WHEN** a developer stops and restarts the services with `docker compose down` followed by `docker compose up`
- **THEN** previously written Postgres data is still present (not lost), because Postgres data is stored in a named Docker volume

#### Scenario: Full data reset
- **WHEN** a developer runs `docker compose down -v`
- **THEN** the Postgres named volume is removed and the next `docker compose up` starts with an empty database

### Requirement: Environment-driven configuration
The system SHALL expose all configurable values (database name/user/password, service ports) as environment variables, with a `.env.example` file at the repo root documenting every variable the compose file and applications require.

#### Scenario: New developer onboarding
- **WHEN** a developer clones the repo and copies `.env.example` to `.env` without modification
- **THEN** `docker compose up` succeeds using the example values as defaults

#### Scenario: Port remapping
- **WHEN** a developer changes a port variable in their local `.env` (e.g. because 5432 is already in use on their machine)
- **THEN** `docker compose up` binds the affected service to the new host port without requiring edits to `docker-compose.yml`

### Requirement: Mail sandbox for outgoing email
The system SHALL run a Mailpit container that captures outgoing SMTP mail sent by the backend during local development, with a web UI to inspect captured messages.

#### Scenario: Inspecting a captured email
- **WHEN** the backend sends an email via SMTP configured to point at the Mailpit service
- **THEN** the email does not leave the local environment and is viewable in Mailpit's web UI
