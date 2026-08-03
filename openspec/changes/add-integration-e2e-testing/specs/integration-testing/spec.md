## ADDED Requirements

### Requirement: Isolated test infrastructure
The system SHALL provide a Postgres and Redis instance dedicated to
integration tests, isolated from the development stack's data, startable
independently of the development Compose stack.

#### Scenario: Test stack runs alongside dev stack
- **WHEN** a developer runs the test Compose profile while the development
  `docker compose up` stack is already running
- **THEN** both stacks start successfully on distinct ports with no
  container name or port conflict, and no data from either stack is visible
  to the other

#### Scenario: Test database starts empty
- **WHEN** the test Compose profile is started
- **THEN** pending Prisma migrations are applied to the test database and no
  rows exist in any application table until a test creates them

### Requirement: Integration specs exercise real HTTP requests against real infrastructure
The system SHALL provide integration specs that boot the real application
module and issue real HTTP requests through Supertest, backed by the test
Postgres and Redis instances, for each of the auth, billing, chat, users,
and admin modules.

#### Scenario: Integration spec hits a real database
- **WHEN** an integration spec sends a request that reads or writes data
  (e.g. registering a user)
- **THEN** the request is served by the real application stack and the
  resulting state is verifiable by querying the test Postgres database
  directly, with no mocked Prisma or Redis provider involved

#### Scenario: Integration spec catches a validation-pipeline defect
- **WHEN** an integration spec sends a request relying on global pipes,
  guards, or interceptors (e.g. a paginated admin list request with numeric
  query params)
- **THEN** the response reflects the actual behavior of the fully wired
  application, including any global `ValidationPipe` transform behavior,
  not a test-only bypass

### Requirement: Integration specs run independently of unit and E2E suites
The system SHALL provide a separate test command and Jest configuration for
integration specs, distinct from the existing unit test and Nest e2e-spec
commands.

#### Scenario: Running integration tests does not run unit tests
- **WHEN** a developer runs the integration test command
- **THEN** only files matching the integration spec naming convention
  execute, and existing unit tests and `app.e2e-spec.ts` are not run

#### Scenario: Integration test run cleans up its own data
- **WHEN** an integration spec file completes
- **THEN** any rows it created in the test database are removed, leaving no
  residual state for subsequent spec files
