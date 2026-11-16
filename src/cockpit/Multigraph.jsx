import { useEffect, useState } from 'react';
import { Rotor } from './Needle';
import { useShortestAngle } from './useShortestAngle';
import { polar } from './gauge';

const VIEWBOX = '-200 -200 400 400';

function useNow(intervalMs) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(iv);
  }, [intervalMs]);
  return now;
}

const MARKS = Array.from({ length: 60 }, (_, i) => i);

function Hand({ angle, className, children }) {
  return (
    <Rotor angle={useShortestAngle(angle)} hand className={className}>
      <svg viewBox={VIEWBOX}>{children}</svg>
    </Rotor>
  );
}

/**
 * Three hands, two jobs. As a clock they tell the time of day, and while a
 * session runs a marker on the minute track shows where it will end. Pressed,
 * the same hands regroup into a chronograph for the session itself: the thin
 * hand counts seconds, the long hand the minutes elapsed, and the short hand
 * parks on the session's length — so the long hand is chasing the short one.
 */
export default function Multigraph({ view, onCycle, running, remainingMs, totalMs }) {
  const now = useNow(1000);
  const chrono = view === 'chrono';

  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  const totalMin = totalMs / 60000;
  const span = totalMin <= 60 ? 60 : 120;
  const elapsedMs = Math.max(0, totalMs - remainingMs);
  const elapsedSec = Math.floor(elapsedMs / 1000);

  let hourDeg;
  let minDeg;
  let secDeg;
  let readout;
  if (chrono) {
    secDeg = (elapsedSec % 60) * 6;
    minDeg = (elapsedMs / 60000 / span) * 360;
    hourDeg = (totalMin / span) * 360;
    readout = String(Math.floor(elapsedSec / 60)).padStart(2, '0') + ':' + String(elapsedSec % 60).padStart(2, '0');
  } else {
    secDeg = s * 6;
    minDeg = (m + s / 60) * 6;
    hourDeg = ((h % 12) + m / 60) * 30;
    readout = '';
  }

  const numerals = chrono ? [span, span / 4, span / 2, (span * 3) / 4] : [12, 3, 6, 9];

  // Where on the minute track the running session ends.
  let eta = null;
  if (!chrono && running) {
    const end = new Date(now.getTime() + remainingMs);
    eta = (end.getMinutes() + end.getSeconds() / 60) * 6 - 90;
  }

  return (
    <button
      type="button"
      className="ck-well ck-multigraph"
      onClick={onCycle}
      aria-label={chrono ? `Chronograph, ${readout} elapsed. Show clock` : 'Clock. Show session chronograph'}
      title={chrono ? 'Chronograph — press for the clock' : 'Clock — press for the session chronograph'}
    >
      <span className="ck-face">
        <svg viewBox={VIEWBOX} className="ck-scale" aria-hidden="true">
          {MARKS.map((i) => {
            const five = i % 5 === 0;
            const quarter = i % 15 === 0;
            const [x1, y1] = polar(180, i * 6 - 90);
            const [x2, y2] = polar(180 - (quarter ? 26 : five ? 18 : 7), i * 6 - 90);
            return (
              <line
                key={i}
                x1={x1.toFixed(2)}
                y1={y1.toFixed(2)}
                x2={x2.toFixed(2)}
                y2={y2.toFixed(2)}
                className={'ck-tick' + (five ? ' ck-tick--major' : '')}
              />
            );
          })}
          {numerals.map((n, i) => {
            const [x, y] = polar(124, i * 90 - 90);
            return (
              <text key={i + ':' + n} x={x.toFixed(2)} y={y.toFixed(2)} className="ck-num ck-num--graph">
                {n}
              </text>
            );
          })}
          {eta !== null && (
            <path
              d="M 0 -196 L 9 -180 L -9 -180 Z"
              className="ck-eta"
              transform={`rotate(${(eta + 90).toFixed(2)})`}
            />
          )}
        </svg>
        <span className="ck-needle" aria-hidden="true">
          <Hand angle={hourDeg}>
            <rect x="-7" y="-96" width="14" height="110" rx="7" className="ck-hand" />
          </Hand>
          <Hand angle={minDeg}>
            <rect x="-5" y="-146" width="10" height="160" rx="5" className="ck-hand" />
          </Hand>
          <Hand angle={secDeg}>
            <rect x="-2" y="-158" width="4" height="196" rx="2" className="ck-hand ck-hand--sec" />
          </Hand>
          <svg viewBox={VIEWBOX} className="ck-hub">
            <circle r="13" className="ck-hub-cap" />
            <circle r="4.5" className="ck-hub-pin" />
          </svg>
        </span>
      </span>
      <span className="ck-lens" aria-hidden="true"></span>
    </button>
  );
}
