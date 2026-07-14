'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { StarMark } from './starVisuals';

gsap.registerPlugin(useGSAP);

/** Matches Tailwind's `md`, so the JS layout switch and CSS breakpoints
 * flip at the same width (same discipline as WordCycler). */
const MOBILE_QUERY = '(max-width: 767px)';

type LabelDir = 'up' | 'down' | 'left' | 'right' | 'up-right' | 'up-left';

type StarDef = {
  id: string;
  /** The real star. Surfaced as a native tooltip via <title>. */
  star: string;
  /** What `cos init` wires up at this node. */
  label: string;
  /** Right ascension, decimal hours. */
  ra: number;
  /** Declination, degrees. */
  dec: number;
  /** Apparent magnitude — lower is brighter. Drives star size. */
  mag: number;
  /** Distance in light-years. Shown in the tooltip. */
  ly: number;
  labelDir: LabelDir;
  /** Narrow screens have no room for a label reaching out past the ends of
   * the figure, so those flip to sitting above/below the star instead. */
  labelDirMobile?: LabelDir;
  hub?: boolean;
};

/**
 * The Big Dipper — the seven bright stars of Ursa Major, and conveniently
 * exactly as many stars as there are nodes to place.
 *
 * Unlike a radial figure, the Dipper is a chain: a closed four-star bowl with
 * a three-star handle trailing off it. It has no true centre, so `cos init`
 * takes Megrez, the star where the handle meets the bowl — the only one of
 * the seven with three connections. Every star still reaches it, though
 * Alkaid is three hops out at the tip of the handle.
 *
 * Coordinates, magnitudes and distances are the real catalogue values.
 *
 * Tool→star assignment is not arbitrary: the short labels go on Alioth and
 * Mizar, mid-handle, where neighbouring stars crowd in from both sides, and
 * the longest label goes to Alkaid at the tip, where it has open space to
 * reach into.
 */
const BIG_DIPPER: StarDef[] = [
  { id: 'megrez', star: 'Megrez · δ Ursae Majoris', label: 'cos init', ra: 12.2571, dec: 57.033, mag: 3.31, ly: 80.5, labelDir: 'up-left', hub: true },
  { id: 'dubhe', star: 'Dubhe · α Ursae Majoris', label: 'CodeRabbit', ra: 11.0621, dec: 61.751, mag: 1.79, ly: 123, labelDir: 'up' },
  { id: 'merak', star: 'Merak · β Ursae Majoris', label: 'Skills', ra: 11.0307, dec: 56.383, mag: 2.37, ly: 79.7, labelDir: 'right' },
  { id: 'phecda', star: 'Phecda · γ Ursae Majoris', label: 'OpenSpec', ra: 11.8972, dec: 53.695, mag: 2.44, ly: 83.2, labelDir: 'down' },
  { id: 'alioth', star: 'Alioth · ε Ursae Majoris', label: 'MCP', ra: 12.9005, dec: 55.96, mag: 1.77, ly: 82.6, labelDir: 'up', labelDirMobile: 'down' },
  { id: 'mizar', star: 'Mizar · ζ Ursae Majoris', label: 'Agent', ra: 13.3987, dec: 54.925, mag: 2.27, ly: 82.9, labelDir: 'down' },
  { id: 'alkaid', star: 'Alkaid · η Ursae Majoris', label: '.md context', ra: 13.7923, dec: 49.313, mag: 1.86, ly: 103.9, labelDir: 'left', labelDirMobile: 'down' },
];

/**
 * The real Big Dipper figure: Dubhe→Merak→Phecda→Megrez closes the bowl, then
 * Megrez→Alioth→Mizar→Alkaid runs out along the handle. The bowl is a genuine
 * cycle rather than a tree — that's the actual shape, not a simplification.
 */
const EDGES: [string, string][] = [
  ['dubhe', 'merak'],
  ['merak', 'phecda'],
  ['phecda', 'megrez'],
  ['megrez', 'dubhe'],
  ['megrez', 'alioth'],
  ['alioth', 'mizar'],
  ['mizar', 'alkaid'],
];

const HUB = BIG_DIPPER[0];
const DEC_COS = Math.cos((HUB.dec * Math.PI) / 180);

/**
 * No rotation needed. Straight out of the catalogue with north up and west
 * to the right, the Dipper already lies wider than it is tall — bowl to the
 * right, handle sweeping down and away to the left — which is both its
 * natural orientation in the sky and a good fit for a wide stage. The knob
 * stays because a constellation's rotation depends on the hour you look.
 */
const ROTATION_DEG = 0;

/** Flat projection centred on the hub star. RA runs eastward — leftward on a
 * sky chart — hence the negation; scaling it by cos(dec) corrects meridian
 * convergence so the figure keeps its true proportions instead of smearing
 * sideways. SVG's y axis points down, so declination is negated too. */
function project(s: StarDef) {
  const x0 = -(s.ra - HUB.ra) * 15 * DEC_COS;
  const y0 = -(s.dec - HUB.dec);
  const th = (ROTATION_DEG * Math.PI) / 180;
  return {
    x: x0 * Math.cos(th) - y0 * Math.sin(th),
    y: x0 * Math.sin(th) + y0 * Math.cos(th),
  };
}

const MAG_MIN = Math.min(...BIG_DIPPER.map((s) => s.mag));
const MAG_MAX = Math.max(...BIG_DIPPER.map((s) => s.mag));

type Stage = {
  width: number;
  height: number;
  cx: number;
  cy: number;
  /** Box the star figure is fitted inside; labels live in the margin around
   * it. Fitted on a single uniform scale, never stretched — a stretched
   * constellation is no longer that constellation. */
  figureW: number;
  figureH: number;
  labelFontSize: number;
  hubFontSize: number;
  labelGap: number;
  starScale: number;
  mobile?: boolean;
};

// cy sits below the stage's vertical middle on both stages, so the figure
// hangs low under the heading rather than floating dead-centre.
const DESKTOP_STAGE: Stage = {
  width: 1000,
  height: 500,
  cx: 500,
  cy: 285,
  figureW: 620,
  figureH: 400,
  labelFontSize: 16,
  hubFontSize: 17,
  labelGap: 9,
  starScale: 1,
};

const MOBILE_STAGE: Stage = {
  width: 380,
  height: 500,
  cx: 190,
  cy: 285,
  // Figure deliberately narrower than the stage: the leftover width is what
  // the labels live in. Shrinking the constellation to buy label room is the
  // right trade at 375px — an unreadable label helps nobody.
  figureW: 250,
  figureH: 240,
  labelFontSize: 13,
  hubFontSize: 14,
  labelGap: 6,
  starScale: 0.66,
  mobile: true,
};

type Baseline = 'auto' | 'middle' | 'hanging';

const LABEL_DIRS: Record<
  LabelDir,
  { dx: number; dy: number; anchor: 'start' | 'middle' | 'end'; baseline: Baseline }
> = {
  up: { dx: 0, dy: -1, anchor: 'middle', baseline: 'auto' },
  down: { dx: 0, dy: 1, anchor: 'middle', baseline: 'hanging' },
  left: { dx: -1, dy: 0, anchor: 'end', baseline: 'middle' },
  right: { dx: 1, dy: 0, anchor: 'start', baseline: 'middle' },
  // The hub has edges leaving toward the bowl (up-right and down-right) and
  // the handle (down-left), so the upper left is the one quadrant its label
  // can occupy without crossing a line.
  'up-right': { dx: 0.78, dy: -0.78, anchor: 'start', baseline: 'auto' },
  'up-left': { dx: -0.78, dy: -0.78, anchor: 'end', baseline: 'auto' },
};

const round = (n: number) => Math.round(n * 1000) / 1000;

function buildLayout(stage: Stage) {
  const pts = BIG_DIPPER.map(project);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const skyCx = (minX + maxX) / 2;
  const skyCy = (minY + maxY) / 2;
  const scale = Math.min(stage.figureW / (maxX - minX), stage.figureH / (maxY - minY));

  return BIG_DIPPER.map((def, i) => {
    const brightness = (MAG_MAX - def.mag) / (MAG_MAX - MAG_MIN);
    // The hub is sized by fiat rather than by magnitude. This is a bigger
    // departure than it looks: Megrez is famously the *faintest* of the seven
    // (mag 3.31), yet it has to read as the anchor here. The other six keep
    // their true magnitude ordering.
    const coreR = round((def.hub ? 5 : 1.5 + brightness * 2.3) * stage.starScale);
    const bloomR = round(coreR * (def.hub ? 5.4 : 4.6));
    const spikeR = round(coreR * (def.hub ? 6.6 : 5.4));
    const dir = LABEL_DIRS[(stage.mobile && def.labelDirMobile) || def.labelDir];
    const gap = bloomR * 0.42 + stage.labelGap;

    return {
      ...def,
      x: round(stage.cx + (pts[i].x - skyCx) * scale),
      y: round(stage.cy + (pts[i].y - skyCy) * scale),
      coreR,
      bloomR,
      spikeR,
      labelX: round(dir.dx * gap),
      labelY: round(dir.dy * gap),
      anchor: dir.anchor,
      baseline: dir.baseline,
    };
  });
}

type LaidOutStar = ReturnType<typeof buildLayout>[number];

const ARIA_LABEL = `The Big Dipper, with cos init at the join between its bowl and handle, connected to ${BIG_DIPPER.filter(
  (s) => !s.hub,
)
  .map((s) => s.label)
  .join(', ')}.`;

export function InitConstellation() {
  const scopeRef = useRef<SVGSVGElement>(null);
  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery(MOBILE_QUERY);

  const stage = isMobile ? MOBILE_STAGE : DESKTOP_STAGE;
  const stars = buildLayout(stage);
  const index = new Map(stars.map((s, i) => [s.id, i]));

  useGSAP(
    () => {
      if (reducedMotion) return;
      const svg = scopeRef.current;
      if (!svg) return;

      // The stars themselves are fixed — no parallax, no drift. The only
      // motion left is a slow breathe across the edges, so the wiring reads
      // as live rather than printed, while the constellation itself stays
      // exactly where the catalogue puts it.
      const lines = svg.querySelectorAll<SVGLineElement>('[data-edge]');
      gsap.to(lines, {
        opacity: 0.5,
        duration: 4.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: { each: 0.5, from: 'center' },
      });
    },
    { dependencies: [reducedMotion, isMobile], scope: scopeRef },
  );

  return (
    <svg
      ref={scopeRef}
      viewBox={`0 0 ${stage.width} ${stage.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="max-h-[70vh] w-full max-w-5xl md:max-h-[62vh]"
      role="img"
      aria-label={ARIA_LABEL}
    >
      {EDGES.map(([from, to]) => {
        const a = stars[index.get(from)!];
        const b = stars[index.get(to)!];
        return (
          <line
            key={`${from}-${to}`}
            data-edge
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className="stroke-cosmic-light"
            strokeWidth={1}
            opacity={0.26}
          />
        );
      })}

      {stars.map((s) => (
        <Star key={s.id} star={s} stage={stage} />
      ))}
    </svg>
  );
}

function Star({ star, stage }: { star: LaidOutStar; stage: Stage }) {
  return (
    <g transform={`translate(${star.x} ${star.y})`}>
      <title>{`${star.star} · ${star.ly} ly — ${star.label}`}</title>
      <StarMark coreR={star.coreR} bloomR={star.bloomR} spikeR={star.spikeR} />
      <text
        x={star.labelX}
        y={star.labelY}
        textAnchor={star.anchor}
        dominantBaseline={star.baseline}
        fontSize={star.hub ? stage.hubFontSize : stage.labelFontSize}
        className={
          star.hub ? 'fill-ink font-mono' : 'fill-cosmic-light font-mono uppercase tracking-widest'
        }
      >
        {star.label}
      </text>
    </g>
  );
}
