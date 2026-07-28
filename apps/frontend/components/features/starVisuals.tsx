/**
 * Star rendering shared across the features section.
 *
 * The gradients live in one hidden sprite, not per-SVG: `url(#id)` resolves
 * document-wide, so duplicating the defs would mean invalid duplicate IDs.
 * The trade-off is that anything rendering <StarMark> needs <StarGradientDefs>
 * mounted on the page — FeaturesSection mounts it once.
 */

const BLOOM_ID = 'cos-star-bloom';
const SPIKE_ID = 'cos-star-spike';

const round = (n: number) => Math.round(n * 1000) / 1000;

/** A four-pointed sparkle: straight spikes pinched to a narrow waist — what
 * sells "star" over "dot". */
export function spikePath(r: number) {
  const k = round(r * 0.075);
  const R = round(r);
  return `M 0 ${-R} Q ${k} ${-k} ${R} 0 Q ${k} ${k} 0 ${R} Q ${-k} ${k} ${-R} 0 Q ${-k} ${-k} 0 ${-R} Z`;
}

/**
 * Mount once per page. Follows the same hidden-svg pattern ChromaticAberration
 * already uses for its filter defs.
 */
export function StarGradientDefs() {
  return (
    <svg
      className="absolute h-0 w-0 overflow-hidden"
      aria-hidden
      focusable="false"
    >
      <defs>
        {/* Bloom as a radial gradient, not an feGaussianBlur — plain paint
            with no per-star re-rasterisation, and it gives the white-hot core
            falling off through cosmic purple. */}
        <radialGradient id={BLOOM_ID}>
          <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
          <stop
            offset="14%"
            style={{ stopColor: '#ffffff', stopOpacity: 0.82 }}
          />
          <stop
            offset="32%"
            style={{ stopColor: 'var(--color-cosmic-light)', stopOpacity: 0.5 }}
          />
          <stop
            offset="62%"
            style={{ stopColor: 'var(--color-cosmic)', stopOpacity: 0.16 }}
          />
          <stop
            offset="100%"
            style={{ stopColor: 'var(--color-cosmic)', stopOpacity: 0 }}
          />
        </radialGradient>
        <radialGradient id={SPIKE_ID}>
          <stop
            offset="0%"
            style={{ stopColor: '#ffffff', stopOpacity: 0.9 }}
          />
          <stop
            offset="45%"
            style={{
              stopColor: 'var(--color-cosmic-light)',
              stopOpacity: 0.32,
            }}
          />
          <stop
            offset="100%"
            style={{ stopColor: 'var(--color-cosmic-light)', stopOpacity: 0 }}
          />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** The star itself, drawn around the origin of whatever SVG hosts it. */
export function StarMark({
  coreR,
  bloomR,
  spikeR,
}: {
  coreR: number;
  bloomR: number;
  spikeR: number;
}) {
  return (
    <>
      <circle r={bloomR} fill={`url(#${BLOOM_ID})`} />
      <path d={spikePath(spikeR)} fill={`url(#${SPIKE_ID})`} />
      <circle r={coreR} fill="#ffffff" />
    </>
  );
}
