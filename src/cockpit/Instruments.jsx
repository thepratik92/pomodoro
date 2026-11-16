import { useMemo } from 'react';
import Needle from './Needle';
import { SWEEP, SWEEP_PATH, SWEEP_START, TREND_VIEWS, arcPath, buildScale, clockTime, formatHM, needleRotation, pickRange, polar, stintScale, sweepAngle } from './gauge';

const VIEWBOX = '-200 -200 400 400';
const MODE_NAMES = { focus: 'FOCUS', short: 'SHORT BREAK', long: 'LONG BREAK' };

/**
 * One instrument: a machined bezel, a face sunk below it, and a lens over the
 * top. The children are the layers of the face, in stacking order — which is
 * the point of the thing: scale at the bottom, needle above it, glass above
 * that.
 */
function Well({ className, onClick, label, children }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={'ck-well ' + className} {...(onClick ? { type: 'button', onClick, 'aria-label': label } : {})}>
      <span className="ck-face">{children}</span>
      <span className="ck-lens" aria-hidden="true"></span>
    </Tag>
  );
}

function Ticks({ ticks, outer, majorLen, minorLen, reserveBelow = -1 }) {
  return ticks.map((t) => {
    const a = sweepAngle(t.f);
    const [x1, y1] = polar(outer, a);
    const [x2, y2] = polar(outer - (t.major ? majorLen : minorLen), a);
    return (
      <line
        key={t.v}
        x1={x1.toFixed(2)}
        y1={y1.toFixed(2)}
        x2={x2.toFixed(2)}
        y2={y2.toFixed(2)}
        className={'ck-tick' + (t.major ? ' ck-tick--major' : '') + (t.f <= reserveBelow ? ' ck-tick--reserve' : '')}
      />
    );
  });
}

// How far past the ends of the sweep the first and last numbers sit.
const TUCK_DEG = 13;

/**
 * The numbers on a scale. With `tuck`, the two at the ends of the sweep sit
 * just beyond it, under their marks: a needle at rest lies on one of them —
 * a full session, an empty count — and would otherwise strike it through.
 */
function Numerals({ ticks, r, className, tuck = false }) {
  return ticks
    .filter((t) => t.label !== null)
    .map((t) => {
      const nudge = !tuck ? 0 : t.f === 0 ? -TUCK_DEG : t.f === 1 ? TUCK_DEG : 0;
      const [x, y] = polar(nudge ? r + 6 : r, sweepAngle(t.f) + nudge);
      return (
        <text key={t.v} x={x.toFixed(2)} y={y.toFixed(2)} className={'ck-num ' + (className || '')}>
          {t.label}
        </text>
      );
    });
}

/* ---- Centre: the stint ------------------------------------------------- */

/**
 * Minutes remaining, read two ways at once. The needle and the lit band fall
 * back along the scale as the session runs down; the glass over the hub
 * carries the same figure in digits. The needle passes underneath that glass,
 * between the two layers.
 */
export function StintDial({ mode, running, remainingMs, totalMs }) {
  const totalMin = Math.round(totalMs / 60000);
  const ticks = useMemo(() => stintScale(totalMin), [totalMin]);

  const f = Math.min(1, Math.max(0, remainingMs / totalMs));
  // The last minute is the reserve: marked on the scale before it is reached.
  const reserve = Math.min(0.2, 60000 / totalMs);

  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const paused = !running && remainingMs < totalMs;
  const state = running ? 'ENDS ' + clockTime(new Date(Date.now() + remainingMs)) : paused ? 'PAUSED' : 'READY';

  return (
    <Well className="ck-stint">
      <svg viewBox={VIEWBOX} className="ck-scale" aria-hidden="true">
        <path d={SWEEP_PATH(187)} className="ck-band-track" />
        <path d={SWEEP_PATH(187)} pathLength="100" className="ck-band" style={{ strokeDasharray: `${(f * 100).toFixed(3)} 100` }} />
        <Ticks ticks={ticks} outer={177} majorLen={17} minorLen={8} reserveBelow={reserve} />
        <Numerals ticks={ticks} r={139} tuck />
        <text x="0" y="158" className="ck-unit">
          MIN
        </text>
      </svg>
      <Needle angle={needleRotation(f)} from={needleRotation(0)} length={172} tail={0} hub={0} width={6} />
      <span className="ck-puck">
        <span className="ck-puck-label">{MODE_NAMES[mode]}</span>
        <span role="timer" className="ck-digits">
          <span>{mm}</span>
          <span className="ck-colon">:</span>
          <span>{ss}</span>
        </span>
        <span className={'ck-puck-state' + (paused ? ' ck-puck-state--paused' : '')}>{state}</span>
      </span>
    </Well>
  );
}

/* ---- Left: the set ----------------------------------------------------- */

const LAP_GAP = 5;

/** Where in the set of laps this is: one segment per lap, needle on the current one. */
export function LapsDial({ mode, focusInCycle, laps }) {
  const span = (SWEEP - LAP_GAP * (laps - 1)) / laps;
  const done = Math.min(focusInCycle, laps);
  const inFocus = mode === 'focus';
  const current = Math.min(done, laps - 1);

  const segs = [];
  for (let i = 0; i < laps; i++) {
    const a0 = SWEEP_START + i * (span + LAP_GAP);
    segs.push({ i, a0, a1: a0 + span, mid: a0 + span / 2 });
  }

  // On a lap the needle sits on that lap; in the pits it rests on the line
  // between what is done and what comes next.
  let needleDeg = SWEEP_START;
  if (inFocus) needleDeg = segs[current].mid;
  else if (done > 0) needleDeg = done >= laps ? SWEEP_START + SWEEP : segs[done - 1].a1 + LAP_GAP / 2;

  return (
    <Well className="ck-side ck-laps">
      <svg viewBox={VIEWBOX} className="ck-scale" aria-hidden="true">
        {segs.map((s) => {
          const [x, y] = polar(128, s.mid);
          const state = s.i < done ? 'done' : inFocus && s.i === current ? 'current' : 'ahead';
          return (
            <g key={s.i}>
              <path d={arcPath(170, s.a0, s.a1)} className={'ck-seg ck-seg--' + state} />
              {laps <= 6 && (
                <text x={x.toFixed(2)} y={y.toFixed(2)} className={'ck-num ck-num--side' + (state === 'ahead' ? ' ck-num--dim' : '')}>
                  {s.i + 1}
                </text>
              )}
            </g>
          );
        })}
        <text x="0" y="98" className="ck-readout">
          {inFocus ? current + 1 : done}
          <tspan className="ck-readout-sub" dx="6">
            /{laps}
          </tspan>
        </text>
        <text x="0" y="152" className="ck-caption">
          {inFocus ? 'LAP' : 'DONE'}
        </text>
      </svg>
      <Needle angle={needleRotation((needleDeg - SWEEP_START) / SWEEP)} from={needleRotation(0)} length={100} width={8} hub={17} />
    </Well>
  );
}

/* ---- Right: the selectable parameter ----------------------------------- */

// [scale max, numbered every, marks between numbers]
const HOURS_TODAY = [[4, 1, 4], [8, 2, 4], [12, 3, 3], [24, 6, 6]];
const HOURS_WEEK = [[10, 2, 4], [20, 5, 5], [40, 10, 5], [80, 20, 4], [160, 40, 4]];
const DAYS_STREAK = [[7, 1, 1], [14, 2, 2], [30, 5, 5], [60, 10, 5], [120, 20, 4], [365, 73, 1]];

const TREND_NEXT = { today: 'this week', week: 'streak', streak: 'today' };

/**
 * What the practice adds up to. One dial, three readings, stepped through by
 * pressing it — the scale re-ranges itself so the needle is never pinned.
 */
export function TrendDial({ view, stats, onCycle }) {
  const v = TREND_VIEWS.includes(view) ? view : 'today';
  let value;
  let range;
  let readout;
  let caption;
  if (v === 'today') {
    value = stats.today.m / 60;
    range = pickRange(value, HOURS_TODAY);
    readout = formatHM(stats.today.m);
    caption = 'TODAY';
  } else if (v === 'week') {
    value = stats.weekM / 60;
    range = pickRange(value, HOURS_WEEK);
    readout = formatHM(stats.weekM);
    caption = '7 DAYS';
  } else {
    value = stats.streak;
    range = pickRange(value, DAYS_STREAK);
    readout = stats.streak + (stats.streak === 1 ? ' day' : ' days');
    caption = 'STREAK';
  }
  const [max, major, minorPer] = range;
  const ticks = useMemo(() => buildScale(max, major, minorPer), [max, major, minorPer]);

  return (
    <Well className="ck-side ck-trend" onClick={onCycle} label={`${caption.toLowerCase()}: ${readout}. Show ${TREND_NEXT[v]}`}>
      <svg viewBox={VIEWBOX} className="ck-scale" aria-hidden="true">
        <path d={SWEEP_PATH(178)} className="ck-rim" />
        <Ticks ticks={ticks} outer={178} majorLen={22} minorLen={11} />
        <Numerals ticks={ticks} r={128} className="ck-num--side" />
        <text x="0" y="112" className="ck-readout ck-readout--text">
          {readout}
        </text>
        <text x="0" y="152" className="ck-caption">
          {caption}
        </text>
        {TREND_VIEWS.map((k, i) => (
          <circle key={k} cx={(i - 1) * 16} cy="176" r="3.6" className={'ck-pip' + (k === v ? ' ck-pip--on' : '')} />
        ))}
      </svg>
      <Needle angle={needleRotation(value / max)} from={needleRotation(0)} length={100} width={8} hub={17} />
    </Well>
  );
}
