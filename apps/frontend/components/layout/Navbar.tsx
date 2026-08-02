'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AvatarMenu } from '@/components/AvatarMenu';
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

  // The dashboard (and admin) have their own header, so the marketing nav
  // doesn't belong there. Hooks are all called above this check to keep hook
  // order stable.
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return null;
  }

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
          <nav className="hidden items-center gap-6 lg:flex">
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

        {/* right: auth-conditional controls + avatar + mobile hamburger.
            `AvatarMenu` renders once here (not duplicated per breakpoint
            like `AuthControls` below) because its Popover anchors to the
            trigger's bounding rect via Floating UI — a duplicate copy
            hidden by `lg:hidden`/`hidden lg:flex` would collapse to a
            zero rect on the CSS breakpoint flip and make the popup jump
            to the top-left corner instead of just disappearing. */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 lg:flex">
            <AuthControls isLoggedIn={isLoggedIn} userName={user?.name} />
          </div>

          {isLoggedIn && <AvatarMenu size={28} />}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="text-foreground lg:hidden"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* mobile menu panel — always mounted so the transition has a "before"
          state; `absolute` keeps it out of flow while closed. */}
      <div
        className={`absolute inset-x-0 top-full border-t border-border bg-bg/95 backdrop-blur-md transition-all duration-300 lg:hidden ${
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
          <AuthControls
            isLoggedIn={isLoggedIn}
            userName={user?.name}
            onNavigate={() => setMobileOpen(false)}
          />
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
            <Button
              size="sm"
              className="border-2 border-primary/80 bg-primary/60"
            >
              Open Chat
            </Button>
          </Link>
          <Link href="/" onClick={handleLogout}>
            <Button
              variant="secondary"
              size="sm"
              className="border-2 border-muted-foreground/80"
            >
              Logout
            </Button>
          </Link>
        </>
      ) : (
        <>
          <Link href="/register" onClick={onNavigate}>
            <Button
              variant="secondary"
              size="sm"
              className="border-2 border-muted-foreground/80"
            >
              Register
            </Button>
          </Link>
          <Link href="/login" onClick={onNavigate}>
            <Button
              size="sm"
              className="border-2 border-primary/80 bg-primary/60"
            >
              Login
            </Button>
          </Link>
        </>
      )}

      {isLoggedIn && userName && (
        <span className="text-sm text-foreground/80">{userName}</span>
      )}
    </>
  );
}
