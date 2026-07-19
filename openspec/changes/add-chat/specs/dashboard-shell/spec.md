## MODIFIED Requirements

### Requirement: Workspace/chat switcher
The system SHALL provide a Claude-Desktop-style switcher listing the authenticated user's real, persisted workspaces, allowing the user to select one as active and to create a new workspace.

#### Scenario: Switcher lists the user's real workspaces
- **WHEN** the dashboard loads
- **THEN** the switcher fetches and displays the authenticated user's persisted workspaces, with one selected as active

#### Scenario: Selecting a workspace updates the active selection
- **WHEN** a user selects a different workspace entry in the switcher
- **THEN** the main panel reflects the newly selected workspace as active, loading that workspace's message history

#### Scenario: Creating a new workspace
- **WHEN** a user creates a new workspace from the switcher
- **THEN** a new workspace is persisted for that user, appears in the switcher, and becomes the active selection

#### Scenario: Switcher reflects loading state
- **WHEN** the workspace list has not finished loading
- **THEN** the switcher does not render a false-empty or false-populated list, and does not error

## REMOVED Requirements

### Requirement: Empty/placeholder chat panel
**Reason**: The chat panel is no longer a placeholder — real send/receive/history behavior is now specified under the new `chat` capability.
**Migration**: See `chat` capability's chat panel and message requirements.
