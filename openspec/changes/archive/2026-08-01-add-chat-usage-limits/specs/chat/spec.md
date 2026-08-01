## ADDED Requirements

### Requirement: Tier-based monthly message quota
The system SHALL enforce a monthly message-sending quota derived from the
sender's effective subscription tier, rejecting a send once the quota is
reached, and SHALL treat the `ULTRA` tier as having no quota.

#### Scenario: Message allowed within quota
- **WHEN** an authenticated user sends a message and their count of messages
  sent this calendar month is below their tier's configured limit
- **THEN** the message is created as normal

#### Scenario: Message rejected once quota is reached
- **WHEN** an authenticated user sends a message and their count of messages
  sent this calendar month is at or above their tier's configured limit
- **THEN** the request is rejected with a `403 Forbidden` response
  identifying the reason as a usage-quota limit, and no message is created

#### Scenario: Rejected attempts do not consume quota
- **WHEN** a message send is rejected for being over quota
- **THEN** the user's counted usage for the month is not incremented by the
  rejected attempt

#### Scenario: Ultra tier has no quota
- **WHEN** a user whose effective tier is `ULTRA` sends a message
- **THEN** the message is created regardless of how many messages they have
  already sent this month

### Requirement: Usage exposure
The system SHALL expose an authenticated user's current monthly message
usage, their tier's configured limit, and their tier, so a client can render
real usage information instead of placeholder data.

#### Scenario: Usage reflects actual sent messages
- **WHEN** an authenticated user requests their usage
- **THEN** the response includes the number of messages they have sent this
  calendar month, their tier, and their tier's message limit

#### Scenario: Unlimited tier reports no limit
- **WHEN** an authenticated user whose effective tier is `ULTRA` requests
  their usage
- **THEN** the response indicates no limit applies, rather than a numeric
  cap
