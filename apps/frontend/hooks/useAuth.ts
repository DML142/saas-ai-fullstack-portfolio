'use client';

interface AuthUser {
  name: string;
}

interface AuthState {
  isLoggedIn: boolean;
  user: AuthUser | null;
}

/**
 * MOCK — hardcoded placeholder until real session verification is wired up
 * (calling the backend's /auth/me, already built in add-user-auth). Flip
 * MOCK_LOGGED_IN to preview both navbar states during development. The
 * shape ({ isLoggedIn, user }) is intentionally the same shape real auth
 * would return, so swapping this function's internals later shouldn't
 * require changing anything that calls useAuth().
 */
const MOCK_LOGGED_IN = false;

export function useAuth(): AuthState {
  if (MOCK_LOGGED_IN) {
    return { isLoggedIn: true, user: { name: 'Jane Doe' } };
  }
  return { isLoggedIn: false, user: null };
}
