'use client';

import { me, refresh } from '@/lib/stores/auth';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useEffect } from 'react';

export function SessionBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { accessToken } = await refresh();
        const user = await me(accessToken);
        if (!cancelled) setSession(accessToken, user);
      } catch {
        if (!cancelled) clearSession();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setSession, clearSession]);

  return null;
}
