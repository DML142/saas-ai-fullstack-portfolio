'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useScrolled } from '@/hooks/useScrolled';
import { useSmoothAnchor } from '@/hooks/useSmoothAnchor';
import { logout } from '@/lib/stores/auth';
import { useAuthStore } from '@/lib/stores/auth.store';

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Pricing', href: '#pricing' },
];

const SCROLL_THRESHOLD_PX = 40;

async function handleLogout() {
  try {
    await logout();
  } finally {
    useAuthStore.getState().clearSession();
  }
}

export function Navbar() {
  const { isLoggedIn, user } = useAuth();
  const scrolled = useScrolled(SCROLL_THRESHOLD_PX);
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleAnchorClick = useSmoothAnchor();
  const pathname = usePathname();

  // The dashboard is its own app-like surface with its own header (sidebar +
  // account badge) — the marketing nav (Home/Features/Reviews/Pricing) and
  // this component's hooks (all called above, before this check, to keep
  // hook order stable) don't belong there.
  if (pathname.startsWith('/dashboard')) return null;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-bg/80 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="relative mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        {/* left: logo + links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="shrink-0">
            <Image src="/cosico.png" alt="COS Code" width={60} height={60} />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleAnchorClick}
                className="text-sm text-foreground/70 transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* right: auth-conditional controls (desktop) */}
        <div className="hidden items-center gap-4 md:flex">
          <AuthControls isLoggedIn={isLoggedIn} userName={user?.name} />
        </div>

        {/* mobile hamburger toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          className="text-foreground md:hidden"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* mobile menu panel — always mounted (not conditionally rendered) so
          the opacity/transform transition has a "before" state to animate
          from; `absolute` keeps it out of document flow while closed so it
          doesn't reserve empty space, anchored to the header's own box
          (`fixed` above already establishes the containing block). */}
      <div
        className={`absolute inset-x-0 top-full border-t border-border bg-bg/95 backdrop-blur-md transition-all duration-300 md:hidden ${
          mobileOpen
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <nav className="flex flex-col gap-1 px-6 py-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                handleAnchorClick(e);
                setMobileOpen(false);
              }}
              className="py-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col items-start gap-3 border-t border-border px-6 py-4">
          <AuthControls isLoggedIn={isLoggedIn} userName={user?.name} onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>
    </header>
  );
}

function AuthControls({
  isLoggedIn,
  userName,
  onNavigate,
}: {
  isLoggedIn: boolean;
  userName?: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {isLoggedIn ? (
        <>
          <Link href="/dashboard" onClick={onNavigate}>
            <Button size="sm" className="border-2 border-primary/80 bg-primary/60">
              Open Chat
            </Button>
          </Link>
          <Link href="/" onClick={handleLogout}>
            <Button variant="secondary" size="sm" className="border-2 border-muted-foreground/80">
              Logout
            </Button>
          </Link>
        </>
      ) : (
        <>
          <Link href="/register" onClick={onNavigate}>
            <Button variant="secondary" size="sm" className="border-2 border-muted-foreground/80">
              Register
            </Button>
          </Link>
          <Link href="/login" onClick={onNavigate}>
            <Button size="sm" className="border-2 border-primary/80 bg-primary/60">
              Login
            </Button>
          </Link>
        </>
      )}

      {isLoggedIn && userName && (
        <span className="text-sm text-foreground/80">{userName}</span>
      )}

      <Image
        src="/userico.png"
        alt="User avatar"
        width={28}
        height={28}
        className="rounded-full"
      />
    </>
  );
}
