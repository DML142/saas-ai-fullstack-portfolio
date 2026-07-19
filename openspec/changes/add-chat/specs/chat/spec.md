## ADDED Requirements

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
