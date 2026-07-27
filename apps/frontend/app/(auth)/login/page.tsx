'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { PlanButton } from '@/components/pricing/PlanButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/stores/auth';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import z from 'zod';

gsap.registerPlugin(useGSAP);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const reducedMotion = useReducedMotion();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setServerError(null);
    try {
      const { accessToken, user } = await login(values.email, values.password);
      setSession(accessToken, user);
      router.push('/');
    } catch {
      setServerError('Invalid email or password');
    }
  }

  useGSAP(
    () => {
      if (reducedMotion) return;
      const groups = formRef.current?.querySelectorAll('[data-anim]');
      if (!groups?.length) return;
      // GSAP sets the `from` values synchronously at tween creation, before
      // paint — unlike a CSS `animation-delay`, which shows the element's
      // normal, fully-visible state for the whole delay window before the
      // timeline actually engages and jumps it to the hidden keyframe. That
      // flash-then-hide-then-animate sequence is exactly what a CSS-only
      // version of this reveal produced.
      const tween = gsap.fromTo(
        groups,
        { autoAlpha: 0, y: 16 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.15,
          // Once revealed, strip GSAP's inline styles so the elements rest in
          // their natural (visible) CSS state — nothing left for a later
          // context revert to strand at autoAlpha:0.
          clearProps: 'visibility,opacity,transform',
        },
      );

      // Fail-open safety net. This is a login form, so it must never stay
      // invisible: the reveal above hides it (autoAlpha:0) and only the tween
      // brings it back, and GSAP's tween advances on requestAnimationFrame —
      // which the browser PAUSES for a backgrounded/non-compositing tab. If the
      // tab is loaded in the background, the `from` state is applied but the
      // tween can't progress, leaving the form hidden until focus. setTimeout
      // (unlike rAF) still fires in that state, so this forces the final
      // visible state if the tween hasn't finished by the time it should have.
      // On a normal foreground load the tween completes first (~0.8s) and this
      // is a harmless no-op.
      const failsafe = window.setTimeout(() => {
        if (tween.progress() < 1 && formRef.current) {
          gsap.set(groups, { clearProps: 'visibility,opacity,transform' });
        }
      }, 1500);

      return () => window.clearTimeout(failsafe);
    },
    { dependencies: [reducedMotion], scope: formRef },
  );

  return (
    <form
      ref={formRef}
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      <h1 className="font-display text-2xl text-ink">Login</h1>

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

      <div data-anim className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <p className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
        {/* Sits with the password field — the conventional spot users look for
            reset, and the only entry point to the /forgot-password flow. */}
        <Link
          href="/forgot-password"
          className="self-end text-xs text-cosmic-light underline decoration-cosmic-light/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/60"
        >
          Forgot password?
        </Link>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      {/* Button and link stacked, not side by side — a small gap keeps them
          from reading as one control. */}
      <div data-anim className="flex flex-col items-center gap-3">
        <PlanButton type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
        </PlanButton>

        {/* Same treatment as Pricing's "contact our sales manager" link — a
            plain underlined link, not another button. */}
        <Link
          href="/register"
          className="text-sm text-cosmic-light underline decoration-cosmic-light/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/60"
        >
          Don&apos;t have an account? Register
        </Link>
      </div>
    </form>
  );
}
