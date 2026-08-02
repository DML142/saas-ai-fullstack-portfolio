'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { Modal } from '@/components/dashboard/Modal';
import { Button } from '@/components/ui/button';
import {
  cancelSubscription,
  listSubscriptions,
  type AdminSubscription,
} from '@/lib/stores/admin';

type LoadState = 'loading' | 'loaded' | 'error';

const LIMIT = 20;

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<LoadState>('loading');
  const [cancelTarget, setCancelTarget] = useState<AdminSubscription | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSubscriptions(page, LIMIT)
      .then((res) => {
        if (cancelled) return;
        setSubs(res.data);
        setTotal(res.total);
        setStatus('loaded');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  async function handleConfirmCancel() {
    if (!cancelTarget || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await cancelSubscription(cancelTarget.userId);
      // Reflect the pending cancellation immediately — the DB's cancelAtPeriodEnd
      // is written by the webhook, but the UI shouldn't wait on that round trip.
      setSubs((prev) =>
        prev.map((s) =>
          s.id === cancelTarget.id ? { ...s, cancelAtPeriodEnd: true } : s,
        ),
      );
      setCancelTarget(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to cancel subscription',
      );
    } finally {
      setBusy(false);
    }
  }

  const columns: DataTableColumn<AdminSubscription>[] = [
    { header: 'User', cell: (s) => s.user.email },
    { header: 'Tier', cell: (s) => s.tier },
    { header: 'Status', cell: (s) => s.status },
    {
      header: 'Period end',
      cell: (s) => new Date(s.currentPeriodEnd).toLocaleDateString(),
    },
    {
      header: '',
      cell: (s) =>
        s.cancelAtPeriodEnd ? (
          <span className="text-xs text-foreground/50">Canceling</span>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setCancelTarget(s)}
          >
            Cancel
          </Button>
        ),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="Subscriptions" />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-8">
        {actionError && (
          <p className="text-sm text-destructive">{actionError}</p>
        )}

        <DataTable
          columns={columns}
          rows={subs}
          rowKey={(s) => s.id}
          status={status}
          emptyMessage="No subscriptions yet."
          pagination={{ page, limit: LIMIT, total, onPageChange: setPage }}
        />
      </div>

      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Cancel subscription"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground/70">
            Cancel <span className="text-ink">{cancelTarget?.user.email}</span>
            &apos;s {cancelTarget?.tier} subscription? They keep access until{' '}
            {cancelTarget &&
              new Date(cancelTarget.currentPeriodEnd).toLocaleDateString()}
            .
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCancelTarget(null)}
            >
              Keep subscription
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={handleConfirmCancel}
            >
              {busy ? 'Canceling…' : 'Cancel subscription'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
