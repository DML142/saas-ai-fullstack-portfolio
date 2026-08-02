import { authFetch } from './auth';
import { useAuthStore } from './auth.store';
import type { SubscriptionTier } from './auth';

export type Role = 'USER' | 'PREMIUM' | 'ADMIN';

export interface AdminUser {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  avatarUrl: string | null;
  createdAt: string;
  subscription: { tier: SubscriptionTier; status: string } | null;
}

export interface AdminUserDetail extends Omit<AdminUser, 'subscription'> {
  stripeCustomerId: string | null;
  updatedAt: string;
  subscription: AdminSubscription | null;
  _count: { workspaces: number };
}

export interface AdminSubscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  tier: SubscriptionTier;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  user: { email: string };
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminStats {
  totalUsers: number;
  usersByRole: { role: Role; count: number }[];
  subscriptionsByTier: { tier: SubscriptionTier; count: number }[];
  signups: { day: string; count: number }[];
}

export interface QueueHealth {
  name: string;
  counts: Record<string, number>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function adminAuthFetch(url: string, init: RequestInit) {
  return authFetch(
    url,
    init,
    () => useAuthStore.getState().accessToken,
    (session) =>
      useAuthStore.getState().setSession(session.accessToken, session.user),
    () => useAuthStore.getState().clearSession(),
  );
}

export async function listUsers(
  page = 1,
  limit = 20,
  search?: string,
): Promise<Paginated<AdminUser>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set('search', search);

  const res = await adminAuthFetch(`${API_URL}/admin/users?${params}`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

export async function getUser(id: string): Promise<AdminUserDetail> {
  const res = await adminAuthFetch(`${API_URL}/admin/users/${id}`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to load user');
  return res.json();
}

export async function updateUserRole(
  id: string,
  role: Role,
): Promise<{ id: string; email: string; role: Role }> {
  const res = await adminAuthFetch(`${API_URL}/admin/users/${id}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'Failed to update role');
  }
  return res.json();
}

export async function listSubscriptions(
  page = 1,
  limit = 20,
): Promise<Paginated<AdminSubscription>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await adminAuthFetch(`${API_URL}/admin/subscriptions?${params}`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to load subscriptions');
  return res.json();
}

export async function cancelSubscription(
  userId: string,
): Promise<{ status: string }> {
  const res = await adminAuthFetch(
    `${API_URL}/admin/subscriptions/${userId}/cancel`,
    { method: 'POST' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'Failed to cancel subscription');
  }
  return res.json();
}

export async function getStats(): Promise<AdminStats> {
  const res = await adminAuthFetch(`${API_URL}/admin/stats`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
}

export async function getQueues(): Promise<QueueHealth[]> {
  const res = await adminAuthFetch(`${API_URL}/admin/queues`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error('Failed to load queue health');
  return res.json();
}
