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
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}
