/* The speed dial's geometry, in the 440-unit box the main dial is drawn in.
   ----------------------------------------------------------------------------
   Both the full dial and the mini widget's ring read from here, so the two are
   the same instrument at two scales rather than two circles that happen to
   both show progress: a 270° sweep that starts at 7-o'clock and stops at
   5-o'clock — open at the bottom — a tick ring outside it with a red zone at
   the end of the lap, and a dot riding the progress. */

export const DIAL_BOX = 440;
export const DIAL_C = 220;
export const DIAL_START_DEG = 135;
export const DIAL_SWEEP_DEG = 270;
export const DIAL_ARC_R = 168;
export const DIAL_TICK_R = 207;
/** The arc as a path: 270° of r=168, from (101.2, 338.8) round to (338.8, 338.8). */
export const DIAL_ARC_PATH = 'M 101.2 338.8 A 168 168 0 1 1 338.8 338.8';
export const DIAL_STEPS = 54;
export const DIAL_MAJOR_EVERY = 5;
/** Where the tick ring turns red — the last stretch of the lap. */
export const DIAL_RED_FROM = 0.88;

function angleAt(progress) {
  return ((DIAL_START_DEG + progress * DIAL_SWEEP_DEG) * Math.PI) / 180;
}

/** Point on the sweep at `progress` (0..1), `radius` units from the centre. */
export function dialPoint(progress, radius = DIAL_ARC_R) {
  const a = angleAt(progress);
  return { x: DIAL_C + Math.cos(a) * radius, y: DIAL_C + Math.sin(a) * radius };
}

/**
 * The tick ring. `every` thins it for small renderings; `tickR` and the two
 * lengths exist because a mark is only legible above about 3px — held to the
 * dial's own 13-and-7 units a widget-sized ring draws 2px stubs that disappear,
 * so the small rendering lengthens them and pushes the ring out to keep its
 * clearance from the sweep. The closing mark is always kept, whatever the
 * thinning, so the ring still ends where the arc does.
 */
export function dialTicks({ every = 1, tickR = DIAL_TICK_R, majorLen = 13, minorLen = 7 } = {}) {
  const out = [];
  for (let n = 0; n <= DIAL_STEPS; n++) {
    if (every > 1 && n % every !== 0 && n !== DIAL_STEPS) continue;
    const f = n / DIAL_STEPS;
    const a = angleAt(f);
    const major = n % DIAL_MAJOR_EVERY === 0;
    const len = major ? majorLen : minorLen;
    out.push({
      n,
      major,
      red: f > DIAL_RED_FROM,
      x1: DIAL_C + Math.cos(a) * (tickR - len),
      y1: DIAL_C + Math.sin(a) * (tickR - len),
      x2: DIAL_C + Math.cos(a) * tickR,
      y2: DIAL_C + Math.sin(a) * tickR,
    });
  }
  return out;
}
