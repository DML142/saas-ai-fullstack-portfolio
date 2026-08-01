'use client';

import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/lib/stores/auth.store';
import { AvatarMenu } from '@/components/AvatarMenu';

/** Email stands in for a display name — the `User` model has no `name`
 * field, same substitution `useAuth()` already makes for the Navbar. */
export function AccountBadge() {
  const { user } = useAuth();
  // Tier isn't on `useAuth()` (it drops it, like emailVerified); read the
  // webhook-synced value straight from the store.
  const tier = useAuthStore((s) => s.user?.tier);

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-sm text-foreground/80">{user?.name}</span>
        {(user?.role || tier) && (
          <span className="text-xs tracking-wide text-foreground/50 uppercase">
            {user?.role}
            {tier && <span className="text-cosmic-light"> · {tier}</span>}
          </span>
        )}
      </div>

      <AvatarMenu />
    </div>
  );
}
