'use client';

import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

/** Email stands in for a display name — the `User` model has no `name`
 * field, same substitution `useAuth()` already makes for the Navbar. */
export function AccountBadge() {
  const { user } = useAuth();

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-sm text-foreground/80">{user?.name}</span>
        {user?.role && (
          <span className="text-xs tracking-wide text-foreground/50 uppercase">
            {user.role}
          </span>
        )}
      </div>
      <Image
        src="/userico.png"
        alt="User avatar"
        width={28}
        height={28}
        className="rounded-full"
      />
    </div>
  );
}
