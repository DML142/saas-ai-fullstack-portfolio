'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTablePagination {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  status: 'loading' | 'loaded' | 'error';
  emptyMessage?: string;
  pagination?: DataTablePagination;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  status,
  emptyMessage = 'Nothing to show.',
  pagination,
}: DataTableProps<T>) {
  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.limit))
    : 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border/60">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className="px-4 py-3 text-xs tracking-widest text-foreground/50 uppercase"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {status === 'loading' && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-sm text-foreground/50"
                >
                  Loading…
                </td>
              </tr>
            )}
            {status === 'error' && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-sm text-destructive"
                >
                  Couldn&apos;t load data.
                </td>
              </tr>
            )}
            {status === 'loaded' && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-sm text-foreground/50"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {status === 'loaded' &&
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-card/20"
                >
                  {columns.map((col) => (
                    <td
                      key={col.header}
                      className={cn(
                        'px-4 py-3 text-foreground/80',
                        col.className,
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-foreground/60">
          <span>
            Page {pagination.page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
