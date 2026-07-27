'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { PlanButton } from '@/components/pricing/PlanButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPassword } from '@/lib/stores/auth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import z from 'zod';

gsap.registerPlugin(useGSAP);

const forgotSchema = z.object({
  email: z.string().email(),
});

export default function ForgotPasswordPage() {
  // The backend answers identically whether or not the email exists (no
  // enumeration), so the UI mirrors that: on any successful request we show
  // the same neutral confirmation and never reveal account existence.
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // A stable outer <div> owns the ref across both renders (form → confirmation),
  // so the GSAP scope survives the state swap without retyping the ref per tag.
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const form = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
  });

  async function onSubmit(values: z.infer<typeof forgotSchema>) {
    setServerError(null);
    try {
      await forgotPassword(values.email);
      setSubmitted(true);
    } catch {
      // The endpoint itself always succeeds; only a network/transport failure
      // lands here, so this is a generic retry prompt, not "email not found".
      setServerError('Something went wrong. Please try again.');
    }
  }

  useGSAP(
    () => {
      if (reducedMotion) return;
      const groups = rootRef.current?.querySelectorAll('[data-anim]');
      if (!groups?.length) return;
      // GSAP sets the `from` values synchronously before paint, so there's no
      // flash of the fully-visible state a CSS `animation-delay` would show.
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

      // Fail-open safety net (see login/page.tsx for the full rationale): rAF
      // tweens pause on a backgrounded tab and could strand the reveal at
      // autoAlpha:0; setTimeout still fires and forces the visible state.
      const failsafe = window.setTimeout(() => {
        if (tween.progress() < 1 && rootRef.current) {
          gsap.set(groups, { clearProps: 'visibility,opacity,transform' });
        }
      }, 1500);

      return () => window.clearTimeout(failsafe);
    },
    { dependencies: [reducedMotion, submitted], scope: rootRef },
  );

  return (
    <div ref={rootRef}>
      {submitted ? (
        <div className="flex flex-col gap-5">
          <h1 data-anim className="font-display text-2xl text-ink">
            Check your inbox
          </h1>
          <p data-anim className="text-sm text-ink/70">
            If that email is registered, we&apos;ve sent a link to reset your
            password. The link expires shortly, so use it soon.
          </p>
          <Link
            data-anim
            href="/login"
            className="text-sm text-cosmic-light underline decoration-cosmic-light/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/60"
          >
            Back to login
          </Link>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-2xl text-ink">Forgot password</h1>
            <p className="text-sm text-ink/70">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <div data-anim className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <div data-anim className="flex flex-col items-center gap-3">
            <PlanButton type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Sending...' : 'Send reset link'}
            </PlanButton>

            <Link
              href="/login"
              className="text-sm text-cosmic-light underline decoration-cosmic-light/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/60"
            >
              Remembered it? Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
