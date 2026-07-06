## ADDED Requirements

### Requirement: Prisma-based database connection
The backend SHALL connect to Postgres using Prisma Client, configured via a `DATABASE_URL` environment variable, with the generated client available for injection throughout the application.

#### Scenario: Successful connection on startup
- **WHEN** the backend application starts with a valid `DATABASE_URL` pointing at a running Postgres instance
- **THEN** the Prisma-backed connection is established without error before the application begins accepting requests

#### Scenario: Schema migrations are versioned
- **WHEN** a developer runs the Prisma migration command against the schema
- **THEN** a versioned migration file is created and applied to the target database, leaving a repeatable history of schema changes

### Requirement: Managed connection lifecycle
The backend SHALL tie the Prisma connection's lifecycle to the NestJS application lifecycle, connecting on module initialization and disconnecting on module destruction.

#### Scenario: Clean shutdown
- **WHEN** the NestJS application is shut down (e.g. process termination)
- **THEN** the Prisma connection is explicitly closed rather than left open

### Requirement: Database health-check endpoint
The backend SHALL expose an HTTP endpoint that verifies database connectivity by executing a real query through Prisma, distinct from a bare "process is running" check.

#### Scenario: Database reachable
- **WHEN** a client sends a GET request to the health endpoint while Postgres is reachable and credentials are valid
- **THEN** the endpoint returns a success response indicating the database query succeeded

#### Scenario: Database unreachable
- **WHEN** a client sends a GET request to the health endpoint while Postgres is not reachable (e.g. container stopped)
- **THEN** the endpoint returns an error response that reflects the failed database check, rather than a generic unhandled exception
