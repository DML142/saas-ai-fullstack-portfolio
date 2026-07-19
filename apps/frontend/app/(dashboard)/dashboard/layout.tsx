import { RequireAuth } from "@/components/auth/RequireAuth";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      {/* No pt-20 here — the global Navbar hides itself on /dashboard
          routes, so there's no fixed header left to clear. */}
      <div className="flex min-h-screen bg-bg text-ink">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </div>
    </RequireAuth>
  );
}
