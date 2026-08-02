import { RequireAdmin } from '@/components/auth/RequireAdmin';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAdmin>
      <div className="flex h-screen overflow-hidden bg-bg text-ink">
        <AdminSidebar />
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </RequireAdmin>
  );
}
