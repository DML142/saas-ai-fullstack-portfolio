import { StarField } from '@/components/hero/StarField';

/**
 * Shared by /login and /register. The star field is the same one the hero
 * uses — "star bg as in home section" — and needs a positioned, clipped
 * ancestor to sit inside, which is what the outer div provides.
 *
 * The card itself is deliberately plain: a translucent tint and a faint
 * border, no blur, no glow — nothing borrowed from Pricing's Ultra treatment.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6 py-24">
      <StarField />
      {/* Plain `backdrop-blur-md`, not a `supports-[backdrop-filter]:` guard —
          that guard silently generated no blur at all when tried on the
          Ultra pricing card earlier; every target browser supports
          `backdrop-filter` anyway, so the guard was solving a problem this
          project doesn't have. */}
      <div className="border-border/60 bg-card/10 backdrop-blur-md relative z-10 w-full max-w-md rounded-2xl border p-8">
        {children}
      </div>
    </div>
  );
}
