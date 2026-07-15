import { AmbientStarField } from '@/components/features/AmbientStarField';
import { ReviewStars } from './ReviewStars';
import { IntegrationsMarquee } from './IntegrationsMarquee';
import { FaqList } from './FaqList';

export function ReviewsSection() {
  return (
    <section id="reviews" className="relative overflow-hidden bg-bg">
      {/* Reused as-is from the features section — dim, parallaxing,
          reduced-motion-safe. StarGradientDefs is already mounted once on the
          page by FeaturesSection, which is what the StarMarks below resolve
          against; nothing here needs to remount it. */}
      <AmbientStarField />

      <div className="relative z-10 flex flex-col items-center gap-32 px-6 py-24 md:gap-40 md:py-32">
        {/* Part 1 — Reviews */}
        <div className="flex w-full flex-col items-center gap-10">
          <h2 className="font-display text-4xl text-ink md:text-6xl">They trust our product</h2>
          <ReviewStars />
        </div>

        {/* Part 2 — Integrates with. No CTA: this states a technical fact, it
            isn't an invitation to click anywhere. */}
        <div className="flex w-full flex-col items-center gap-8">
          <p className="text-sm tracking-widest text-foreground/50 uppercase">Integrates with</p>
          <IntegrationsMarquee />
        </div>

        {/* Part 3 — FAQ */}
        <div className="flex w-full flex-col items-center gap-12">
          <h2 className="font-display text-4xl text-ink md:text-6xl">Questions</h2>
          <FaqList />
        </div>
      </div>
    </section>
  );
}
