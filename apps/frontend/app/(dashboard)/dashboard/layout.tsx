import { RequireAuth } from '@/components/auth/RequireAuth';
import { ChatSocketBootstrap } from '@/components/dashboard/ChatSocketBootstrap';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { VerificationBanner } from '@/components/dashboard/VerificationBanner';
import { WorkspaceBootstrap } from '@/components/dashboard/WorkspaceBootstrap';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      {/* No pt-20: the Navbar hides itself on /dashboard, so there's no fixed
          header to clear. h-screen + overflow-hidden bounds the dashboard to
          the viewport so only the chat's messages region scrolls; min-w-0 lets
          <main>'s flex child shrink instead of overflowing horizontally. */}
      <div className="flex h-screen overflow-hidden bg-bg text-ink">
        <WorkspaceBootstrap />
        <ChatSocketBootstrap />
        <Sidebar />
        {/* Column so the banner stacks above the scroll region; min-h-0 lets
            the children area keep its internal scroll. */}
        <main className="flex min-w-0 flex-1 flex-col">
          <VerificationBanner />
          <div className="min-h-0 flex-1">{children}</div>
        </main>
      </div>
    </RequireAuth>
  );
}
