import Link from 'next/link';
import { AmbientStarField } from '@/components/features/AmbientStarField';
import { PlanCard, type Plan } from './PlanCard';

// Declared in price-ascending DOM order for keyboard/screen-reader users;
// `orderClass` reorders only the visual columns on desktop, centring Ultra.
// Names are marketing labels only — they don't map onto the backend's RBAC roles.
const PLANS: Plan[] = [
  {
    id: 'lite',
    name: 'Lite',
    price: 100,
    tagline: 'The CLI, wired to your own agent.',
    features: [
      'The full COS Code CLI — every `cos init` detection and wiring',
      'Bring your own agent: custom agent API, or GLM 5.2 Lite Connect',
      '5 GB COS Cloud storage',
    ],
    star: { box: 34, coreR: 2, bloomR: 10, spikeR: 12 },
    orderClass: 'md:order-1',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 200,
    tagline: 'Agents built in, everywhere you work.',
    features: [
      'Everything in Lite',
      'COS Agent built into both the CLI and the in-browser workspace',
      'ChatGPT, Claude and GLM API access included',
      '10 GB COS Cloud storage',
    ],
    star: { box: 46, coreR: 2.9, bloomR: 14, spikeR: 16.5 },
    orderClass: 'md:order-3',
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: 400,
    tagline: 'The same agents, with far more headroom.',
    features: [
      'Everything in Pro',
      'Substantially higher usage limits and rate',
      '25 GB COS Cloud storage',
    ],
    star: { box: 62, coreR: 4.2, bloomR: 21, spikeR: 25 },
    orderClass: 'md:order-2',
    featured: true,
  },
];

export function PricingSection() {
  return (
    // No ChromaticAberration here — nesting it broke Firefox, whose compositor
    // drops the DOM text where the Ultra card's own filters overlap it.
    <section id="pricing" className="relative overflow-hidden bg-bg">
      <AmbientStarField />

      <div className="relative z-10 flex flex-col items-center gap-14 px-6 py-24 md:py-32">
        <div className="flex flex-col items-center gap-4">
          <h2 className="font-display text-4xl text-ink md:text-6xl">
            Pricing
          </h2>
          <p className="max-w-md text-center text-sm text-foreground/60 md:text-base">
            The CLI is the product. The plan decides how much runs on our side.
          </p>
        </div>

        {/* Ultra's track is wider (1.2fr vs 1fr) — a real layout size, not a
            `transform: scale()`, which would distort UltraGlow's strokes. */}
        <ul className="grid w-full max-w-5xl grid-cols-1 items-stretch gap-6 md:grid-cols-[1fr_1.2fr_1fr] md:gap-5">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </ul>

        <Link
          href="/contact"
          className="text-cosmic-light decoration-cosmic-light/40 hover:text-ink hover:decoration-ink/60 text-sm underline underline-offset-4 transition-colors"
        >
          or contact our sales manager for other plans
        </Link>
      </div>
    </section>
  );
}
