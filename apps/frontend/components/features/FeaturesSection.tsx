import { StarField } from '@/components/hero/StarField';
import { AmbientStarField } from './AmbientStarField';
import { InitConstellation } from './InitConstellation';
import { FeatureStars } from './FeatureStars';
import { StarGradientDefs } from './starVisuals';

export function FeaturesSection() {
  return (
    <section id="features" className="relative overflow-hidden bg-bg">
      {/* Three depth layers, far to near: the dim ambient field, the hero's
          drifting StarField reused verbatim, then the constellation on top. */}
      <AmbientStarField />
      <StarField />

      {/* Gradient defs for this section's star marks, mounted once. */}
      <StarGradientDefs />

      {/* content sits above the star layers (z-0) */}
      <div className="relative z-10">
        {/* Part 1 — One Command, Fully Wired (full-screen). */}
        <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
          <h2 className="font-display text-4xl text-ink md:text-6xl">
            One Command, Fully Wired
          </h2>
          <InitConstellation />
        </div>

        {/* Part 2 — COS Code Features (scroll pillar). Header and tagline sit
            in their own tight group so only that gap shrinks. */}
        <div className="flex flex-col items-center gap-16 px-6 py-24 md:gap-24">
          <div className="flex flex-col items-center gap-4 md:gap-6">
            <h2 className="font-display text-4xl text-ink md:text-6xl">
              COS Code Features
            </h2>
            <p className="max-w-md text-center text-sm text-foreground/60 md:text-base">
              Everything from the box — no config to write, no plugins to hunt
              down.
            </p>
          </div>
          <FeatureStars />
        </div>
      </div>
    </section>
  );
}
