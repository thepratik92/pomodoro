/* Shared geometry for the cockpit's instruments.
   ----------------------------------------------------------------------------
   Every dial is drawn in a 400-unit box centred on the origin, and every scale
   uses the same 270° sweep: from 7:30, clockwise over the top, to 4:30. The
   gap at the bottom is where a dial keeps its words. Angles are SVG degrees —
   0° points right, positive is clockwise. */

export const SWEEP_START = 135;
export const SWEEP = 270;

const rad = (deg) => (deg * Math.PI) / 180;

export function polar(r, deg) {
  return [Math.cos(rad(deg)) * r, Math.sin(rad(deg)) * r];
}

/** SVG angle for a fraction (0..1) of the sweep. */
export const sweepAngle = (f) => SWEEP_START + SWEEP * f;

/**
 * CSS rotation for a needle drawn pointing straight up. Kept continuous
 * (225° → 495°) rather than wrapped, so a spring between two readings travels
 * over the top of the dial, never through the gap at the bottom.
 */
export const needleRotation = (f) => sweepAngle(Math.min(1, Math.max(0, f))) + 90;

/** Clockwise arc of radius r from a0 to a1 (SVG degrees, a1 > a0). */
export function arcPath(r, a0, a1) {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export const SWEEP_PATH = (r) => arcPath(r, SWEEP_START, SWEEP_START + SWEEP);

/**
 * A scale from 0 to `max`, numbered every `major` and subdivided `minorPer`
 * times between numbers. The far end is always marked, numbered or not, so the
 * ring closes where the sweep does.
 */
export function buildScale(max, major, minorPer = 1) {
  const minor = major / minorPer;
  const count = Math.round(max / minor);
  const ticks = [];
  for (let i = 0; i <= count; i++) {
    const v = i * minor;
    const isMajor = i % minorPer === 0;
    ticks.push({ v, f: v / max, major: isMajor || i === count, label: isMajor ? v : null });
  }
  // A max that is not a multiple of the minor step still needs its end mark.
  if (count * minor < max - 1e-6) ticks.push({ v: max, f: 1, major: true, label: null });
  return ticks;
}

/**
 * The stint dial reads minutes remaining, so its scale is the session length.
 * Numbers are spaced so no more than ten ever sit on the ring; the marks
 * between them are minutes, or quarter-minutes on a short break, or fives on a
 * stint longer than an hour.
 */
export function stintScale(totalMin) {
  const major = [1, 2, 5, 10, 15, 20, 30].find((s) => totalMin / s <= 9) || 30;
  const minor = totalMin <= 10 ? 0.25 : totalMin <= 60 ? 1 : 5;
  return buildScale(totalMin, major, Math.max(1, Math.round(major / minor)));
}

/** Smallest range from `ranges` ([max, major, minorPer]) that holds `value`. */
export function pickRange(value, ranges) {
  return ranges.find((r) => value <= r[0]) || ranges[ranges.length - 1];
}

export function formatHM(minutes) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${String(m % 60).padStart(2, '0')}` : `${m}m`;
}

export function clockTime(date) {
  return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

/** The readings each selectable instrument steps through, in order. */
export const TREND_VIEWS = ['today', 'week', 'streak'];
export const GRAPH_VIEWS = ['clock', 'chrono'];
