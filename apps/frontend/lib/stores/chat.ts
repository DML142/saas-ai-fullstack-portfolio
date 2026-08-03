import { authFetch } from './auth';
import { useAuthStore } from './auth.store';

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  workspaceId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export interface Usage {
  tier: 'FREE' | 'LITE' | 'PRO' | 'ULTRA';
  used: number;
  limit: number | null;
}

export interface ExportedWorkspace {
  version: 1;
  name: string;
  exportedAt: string;
  messages: {
    role: 'USER' | 'ASSISTANT';
    content: string;
    createdAt: string;
  }[];
}

/** Shape of the 403 body UsageLimitGuard sends once the tier's quota is hit. */
interface UsageLimitBody extends Usage {
  message: string;
}

export class UsageLimitError extends Error {
  tier: Usage['tier'];
  limit: number | null;
  used: number;

  constructor(body: UsageLimitBody) {
    super(body.message);
    this.tier = body.tier;
    this.limit = body.limit;
    this.used = body.used;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function chatAuthFetch(url: string, init: RequestInit) {
  return authFetch(
    url,
    init,
    () => useAuthStore.getState().accessToken,
    (session) =>
      useAuthStore.getState().setSession(session.accessToken, session.user),
    () => useAuthStore.getState().clearSession(),
  );
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const res = await chatAuthFetch(`${API_URL}/chat/workspaces`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to load workspace');
  return res.json();
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const res = await chatAuthFetch(`${API_URL}/chat/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create workspace');
  return res.json();
}

export async function renameWorkspace(
  workspaceId: string,
  name: string,
): Promise<Workspace> {
  const res = await chatAuthFetch(`${API_URL}/chat/workspaces/${workspaceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to rename workspace');
  return res.json();
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const res = await chatAuthFetch(`${API_URL}/chat/workspaces/${workspaceId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete workspace');
}

export async function getMessages(workspaceId: string): Promise<ChatMessage[]> {
  const res = await chatAuthFetch(
    `${API_URL}/chat/workspaces/${workspaceId}/messages`,
    {
      method: 'GET',
    },
  );
  if (!res.ok) throw new Error('Failed to load messages');
  return res.json();
}

export async function sendMessage(
  workspaceId: string,
  content: string,
): Promise<ChatMessage> {
  const res = await chatAuthFetch(
    `${API_URL}/chat/workspaces/${workspaceId}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    },
  );
  if (res.status === 403) {
    const body = (await res.json().catch(() => null)) as UsageLimitBody | null;
    if (body?.tier) throw new UsageLimitError(body);
  }
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function getUsage(): Promise<Usage> {
  const res = await chatAuthFetch(`${API_URL}/chat/usage`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to load usage');
  return res.json();
}

export async function exportWorkspace(
  workspaceId: string,
): Promise<ExportedWorkspace> {
  const res = await chatAuthFetch(
    `${API_URL}/chat/workspaces/${workspaceId}/export`,
    { method: 'GET' },
  );
  if (!res.ok) throw new Error('Failed to export workspace');
  return res.json();
}

export async function importWorkspace(
  payload: Pick<ExportedWorkspace, 'version' | 'name' | 'messages'>,
): Promise<Workspace> {
  const res = await chatAuthFetch(`${API_URL}/chat/workspaces/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to import workspace');
  return res.json();
}
