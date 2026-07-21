import { create } from 'zustand';
import { AuthUser } from './auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'loading',
  setSession: (accessToken, user) =>
    set({ accessToken, user, status: 'authenticated' }),
  clearSession: () =>
    set({ accessToken: null, user: null, status: 'unauthenticated' }),
}));
