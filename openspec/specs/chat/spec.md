# chat

## Purpose

Defines the COS Assistant chat feature: per-user workspace and message persistence, the simulated reply pipeline (background job + real-time WebSocket delivery), chat history, and markdown/code rendering of message content. Replies are deliberately simulated — no real AI/LLM is involved.

## Requirements

### Requirement: Workspace persistence
The system SHALL persist workspaces per authenticated user, scoped so a user only ever sees their own workspaces.

#### Scenario: Workspaces survive reload
- **WHEN** an authenticated user reloads the dashboard
- **THEN** their previously created workspaces are still listed, in the same state as before the reload

#### Scenario: Workspaces are user-scoped
- **WHEN** an authenticated user requests their workspace list
- **THEN** only workspaces belonging to that user are returned, never another user's

### Requirement: Sending a message
The system SHALL allow an authenticated user to send a message within one of their workspaces, persisting it immediately and triggering a simulated reply.

#### Scenario: Message is persisted immediately
- **WHEN** a user sends a message in an active workspace
- **THEN** the message is persisted and returned to the client without waiting for the simulated reply

#### Scenario: Sending requires an owned workspace
- **WHEN** a user attempts to send a message into a workspace that does not belong to them
- **THEN** the request is rejected

### Requirement: Simulated reply pipeline
The system SHALL generate a simulated assistant reply for every user message via an asynchronous background job, without calling any real AI/LLM service.

#### Scenario: Reply is generated after a delay
- **WHEN** a user message is sent
- **THEN** a background job processes it after a short simulated delay and persists a new assistant message in the same workspace

#### Scenario: No real model is called
- **WHEN** the reply pipeline runs
- **THEN** the reply content is templated/canned, and no external AI/LLM API is invoked

### Requirement: Real-time reply delivery
The system SHALL push a newly generated assistant reply to the sending user's connected client over an authenticated WebSocket connection, without requiring the client to poll or reload.

#### Scenario: Reply arrives without reload
- **WHEN** the background job finishes generating a reply while the user's client is connected
- **THEN** the client receives the new message over the WebSocket connection and can render it without a page reload

#### Scenario: WebSocket connection requires authentication
- **WHEN** a client attempts to open the WebSocket connection without a valid access token
- **THEN** the connection is rejected

#### Scenario: Replies are only delivered to their owner
- **WHEN** a reply is generated for one user's message
- **THEN** it is only pushed to that user's connection, never another user's

### Requirement: Chat history
The system SHALL persist and make retrievable the full message history of a workspace, in chronological order.

#### Scenario: History persists across reload
- **WHEN** a user reloads the dashboard and reopens a workspace
- **THEN** all previously sent and received messages in that workspace are still displayed, in the order they occurred

### Requirement: Message content rendering
The system SHALL render message content as markdown, including syntax-highlighted code blocks, rather than as raw unformatted text or unsanitized HTML.

#### Scenario: Fenced code block renders as code
- **WHEN** a message's content contains a fenced code block
- **THEN** it renders with monospace formatting and syntax highlighting, distinct from surrounding prose

### Requirement: Honest simulated-assistant framing
The system SHALL make clear, through the reply content or the surrounding UI, that assistant replies are simulated and not the output of a real AI model.

#### Scenario: Simulated nature is not disguised
- **WHEN** a user receives a simulated assistant reply
- **THEN** nothing in the reply content or its presentation claims or implies it came from a real AI/LLM

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
