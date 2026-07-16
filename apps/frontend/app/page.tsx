import { WordCycler } from "@/components/hero/WordCycler";
import { StarField } from "@/components/hero/StarField";
import { InstallCommand } from "@/components/hero/InstallCommand";
import { ChromaticAberration } from "@/components/hero/ChromaticAberration";
import { Button } from "@/components/ui/button";
import { FeaturesSection } from "@/components/features/FeaturesSection";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { PricingSection } from "@/components/pricing/PricingSection";

export default function Home() {
  return (
    <>
      <ChromaticAberration>
        <div
          id="home"
          className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-bg"
        >
          <StarField />
          <WordCycler />
          <InstallCommand />
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-11 border-2 border-primary/80 bg-primary/60 px-6"
            >
              Try COS Code
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="h-11 border-2 border-muted-foreground/80 px-6"
            >
              Get a demo
            </Button>
          </div>
        </div>
      </ChromaticAberration>

      <FeaturesSection />
      <ReviewsSection />
      <PricingSection />
    </>
  );
}
