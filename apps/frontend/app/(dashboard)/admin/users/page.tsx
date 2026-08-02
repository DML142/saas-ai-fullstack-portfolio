'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { Input } from '@/components/ui/input';
import { listUsers, type AdminUser } from '@/lib/stores/admin';

type LoadState = 'loading' | 'loaded' | 'error';

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

const columns: DataTableColumn<AdminUser>[] = [
  {
    header: 'Email',
    cell: (u) => (
      <Link
        href={`/admin/users/${u.id}`}
        className="text-cosmic-light underline decoration-cosmic-light/40 underline-offset-4 hover:text-ink hover:decoration-ink/60"
      >
        {u.email}
      </Link>
    ),
  },
  { header: 'Role', cell: (u) => u.role },
  { header: 'Tier', cell: (u) => u.subscription?.tier ?? 'FREE' },
  { header: 'Verified', cell: (u) => (u.emailVerified ? 'Yes' : 'No') },
  {
    header: 'Joined',
    cell: (u) => new Date(u.createdAt).toLocaleDateString(),
  },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LoadState>('loading');

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    listUsers(page, LIMIT, search || undefined)
      .then((res) => {
        if (cancelled) return;
        setUsers(res.data);
        setTotal(res.total);
        setStatus('loaded');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [page, search]);

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="Users" />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-8">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by email…"
          className="max-w-xs"
        />

        <DataTable
          columns={columns}
          rows={users}
          rowKey={(u) => u.id}
          status={status}
          emptyMessage="No users found."
          pagination={{ page, limit: LIMIT, total, onPageChange: setPage }}
        />
      </div>
    </div>
  );
}
