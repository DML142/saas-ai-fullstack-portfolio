## 1. Backend — export endpoint [you implement]

- [x] 1.1 `ChatService.exportWorkspace(userId, workspaceId)`: ownership
      check (`workspace.userId !== userId` → `NotFoundException`, matching
      `getMessages`); fetch messages `orderBy: { createdAt: 'asc' }`;
      return `{ version: 1, name, exportedAt: new Date().toISOString(),
      messages: messages.map(m => ({ role: m.role, content: m.content,
      createdAt: m.createdAt })) }`
- [x] 1.2 `GET /chat/workspaces/:id/export` → `exportWorkspace(user.userId,
      id)` in `chat.controller.ts`, alongside the existing
      `workspaces/:id/messages` route

## 2. Backend — import endpoint [you implement]

- [x] 2.1 Create `apps/backend/src/chat/dto/import-workspace.dto.ts`:
      `ImportMessageDto` — `role` (`@IsIn(['USER', 'ASSISTANT'])`),
      `content` (`@IsString @IsNotEmpty @MaxLength(100000)`, matching
      `SendMessageDto`), `createdAt?` (`@IsOptional @IsISO8601`);
      `ImportWorkspaceDto` — `version` (`@IsIn([1])`), `name`
      (`@IsString @IsNotEmpty @MaxLength(100)`, matching
      `CreateWorkspaceDto`), `messages` (`@IsArray @ArrayMaxSize(2000)
      @ValidateNested({ each: true }) @Type(() => ImportMessageDto)`)
- [x] 2.2 `ChatService.importWorkspace(userId, dto)`: single nested
      `prisma.workspace.create({ data: { userId, name: dto.name, messages:
      { create: dto.messages.map(m => ({ role: m.role, content: m.content,
      createdAt: m.createdAt ? new Date(m.createdAt) : undefined })) } } })`
      — one call, no separate transaction needed; return the created
      workspace
- [x] 2.3 `POST /chat/workspaces/import` → `importWorkspace(user.userId,
      dto)` in `chat.controller.ts` — a literal `import` path segment
      alongside `POST /chat/workspaces` (create); no route collision since
      no other `POST /chat/workspaces/:id` exists

## 3. Backend — Swagger + tests [AI-authored — testing/docs exception]

- [x] 3.1 Swagger on both new routes (`@ApiOperation`, `@ApiOkResponse`
      with a JSON example, `@ApiNotFoundResponse` for export,
      `@ApiBadRequestResponse` for import validation failures) — the
      `chat` controller today only partially documents routes; match
      `billing`/`users`/`admin` style for the two new ones
- [x] 3.2 `chat.service.spec.ts` additions: `exportWorkspace` returns
      ordered messages for an owned workspace and throws
      `NotFoundException` for another user's workspace; `importWorkspace`
      creates a workspace with all messages in one call, preserves a
      provided `createdAt`, and falls back sanely when `createdAt` is
      omitted
- [x] 3.3 Replace `chat.controller.spec.ts`'s current CLI scaffold stub
      (only a "should be defined" test today, no dependency mocks) with
      real tests: export/import delegate to the service with the caller's
      `userId`, not a value from the request body

## 4. Frontend — API client [you implement — backend-integration]

- [x] 4.1 Add to `apps/frontend/lib/stores/chat.ts`: `ExportedWorkspace`
      type (`{ version: number; name: string; exportedAt: string;
      messages: { role: 'USER' | 'ASSISTANT'; content: string; createdAt:
      string }[] }`), `exportWorkspace(id: string): Promise<ExportedWorkspace>`
      (GET `/chat/workspaces/${id}/export`), `importWorkspace(payload:
      Pick<ExportedWorkspace, 'version' | 'name' | 'messages'>):
      Promise<Workspace>` (POST `/chat/workspaces/import`) — both through
      the existing `chatAuthFetch` binding, same `if (!res.ok) throw new
      Error(...)` convention as the other functions in this file

## 5. Frontend — UI [AI-authored — frontend exception]

- [x] 5.1 `Sidebar.tsx`: per-row Export icon button next to
      Pencil/Trash2 — on click, `exportWorkspace(ws.id)`, wrap the result
      in `new Blob([JSON.stringify(data, null, 2)], { type:
      'application/json' })`, trigger download via a temporary
      `<a download="${ws.name}.json">` + `URL.createObjectURL`/`revokeObjectURL`
- [x] 5.2 `Sidebar.tsx`: "Import chat" trigger near "Create new workspace"
      — hidden `<input type="file" accept="application/json">` (mirrors
      `AvatarMenu.tsx`'s `fileInputRef` + `.click()` pattern), on file
      select: `file.text()` → `JSON.parse` → `importWorkspace(...)`, add
      the returned workspace to `useWorkspaceStore`, select it, navigate to
      `/dashboard` (mirrors the existing `handleNewChat` flow)
- [x] 5.3 Inline error state for invalid JSON / failed import request
      (`{error && <p className="text-xs text-destructive">…</p>}`,
      matching `AvatarMenu.tsx`'s existing convention)

## 6. Verification [AI-authored — testing/docs exception]

- [x] 6.1 `pnpm --filter backend test` — chat suite green
- [x] 6.2 Export a real workspace via curl/`/docs`, confirm the JSON shape;
      re-import it via the import endpoint, confirm a new workspace + all
      messages appear with preserved `createdAt`
- [x] 6.3 Confirm import does NOT change `GET /chat/usage`'s `used` count
      and does NOT enqueue a `chat-reply` job (check queue counts via
      `/admin/queues`, already built)
- [x] 6.4 Frontend preview: export a workspace (file downloads), import it
      back (new workspace appears, selected), confirm no console/network
      errors
