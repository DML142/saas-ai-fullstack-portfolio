## 1. Data model [you implement]

- [x] 1.1 Add `Workspace` model to `schema.prisma`: `id`, `userId` (FK → `User`), `name`, `createdAt`
- [x] 1.2 Add `Message` model: `id`, `workspaceId` (FK → `Workspace`), `role` (`USER | ASSISTANT` enum), `content`, `createdAt`
- [x] 1.3 Generate and run the migration — applied cleanly (`prisma migrate status` confirms up to date), client regenerated, backend builds

## 2. Backend: workspace + message persistence [you implement]

- [x] 2.1 `GET /chat/workspaces` — list the authenticated user's workspaces — verified via curl: empty before creation, correct list after, second user sees `[]` (not the first user's data)
- [x] 2.2 `POST /chat/workspaces` — create a new workspace for the authenticated user — verified: returns the full created workspace including `id`
- [x] 2.3 `GET /chat/workspaces/:id/messages` — return a workspace's message history in chronological order; reject if the workspace doesn't belong to the requester — verified: correct history returned; cross-user access returns 404, not 403 (per the enumeration-avoidance decision in `design.md`)
- [x] 2.4 `POST /chat/workspaces/:id/messages` — persist the user's message, return it immediately; reject if the workspace doesn't belong to the requester — verified: message persisted and returned with `role: "USER"`; cross-user send also 404s. *(Reply-job enqueue deliberately not wired yet — that's section 3.)*

## 3. Backend: simulated reply pipeline (BullMQ) [you implement]

- [x] 3.1 Install BullMQ, wire up a queue using the existing `ioredis`-compatible Redis connection — dedicated connection with `maxRetriesPerRequest: null`, separate from `RedisService`'s
- [x] 3.2 Enqueue a job (`{ workspaceId, userId }`) from the send-message endpoint — verified via curl: message persisted and returned immediately, reply not yet present
- [x] 3.3 Build the `@Processor`: simulate a short "thinking" delay, then persist an assistant `Message` with templated/canned content — no real AI/LLM call — verified: after ~2.7s, a real `ASSISTANT` message appeared in the workspace's history with canned content, no errors in the server log
- [ ] 3.4 After persisting the reply, hand off to the WebSocket gateway (section 4) to push it — deliberately deferred; processor has a marker comment where this will go

## 4. Backend: WebSocket gateway [you implement]

- [ ] 4.1 Install a WebSocket library (e.g. `@nestjs/websockets` + `socket.io`) and set up the gateway
- [ ] 4.2 Authenticate the socket handshake using the existing access token (same secret/verification `JwtStrategy` uses) — reject the connection if invalid or missing
- [ ] 4.3 Join each authenticated socket to a `user:{userId}` room
- [ ] 4.4 Emit the new assistant message to `user:{userId}` once the worker (3.4) persists it

## 5. Frontend: chat API client + workspace store [you implement]

- [ ] 5.1 Build a chat API client (list/create workspaces, get history, send message) following the same `authFetch`-based pattern as the existing auth client
- [ ] 5.2 Rewrite `workspace.store.ts`: replace the static placeholder array with `{ workspaces, activeId, status: 'loading' | 'loaded' | 'error' }`, fetched on dashboard mount
- [ ] 5.3 Update `Sidebar`/`ChatPanel` to handle `status === 'loading'` (a state that couldn't previously occur)

## 6. Frontend: WebSocket client [you implement]

- [ ] 6.1 Build a WebSocket connection hook, authenticated with the current access token
- [ ] 6.2 Reconnect the socket whenever `authFetch`'s refresh flow obtains a new access token (the risk flagged in `design.md` — a stale-token socket should not silently keep working past what a real revocation would allow)
- [ ] 6.3 On receiving a new message, append it to the relevant workspace's history if it's the active one; otherwise mark that workspace as having unread activity

## 7. Frontend: message rendering [AI-authored]

- [ ] 7.1 Add a markdown renderer with syntax-highlighted code blocks for message content
- [ ] 7.2 Style user vs. assistant messages distinctly (e.g. alignment, color) within the existing chat panel layout

## 8. Frontend: wire the chat panel + switcher to real data [you implement]

- [ ] 8.1 Replace the disabled send box with a real one: submits via the chat API client (5.1), appends the returned user message immediately, clears the input
- [ ] 8.2 Load and render a workspace's history (2.3) when it becomes active
- [ ] 8.3 Add a minimal "New chat" action to the sidebar, calling the create-workspace endpoint (2.2) and switching to it
- [ ] 8.4 Ensure the simulated nature stays honest in the UI/copy (per the `chat` spec's "Honest simulated-assistant framing" requirement) — no wording that implies a real AI

## 9. Verification

- [ ] 9.1 Send a message, confirm it persists (reload and confirm it's still there)
- [ ] 9.2 Confirm a simulated reply arrives via WebSocket without a page reload, within the expected delay window
- [ ] 9.3 Reload mid-conversation, confirm full history (both roles) renders in correct order
- [ ] 9.4 Send a message containing a fenced code block, confirm it renders with syntax highlighting
- [ ] 9.5 Create a second workspace, confirm it appears in the switcher and its history is independent of the first
- [ ] 9.6 Confirm a workspace/message request for another user's workspace is rejected (test via direct API call, not just UI)
- [ ] 9.7 Confirm the WebSocket connection is rejected without a valid access token
- [ ] 9.8 Let the access token expire/rotate during an open session, confirm the socket reconnects and replies still arrive afterward
- [ ] 9.9 Confirm nothing in the reply content or UI implies a real AI model produced it
