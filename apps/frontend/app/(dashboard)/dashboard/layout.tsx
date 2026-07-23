import { RequireAuth } from '@/components/auth/RequireAuth';
import { ChatSocketBootstrap } from '@/components/dashboard/ChatSocketBootstrap';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { WorkspaceBootstrap } from '@/components/dashboard/WorkspaceBootstrap';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      {/* No pt-20 here — the global Navbar hides itself on /dashboard
          routes, so there's no fixed header left to clear.
          h-screen + overflow-hidden bounds the whole dashboard to the viewport
          so the page itself never scrolls; scrolling is confined to the chat
          panel's messages region. min-w-0 on <main> lets its flex child
          shrink instead of forcing horizontal overflow. */}
      <div className="flex h-screen overflow-hidden bg-bg text-ink">
        <WorkspaceBootstrap />
        <ChatSocketBootstrap />
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </RequireAuth>
  );
}
