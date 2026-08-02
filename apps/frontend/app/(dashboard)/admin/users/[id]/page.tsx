'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Modal } from '@/components/dashboard/Modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth.store';
import {
  getUser,
  updateUserRole,
  type AdminUserDetail,
  type Role,
} from '@/lib/stores/admin';

type LoadState = 'loading' | 'loaded' | 'error';

const ROLES: Role[] = ['USER', 'PREMIUM', 'ADMIN'];

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [status, setStatus] = useState<LoadState>('loading');
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUser(id)
      .then((data) => {
        if (!cancelled) {
          setUser(data);
          setStatus('loaded');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleConfirmRoleChange() {
    if (!pendingRole || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await updateUserRole(id, pendingRole);
      setUser((prev) => (prev ? { ...prev, role: updated.role } : prev));
      setPendingRole(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to update role',
      );
    } finally {
      setBusy(false);
    }
  }

  const isSelf = user !== null && user.id === currentUserId;

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="User detail" />

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 py-8">
        <button
          type="button"
          onClick={() => router.push('/admin/users')}
          className="self-start text-sm text-cosmic-light underline decoration-cosmic-light/40 underline-offset-4 hover:text-ink hover:decoration-ink/60"
        >
          ← Back to users
        </button>

        {status === 'loading' && (
          <p className="text-sm text-foreground/50">Loading…</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-destructive">
            Couldn&apos;t load this user.
          </p>
        )}

        {status === 'loaded' && user && (
          <>
            <section className="flex flex-col gap-1">
              <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
                Account
              </h2>
              <p className="text-ink">{user.email}</p>
              <p className="text-sm text-foreground/60">
                Joined {new Date(user.createdAt).toLocaleDateString()} ·{' '}
                {user._count.workspaces} workspace
                {user._count.workspaces === 1 ? '' : 's'}
              </p>
            </section>

            <section className="flex flex-col gap-1">
              <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
                Subscription
              </h2>
              {user.subscription ? (
                <p className="text-sm text-foreground/60">
                  <span className="text-ink">{user.subscription.tier}</span> ·{' '}
                  {user.subscription.status}
                  {user.subscription.cancelAtPeriodEnd &&
                    ' · canceling at period end'}
                </p>
              ) : (
                <p className="text-sm text-foreground/60">
                  No subscription (Free)
                </p>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
                Role
              </h2>
              <div className="flex items-center gap-3">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={r === user.role || isSelf}
                    onClick={() => setPendingRole(r)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      r === user.role
                        ? 'border-primary/60 bg-primary/15 text-ink'
                        : 'border-border/60 text-foreground/70 hover:bg-card/20 hover:text-ink',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {isSelf && (
                <p className="text-xs text-foreground/50">
                  You can&apos;t change your own role.
                </p>
              )}
              {actionError && (
                <p className="text-sm text-destructive">{actionError}</p>
              )}
            </section>
          </>
        )}
      </div>

      <Modal
        open={pendingRole !== null}
        onClose={() => setPendingRole(null)}
        title="Change role"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground/70">
            Change <span className="text-ink">{user?.email}</span>&apos;s role
            to <span className="text-ink">{pendingRole}</span>?
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPendingRole(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={handleConfirmRoleChange}
            >
              {busy ? 'Saving…' : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
