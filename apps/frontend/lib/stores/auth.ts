const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'PREMIUM' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  accessToken: string;
  user: AuthUser;
}

function toSession(raw: { accessToken: string} & Record<string, unknown>): Session {
  const { accessToken, ...user } = raw;
  return { accessToken, user: user as unknown as AuthUser };
}

async function parseOrThrow(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'Request failed');
  }
  return res.json();
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

export async function register(email: string, password: string): Promise<Session> {
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
