'use client';

import { useAuthStore } from "@/lib/stores/auth.store";

interface AuthUser {
  name: string;
  role: 'USER' | 'PREMIUM' | 'ADMIN';
}

interface AuthState {
  isLoggedIn: boolean;
  user: AuthUser | null;
}

export function useAuth(): AuthState {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  return {
    isLoggedIn: status === 'authenticated',
    user: user ? { name: user.email, role: user.role } : null,
  };
}
