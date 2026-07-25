> Retroactive change: all work below is already implemented and was verified during the `add-chat` push. Boxes are checked as records of that verification, not pending work.

## 1. Backend

- [x] 1.1 `UpdateWorkspaceDto` (name: non-empty, max 100) — `dto/update-workspace.dto.ts`
- [x] 1.2 `PATCH /chat/workspaces/:id` → `ChatService.renameWorkspace` using `updateMany` scoped by `{ id, userId }`, `count === 0` → 404
- [x] 1.3 `DELETE /chat/workspaces/:id` → `ChatService.deleteWorkspace` using `deleteMany` scoped by `{ id, userId }`, `count === 0` → 404; messages removed by the existing `onDelete: Cascade`

## 2. Frontend

- [x] 2.1 Client functions `renameWorkspace`/`deleteWorkspace` in `lib/stores/chat.ts` (PATCH/DELETE via `authFetch`)
- [x] 2.2 Workspace-store `updateWorkspace` (map-replace name) and `deleteWorkspace` (filter + reassign `activeId` when the deleted id was active)
- [x] 2.3 Message-store `dropWorkspace` — drops `byWorkspace` key and clears `unread`/`pending` entries
- [x] 2.4 Sidebar per-row pencil/trash icons opening rename and delete confirmation modals (`Modal.tsx`)

## 3. Verification

- [x] 3.1 Rename (owner) → 200, name updated, persisted server-side (curl + in-browser via the modal)
- [x] 3.2 Delete (owner) → 200, gone from list (18 → 17 confirmed server-side)
- [x] 3.3 Cascade: a deleted workspace's messages count goes 2 → 0 in the database
- [x] 3.4 Cross-user rename and delete both 404; name not hijacked, workspace survives
- [x] 3.5 Rename/delete of a nonexistent id → 404; re-delete of a deleted id → 404
- [x] 3.6 DTO validation: empty name → 400 (`"name should not be empty"`), overlong name → 400
