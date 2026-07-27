'use client';

import { Suspense, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { PlanButton } from '@/components/pricing/PlanButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPassword } from '@/lib/stores/auth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import z from 'zod';

gsap.registerPlugin(useGSAP);

// Mirrors the backend's IsValidPassword rules (min 8 / max 32); the `confirm`
// field is UI-only and never sent — the API takes a single `password`.
const resetSchema = z
  .object({
    password: z.string().min(8).max(32),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

function ResetPasswordInner() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const [serverError, setServerError] = useState<string | null>(null);
  const rootRef = useRef<HTMLFormElement>(null);
  const reducedMotion = useReducedMotion();

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
  });

  async function onSubmit(values: z.infer<typeof resetSchema>) {
    setServerError(null);
    if (!token) {
      setServerError('This reset link is invalid or has expired.');
      return;
    }
    try {
      await resetPassword(token, values.password);
      // Reset revokes existing sessions server-side, so there's no session to
      // carry forward — send the user to log in fresh with the new password.
      router.push('/login');
    } catch {
      setServerError('This reset link is invalid or has expired.');
    }
  }

  useGSAP(
    () => {
      if (reducedMotion) return;
      const groups = rootRef.current?.querySelectorAll('[data-anim]');
      if (!groups?.length) return;
      const tween = gsap.fromTo(
        groups,
        { autoAlpha: 0, y: 16 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.15,
          clearProps: 'visibility,opacity,transform',
        },
      );

      // Fail-open safety net — see login/page.tsx for the full rationale.
      const failsafe = window.setTimeout(() => {
        if (tween.progress() < 1 && rootRef.current) {
          gsap.set(groups, { clearProps: 'visibility,opacity,transform' });
        }
      }, 1500);

      return () => window.clearTimeout(failsafe);
    },
    { dependencies: [reducedMotion], scope: rootRef },
  );

  return (
    <form
      ref={rootRef}
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      <h1 className="font-display text-2xl text-ink">Reset password</h1>

      <div data-anim className="flex flex-col gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <p className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <div data-anim className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          {...form.register('confirm')}
        />
        {form.formState.errors.confirm && (
          <p className="text-sm text-destructive">
            {form.formState.errors.confirm.message}
          </p>
        )}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div data-anim className="flex flex-col items-center gap-3">
        <PlanButton type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Resetting...' : 'Reset password'}
        </PlanButton>

        <Link
          href="/login"
          className="text-sm text-cosmic-light underline decoration-cosmic-light/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/60"
        >
          Back to login
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink/70">Loading...</p>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
