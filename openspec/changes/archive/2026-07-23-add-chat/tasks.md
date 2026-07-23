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
- [x] 3.4 After persisting the reply, hand off to the WebSocket gateway (section 4) to push it — closed out alongside section 4; processor now injects `ChatGateway` and calls `pushMessage` after persisting

## 4. Backend: WebSocket gateway [you implement]

- [x] 4.1 Install a WebSocket library (e.g. `@nestjs/websockets` + `socket.io`) and set up the gateway
- [x] 4.2 Authenticate the socket handshake using the existing access token (same secret/verification `JwtStrategy` uses) — reject the connection if invalid or missing — verified live with a real `socket.io-client`: no token → immediate server-initiated disconnect (`reason: "io server disconnect"`); valid token → connection persists
- [x] 4.3 Join each authenticated socket to a `user:{userId}` room — verified indirectly via the isolation test below
- [x] 4.4 Emit the new assistant message to `user:{userId}` once the worker (3.4) persists it — verified live: a connected, authenticated socket received the real `message:new` event with the actual persisted reply; a second user's socket, connected simultaneously, received nothing when the first user's reply was pushed

## 5. Frontend: chat API client + workspace store [you implement]

- [x] 5.1 Build a chat API client (list/create workspaces, get history, send message) following the same `authFetch`-based pattern as the existing auth client — `getMessages`/`sendMessage` land, `chat.ts` complete
- [x] 5.2 Rewrite `workspace.store.ts`: replace the static placeholder array with `{ workspaces, activeId, status: 'loading' | 'loaded' | 'error' }`, fetched on dashboard mount — `WorkspaceBootstrap` mirrors `SessionBootstrap`; verified live in the browser: `GET /chat/workspaces` fires, the real "Test workspace" (from the database) replaces the old fake placeholder list
- [x] 5.3 Update `Sidebar`/`ChatPanel` to handle `status === 'loading'` (a state that couldn't previously occur) — also closed a gap found during verification: nothing auto-selected a default workspace after loading, leaving the header title blank and the sidebar with no highlighted entry. Fixed at the store level (`setWorkspace` now defaults `activeId` to the first workspace, or keeps the current selection if still valid) plus loading/error/empty text in both components. Verified live: header title and sidebar highlight both correctly show "Test workspace" with zero manual clicks.

*(Also found, unrelated to this section: the login page's GSAP entrance animation left the form stuck at `opacity: 0; visibility: hidden` on a fresh load in this test session — worth a look separately, not blocking this section.)*

## 6. Frontend: WebSocket client [you implement]

- [x] 6.1 Build a WebSocket connection hook, authenticated with the current access token — `chat-socket.ts`, connects with `{ auth: { token } }` on the socket.io handshake
- [x] 6.2 Reconnect the socket whenever `authFetch`'s refresh flow obtains a new access token (the risk flagged in `design.md` — a stale-token socket should not silently keep working past what a real revocation would allow) — implemented by subscribing to `useAuthStore`'s `accessToken` directly rather than hooking into every refresh call site individually
- [x] 6.3 On receiving a new message, append it to the relevant workspace's history if it's the active one; otherwise mark that workspace as having unread activity — always appends (so switching to that workspace later shows it with no re-fetch needed), marks unread only if not currently active

*(Found and fixed along the way, not scoped to this section: `ChatGateway`'s `@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL } } )` decorator evaluates at module-import time, before `ConfigModule`/dotenv has populated `process.env` — so `FRONTEND_URL` was silently `undefined` at decoration time, breaking CORS for every real browser connection (curl succeeded throughout, since curl doesn't enforce CORS, which is what made this invisible until an actual browser was used). Fixed by adding `import 'dotenv/config'` as the very first import in `main.ts`, guaranteeing env vars are loaded before any module — including the gateway — is evaluated. Also required adding `dotenv` as a real (non-transitive) dependency, since pnpm doesn't allow importing phantom dependencies.)*

**Verified end-to-end in the actual running app** (not a separate test script): exposed `useMessageStore` on `window` temporarily, sent a real message via curl as the browser's authenticated user, confirmed the real `ASSISTANT` reply arrived via the socket and landed in `byWorkspace` under the correct workspace with `unread` correctly empty (since it was the active workspace) — then removed the temporary exposure and confirmed a clean rebuild.

## 7. Frontend: message rendering [AI-authored]

- [x] 7.1 Add a markdown renderer with syntax-highlighted code blocks for message content — `react-markdown` + `remark-gfm` + `rehype-highlight`, `MessageContent.tsx`; verified visually with bold, a link, a list, and a fenced code block (real syntax-highlighted colors, not plain text)
- [x] 7.2 Style user vs. assistant messages distinctly (e.g. alignment, color) within the existing chat panel layout — `MessageBubble.tsx`, right-aligned primary-color for user, left-aligned neutral card-tone for assistant; wired minimally into `ChatPanel` (rendering whatever's already in the message store) purely to make this section visually verifiable — full history loading/sending is still section 8's job

*(Bug found and fixed along the way, introduced by this section's own `ChatPanel` wiring, not pre-existing: the messages selector built a new `[]` on every call when a workspace had no messages yet, breaking `useSyncExternalStore`'s snapshot-stability contract and triggering an infinite-loop warning. Fixed by selecting the raw `byWorkspace` slice and deriving `messages` in the render body instead of inside the selector.)*

## 8. Frontend: wire the chat panel + switcher to real data [you implement]

- [x] 8.1 Replace the disabled send box with a real one: submits via the chat API client (5.1), appends the returned user message immediately, clears the input — verified live: typed + sent, user message appeared instantly from the POST return, input cleared, assistant reply followed ~3s later via the socket
- [x] 8.2 Load and render a workspace's history (2.3) when it becomes active — verified live: full DB history renders in order on load; persists across a full page reload
- [x] 8.3 Add a minimal "New chat" action to the sidebar, calling the create-workspace endpoint (2.2) and switching to it — verified live: creates a "New chat" workspace, makes it active (header updates), shows its independent empty history

*(Extra UX polish requested during this section, AI-authored — all pure frontend, no backend contract touched: (1) **input lock while generating** — a `pending` set in the message store, opened by the user's own `addMessage(USER)` and closed by the socket's `addMessage(ASSISTANT)`; ChatPanel disables the input + shows a "Waiting for reply…" placeholder and a "COS Assistant is typing…" indicator while pending. Verified live: input disables on send, re-enables when the reply lands. (2) **Fixed header/composer, scroll only the messages region** — dashboard layout bounded to `h-screen overflow-hidden`, messages div gets `flex-1 min-h-0 overflow-y-auto`; verified the page itself no longer scrolls and only the middle region does. (3) **Auto-scroll to newest** on message/typing change.)*
- [x] 8.4 Ensure the simulated nature stays honest in the UI/copy (per the `chat` spec's "Honest simulated-assistant framing" requirement) — no wording that implies a real AI — persistent "Replies are simulated — COS Assistant isn't a real AI model" line under the input, plus the canned replies' own disclaimers

## 9. Verification

- [x] 9.1 Send a message, confirm it persists (reload and confirm it's still there) — verified in section 8
- [x] 9.2 Confirm a simulated reply arrives via WebSocket without a page reload, within the expected delay window — verified repeatedly (~2–3s)
- [x] 9.3 Reload mid-conversation, confirm full history (both roles) renders in correct order — verified in section 8
- [x] 9.4 Send a message containing a fenced code block, confirm it renders with syntax highlighting — verified in section 7
- [x] 9.5 Create a second workspace, confirm it appears in the switcher and its history is independent of the first — verified in section 8 (new workspace shows its own empty history)
- [x] 9.6 Confirm a workspace/message request for another user's workspace is rejected (test via direct API call, not just UI) — verified via curl in sections 2/4, and again for the new rename/delete endpoints (404 both)
- [x] 9.7 Confirm the WebSocket connection is rejected without a valid access token — verified in section 4 with a real socket.io-client (server-initiated disconnect)
- [x] 9.8 Let the access token expire/rotate during an open session, confirm the socket reconnects and replies still arrive afterward — **verified with a full network trace**: corrupted the in-memory access token, then sent a message. Traced `POST /messages → 401` → `POST /auth/refresh → 201` → `GET /auth/me → 200` (setSession) → **new socket handshake** → `POST /messages → 201` (retry) → assistant reply rendered. Three distinct socket sids across the run confirm the socket genuinely tears down and re-establishes on each token change; the reply arrived over the final one. This closes the risk `design.md` flagged (a socket authenticated once at connect-time outliving its token).
- [x] 9.9 Confirm nothing in the reply content or UI implies a real AI model produced it — canned replies carry their own disclaimer, plus the persistent "Replies are simulated" line under the composer
