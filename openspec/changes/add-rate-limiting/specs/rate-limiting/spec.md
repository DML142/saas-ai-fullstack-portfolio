## ADDED Requirements

### Requirement: Redis-backed fixed-window request counter
The system SHALL provide a reusable mechanism to count requests per key
within a fixed time window, backed by Redis, incrementing atomically and
expiring the counter automatically after the window elapses.

#### Scenario: First request in a window
- **WHEN** a request is the first one recorded for a given key within its
  configured window
- **THEN** the counter for that key is set to 1 and expires automatically
  after the configured window duration

#### Scenario: Subsequent request within the same window
- **WHEN** a request is recorded for a key that already has a counter value
  within its still-active window
- **THEN** the counter is incremented atomically and its existing expiry is
  left unchanged

### Requirement: Route-level rate-limit guard
The system SHALL provide a guard, configurable per route via a decorator
with a request limit and window duration, that rejects requests exceeding
the configured limit for the combination of route and client IP address.

#### Scenario: Request within the limit
- **WHEN** a client sends a request to a rate-limited route and their
  request count for that route within the current window is at or below the
  configured limit
- **THEN** the request is allowed through to the route handler

#### Scenario: Request exceeds the limit
- **WHEN** a client sends a request to a rate-limited route and their
  request count for that route within the current window exceeds the
  configured limit
- **THEN** the request is rejected with a `429 Too Many Requests` response
  including a `Retry-After` header, before the route handler executes

#### Scenario: Distinct clients tracked independently
- **WHEN** two clients with different IP addresses send requests to the same
  rate-limited route
- **THEN** each client's request count is tracked and limited independently
  of the other

### Requirement: Fail-open on counter-store unavailability
The system SHALL allow a request through, rather than rejecting it, when the
underlying counter store cannot be reached to evaluate the rate limit.

#### Scenario: Counter store unreachable
- **WHEN** a rate-limited request is received and the Redis counter store is
  unreachable
- **THEN** the request is allowed through to the route handler
