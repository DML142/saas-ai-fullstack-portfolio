import { cn } from '@/lib/utils';

/** The dark ledge under the button that sells the 3D protrusion. Derived from
 * the cosmic token rather than hardcoded, so it tracks the palette. */
const LEDGE = 'color-mix(in oklab, var(--color-cosmic) 55%, black)';

/** Deliberately NOT a variant on the shared `Button` — presses in on hover
 * rather than click, kept local so that doesn't leak into every other CTA. */
export function PlanButton({
  children,
  className,
  type = 'button',
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  /** Defaults to 'button' for pricing's non-form usage; the auth pages pass
   * 'submit' explicitly. */
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ['--ledge' as string]: LEDGE }}
      className={cn(
        'group relative isolate w-full overflow-hidden rounded-xl px-6 py-3 font-medium text-ink',
        'bg-linear-to-b from-cosmic-light to-cosmic',
        'disabled:pointer-events-none disabled:opacity-50',
        // `perspective()` is chained into this element's own `transform` (not
        // the parent-oriented Tailwind utility) so `rotateX` gets a vanishing point.
        'transform-[perspective(500px)_rotateX(0deg)_translateY(0px)] shadow-[0_4px_0_0_var(--ledge),0_7px_14px_-3px_rgba(0,0,0,0.65)]',
        'transition-[transform,box-shadow,filter] duration-150 ease-out motion-reduce:transition-none',
        // Hover: tips back (rotateX) and sinks toward the surface as the ledge
        // shrinks; the fill brightens so it reads as lighting up, not just moving.
        'hover:transform-[perspective(500px)_rotateX(-6deg)_translateY(3px)] hover:brightness-115 hover:shadow-[0_1px_0_0_var(--ledge),0_2px_6px_-2px_rgba(0,0,0,0.5)]',
        // Click sinks deeper with a sharper tilt, so a press stays distinct
        // from a hover.
        'active:transform-[perspective(500px)_rotateX(-10deg)_translateY(5px)] active:brightness-95 active:shadow-[0_0_0_0_var(--ledge),0_1px_2px_-1px_rgba(0,0,0,0.45)]',
        // Keyboard users never trigger :hover, so focus gets its own signal.
        'focus-visible:ring-cosmic-light focus-visible:ring-offset-bg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        className,
      )}
    >
      {/* Sheen: a diagonal highlight parked off the left edge, sweeps on hover. */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 -left-full -z-10 w-full',
          'bg-linear-to-r from-transparent via-white/25 to-transparent',
          'transition-transform duration-500 ease-out',
          'group-hover:translate-x-[200%] motion-reduce:hidden motion-reduce:transition-none',
        )}
      />
      {children}
    </button>
  );
}
