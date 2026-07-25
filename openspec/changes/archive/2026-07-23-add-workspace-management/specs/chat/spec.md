## ADDED Requirements

### Requirement: Workspace rename
The system SHALL allow an authenticated user to rename a workspace they own, and SHALL reject the attempt for a workspace that does not exist or belongs to another user.

#### Scenario: Owner renames their workspace
- **WHEN** a user submits a new name for a workspace they own
- **THEN** the workspace's name is updated and the updated workspace is returned

#### Scenario: Rename requires an owned workspace
- **WHEN** a user attempts to rename a workspace that does not belong to them, or that does not exist
- **THEN** the request is rejected as not found, without revealing whether the workspace exists

#### Scenario: Rename validates the new name
- **WHEN** a user submits an empty name, or one exceeding the allowed length
- **THEN** the request is rejected as invalid and the name is not changed

### Requirement: Workspace deletion
The system SHALL allow an authenticated user to delete a workspace they own, removing the workspace and all of its messages, and SHALL reject the attempt for a workspace that does not exist or belongs to another user.

#### Scenario: Owner deletes their workspace
- **WHEN** a user deletes a workspace they own
- **THEN** the workspace is removed and no longer appears in their workspace list

#### Scenario: Deleting a workspace removes its messages
- **WHEN** a workspace with existing messages is deleted
- **THEN** all messages belonging to that workspace are also removed

#### Scenario: Delete requires an owned workspace
- **WHEN** a user attempts to delete a workspace that does not belong to them, or that does not exist
- **THEN** the request is rejected as not found, and no data is deleted
