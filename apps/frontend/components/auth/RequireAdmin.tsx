'use client';

import { useAuthStore } from '@/lib/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'authenticated' && role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [status, role, router]);

  if (status !== 'authenticated' || role !== 'ADMIN') return null;
  return <>{children}</>;
}
