import { StarField } from '@/components/hero/StarField';

/**
 * Shared by the auth pages. Reuses the hero's star field, which needs a
 * positioned, clipped ancestor (the outer div). The card is deliberately
 * plain: a translucent tint and faint border, no blur or glow.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6 py-24">
      <StarField />
      <div className="border-border/60 bg-card/10 backdrop-blur-md relative z-10 w-full max-w-md rounded-2xl border p-8">
        {children}
      </div>
    </div>
  );
}
