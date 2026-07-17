import { cn } from '@/lib/utils';

/** The dark ledge under the button that sells the 3D protrusion. Derived from
 * the cosmic token rather than hardcoded, so it tracks the palette. */
const LEDGE = 'color-mix(in oklab, var(--color-cosmic) 55%, black)';

/**
 * Deliberately NOT a variant on the shared `Button`.
 *
 * This button presses in on **hover** rather than on click — the inverse of the
 * usual affordance (hover invites, `:active` confirms), requested on purpose
 * for this section. Every other CTA on the site (Register, Login, "Try COS
 * Code") relies on `Button` behaving the ordinary way, so that unconventional
 * behaviour is kept local instead of leaking into shared semantics.
 *
 * Pure CSS, no GSAP: this is a two-state hover, the same call
 * IntegrationsMarquee's wordmarks already make. `motion-reduce:transition-none`
 * keeps the affordance but drops the animation for users who asked for less
 * motion — the state still changes, it just changes instantly.
 */
export function PlanButton({
  children,
  className,
  type = 'button',
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  /** Defaults to 'button' to preserve pricing's existing non-form usage — the
   * auth pages that reuse this component pass 'submit' explicitly, since a
   * plain click on a `type="button"` element inside a `<form>` never
   * triggers submission. */
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      style={{ ['--ledge' as string]: LEDGE }}
      className={cn(
        'group relative isolate w-full overflow-hidden rounded-xl px-6 py-3 font-medium text-ink',
        'bg-gradient-to-b from-cosmic-light to-cosmic',
        'disabled:pointer-events-none disabled:opacity-50',
        // Resting: popped forward — a solid ledge directly beneath, plus a cast
        // shadow further down for depth. `perspective()` is chained as the
        // first function in `transform` itself (not the separate Tailwind
        // `perspective-*` utility, which sets a property meant for a *parent*
        // of the rotated element) — self-contained on this one element, no
        // parent/child setup required. Without it, `rotateX` on a flat page has
        // no vanishing point to foreshorten toward and just looks like a
        // vertical squash.
        '[transform:perspective(500px)_rotateX(0deg)_translateY(0px)] shadow-[0_4px_0_0_var(--ledge),0_7px_14px_-3px_rgba(0,0,0,0.65)]',
        'transition-[transform,box-shadow,filter] duration-150 ease-out motion-reduce:transition-none',
        // Hover: tips back and compresses toward the surface in one motion —
        // the rotateX is what turns "slides down" into "pivots into the
        // surface," and the ledge shrinks as the button travels down over it.
        // The fill brightens too, so the press reads as lighting up under the
        // cursor, not just moving. Same translateY distance as before.
        'hover:[transform:perspective(500px)_rotateX(-6deg)_translateY(3px)] hover:brightness-115 hover:shadow-[0_1px_0_0_var(--ledge),0_2px_6px_-2px_rgba(0,0,0,0.5)]',
        // Click still has somewhere further to go — both deeper translateY and
        // a sharper tilt — so a real press stays distinguishable from merely
        // hovering.
        'active:[transform:perspective(500px)_rotateX(-10deg)_translateY(5px)] active:brightness-95 active:shadow-[0_0_0_0_var(--ledge),0_1px_2px_-1px_rgba(0,0,0,0.45)]',
        // Keyboard users never trigger :hover, so focus gets its own signal.
        'focus-visible:ring-cosmic-light focus-visible:ring-offset-bg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        className,
      )}
    >
      {/* Sheen: a soft diagonal highlight parked off the left edge that sweeps
          across on hover. Pure CSS transform on a pseudo-free child — cheap,
          compositor-friendly, and it needs no JS to reset when the pointer
          leaves. `motion-reduce` parks it permanently off-screen rather than
          sweeping. */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 -left-full -z-10 w-full',
          'bg-gradient-to-r from-transparent via-white/25 to-transparent',
          'transition-transform duration-500 ease-out',
          'group-hover:translate-x-[200%] motion-reduce:hidden motion-reduce:transition-none',
        )}
      />
      {children}
    </button>
  );
}
