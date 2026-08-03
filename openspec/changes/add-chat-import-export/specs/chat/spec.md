## ADDED Requirements

### Requirement: Workspace export
The system SHALL allow an authenticated user to export a workspace they own
as a versioned JSON document containing the workspace's name and its full
message history, and SHALL reject the attempt for a workspace that does not
exist or belongs to another user.

#### Scenario: Owner exports their workspace
- **WHEN** a user requests an export of a workspace they own
- **THEN** a JSON document is returned containing a format version, the
  workspace's name, and every message in that workspace (role, content, and
  original timestamp) in chronological order

#### Scenario: Export requires an owned workspace
- **WHEN** a user attempts to export a workspace that does not belong to
  them, or that does not exist
- **THEN** the request is rejected as not found, without revealing whether
  the workspace exists

### Requirement: Workspace import
The system SHALL allow an authenticated user to import a previously
exported workspace document, creating a new workspace they own with all of
the document's messages, and SHALL validate the document's shape before
creating anything.

#### Scenario: Valid import creates a new workspace
- **WHEN** a user submits a validly-shaped exported workspace document
- **THEN** a new workspace owned by that user is created, containing every
  message from the document with its original role and content

#### Scenario: Imported message timestamps are preserved
- **WHEN** a message in the imported document includes its original
  timestamp
- **THEN** the recreated message keeps that original timestamp rather than
  being stamped with the import time

#### Scenario: Import never reuses ownership from the document
- **WHEN** a document is imported, regardless of which account originally
  exported it
- **THEN** the resulting workspace is owned solely by the importing user

#### Scenario: Malformed or oversized import is rejected
- **WHEN** a user submits a document with an unrecognized format version, a
  missing required field, or a message count or content length beyond the
  configured maximum
- **THEN** the request is rejected as invalid and no workspace is created

### Requirement: Import does not affect message-sending quota or trigger replies
The system SHALL NOT count imported messages against the caller's monthly
message-sending quota, and SHALL NOT generate simulated assistant replies
for imported messages.

#### Scenario: Import does not consume quota
- **WHEN** a user imports a workspace containing messages
- **THEN** their monthly message-sending usage count is unchanged

#### Scenario: Import does not enqueue simulated replies
- **WHEN** a user imports a workspace containing `USER` messages
- **THEN** no simulated-reply background job is triggered for any imported
  message
