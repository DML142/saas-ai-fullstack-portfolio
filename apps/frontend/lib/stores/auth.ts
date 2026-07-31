const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: 'USER' | 'PREMIUM' | 'ADMIN';
  tier: SubscriptionTier;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  accessToken: string;
  user: AuthUser;
}

export type SubscriptionTier = 'FREE' | 'LITE' | 'PRO' | 'ULTRA';

export type PaidTier = 'LITE' | 'PRO' | 'ULTRA';

export async function startCheckout(
  tier: PaidTier,
  getToken: () => string | null,
  onRefreshed: (session: { accessToken: string; user: AuthUser }) => void,
  onSessionLost: () => void,
): Promise<{ url: string }> {
  const res = await authFetch(
    `${API_URL}/billing/checkout`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    },
    getToken,
    onRefreshed,
    onSessionLost,
  );
  return parseOrThrow(res);
}

export async function openBillingPortal(
  getToken: () => string | null,
  onRefreshed: (session: { accessToken: string; user: AuthUser }) => void,
  onSessionLost: () => void,
): Promise<{ url: string }> {
  const res = await authFetch(
    `${API_URL}/billing/portal`,
    { method: 'POST' },
    getToken,
    onRefreshed,
    onSessionLost,
  );
  return parseOrThrow(res);
}

function toSession(
  raw: { accessToken: string } & Record<string, unknown>,
): Session {
  const { accessToken, ...user } = raw;
  return { accessToken, user: user as unknown as AuthUser };
}

async function parseOrThrow(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'Request failed');
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function login(email: string, password: string): Promise<Session> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  return toSession(await parseOrThrow(res));
}

export async function register(
  email: string,
  password: string,
): Promise<Session> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  return toSession(await parseOrThrow(res));
}

export async function refresh(): Promise<{ accessToken: string }> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseOrThrow(res);
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function me(accessToken: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'include',
  });
  return parseOrThrow(res);
}

export async function verifyEmail(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return parseOrThrow(res);
}

export async function forgotPassword(
  email: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return parseOrThrow(res);
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  return parseOrThrow(res);
}

export async function resendVerification(
  getToken: () => string | null,
  onRefreshed: (session: { accessToken: string; user: AuthUser }) => void,
  onSessionLost: () => void,
): Promise<void> {
  const res = await authFetch(
    `${API_URL}/auth/resend-verification`,
    { method: 'POST' },
    getToken,
    onRefreshed,
    onSessionLost,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'Request failed');
  }
}

export async function authFetch(
  input: string,
  init: RequestInit,
  getToken: () => string | null,
  onRefreshed: (session: { accessToken: string; user: AuthUser }) => void,
  onSessionLost: () => void,
): Promise<Response> {
  const attemp = async (token: string | null) =>
    fetch(input, {
      ...init,
      credentials: 'include',
      headers: { ...init.headers, Authorization: `Bearer ${token ?? ''}` },
    });

  const first = await attemp(getToken());
  if (first.status !== 401) return first;

  try {
    const { accessToken } = await refresh();
    const user = await me(accessToken);
    onRefreshed({ accessToken, user });
    return attemp(accessToken);
  } catch {
    onSessionLost();
    return first;
  }
}
