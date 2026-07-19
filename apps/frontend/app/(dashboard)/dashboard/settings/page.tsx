'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/stores/auth';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function SettingsPage() {
  const { user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      // No explicit redirect here — clearing the session flips
      // useAuthStore's status to 'unauthenticated', and <RequireAuth> (which
      // wraps every /dashboard route) reacts to that on its own and sends
      // the user to /login. Duplicating that navigation here would just be
      // two places deciding the same thing.
      useAuthStore.getState().clearSession();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="Settings" />

      <div className="flex flex-1 flex-col gap-8 px-6 py-8">
        <section className="flex flex-col gap-1">
          <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
            Account
          </h2>
          <p className="text-ink">{user?.name}</p>
          <p className="text-sm text-foreground/60">{user?.role}</p>
        </section>

        <section className="flex flex-col items-start gap-2">
          <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
            Session
          </h2>
          <Button
            variant="secondary"
            size="sm"
            disabled={loggingOut}
            onClick={handleLogout}
            className="border-2 border-muted-foreground/80"
          >
            {loggingOut ? 'Logging out...' : 'Log out'}
          </Button>
        </section>
      </div>
    </div>
  );
}
