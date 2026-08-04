import { useEffect, useMemo, useRef, useState } from 'react';

function buildTicks() {
  const lines = [];
  for (let n = 0; n <= 54; n++) {
    const f = n / 54;
    const a = ((135 + f * 270) * Math.PI) / 180;
    const major = n % 5 === 0;
    const len = major ? 13 : 7;
    const red = f > 0.88;
    lines.push(
      <line
        key={n}
        x1={(220 + Math.cos(a) * (207 - len)).toFixed(2)}
        y1={(220 + Math.sin(a) * (207 - len)).toFixed(2)}
        x2={(220 + Math.cos(a) * 207).toFixed(2)}
        y2={(220 + Math.sin(a) * 207).toFixed(2)}
        stroke={red ? '#FF2800' : major ? 'var(--t-tickmajor)' : 'var(--t-tick)'}
        strokeWidth={major ? 2 : 1}
        opacity={red ? 0.85 : 1}
      />
    );
  }
  return lines;
}

export default function Dial({ mode, running, remainingMs, totalMs, focusInCycle, laps, currentTask, onTaskClick }) {
  const ticks = useMemo(buildTicks, []);

  // Ticker scroll for task names too long for the banner.
  const viewRef = useRef(null);
  const textRef = useRef(null);
  const [marquee, setMarquee] = useState(null);
  const taskText = currentTask ? currentTask.text : null;
  useEffect(() => {
    const measure = () => {
      const v = viewRef.current;
      const t = textRef.current;
      if (!v || !t) {
        setMarquee(null);
        return;
      }
      const overflow = t.scrollWidth - v.clientWidth;
      if (overflow > 4) setMarquee({ shift: -overflow, dur: Math.max(6, overflow / 25 + 4) });
      else setMarquee(null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [taskText]);

  const p = Math.min(1, Math.max(0, 1 - remainingMs / totalMs));
  const a = ((135 + p * 270) * Math.PI) / 180;
  const totalSec = Math.ceil(remainingMs / 1000);
  const paused = !running && remainingMs < totalMs;

  const nx = (220 + Math.cos(a) * 168).toFixed(2);
  const ny = (220 + Math.sin(a) * 168).toFixed(2);
  const arcOffset = (100 - p * 100).toFixed(3);
  const arcOpacity = p <= 0.0005 ? 0 : 1;

  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');

  const lapLine = mode === 'focus' ? 'LAP ' + Math.min(focusInCycle + 1, laps) + ' · ' + laps : 'PIT STOP';
  const timeColor = mode === 'focus' && running && remainingMs < 60000 ? 'var(--accent)' : 'var(--t-text)';
  const stateLine = running ? '' : paused ? 'PAUSED' : 'READY';
  const stateColor = paused ? 'var(--accent)' : 'var(--t-faint)';

  return (
    <section className="dial">
      <svg viewBox="0 0 440 440" aria-hidden="true" className="dial-svg">
        <g>{ticks}</g>
        <path
          d="M 101.2 338.8 A 168 168 0 1 1 338.8 338.8"
          pathLength="100"
          fill="none"
          stroke="var(--t-track)"
          strokeWidth="6"
          strokeLinecap="round"
        ></path>
        <path
          d="M 101.2 338.8 A 168 168 0 1 1 338.8 338.8"
          pathLength="100"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="6"
          strokeLinecap="round"
          className="dial-arc"
          style={{ strokeDasharray: '100 100', strokeDashoffset: arcOffset, opacity: arcOpacity }}
        ></path>
        <circle r="11" cx={nx} cy={ny} fill="var(--accent)" opacity="0.16"></circle>
        <circle r="5.5" cx={nx} cy={ny} fill="var(--accent)" className="dial-dot"></circle>
      </svg>
      <div className="dial-overlay">
        <div className="lap-line">{lapLine}</div>
        <div role="timer" className="timer-display" style={{ color: timeColor }}>
          <span>{mm}</span>
          <span className="timer-colon">:</span>
          <span>{ss}</span>
        </div>
        <div className="state-line" style={{ color: stateColor }}>
          {stateLine}
        </div>
      </div>
      <button
        type="button"
        className="task-banner"
        onClick={onTaskClick}
        title={currentTask ? 'Change focus task' : 'Set focus task'}
      >
        {currentTask ? (
          <>
            <span className="task-banner-label">CURRENT TASK</span>
            <span className="task-banner-pill">
              <span className={'task-banner-viewport' + (marquee ? ' task-banner-viewport--scroll' : '')} ref={viewRef}>
                <span
                  className={'task-banner-text' + (marquee ? ' task-banner-text--scroll' : '')}
                  ref={textRef}
                  style={marquee ? { '--marq-shift': marquee.shift + 'px', '--marq-dur': marquee.dur + 's' } : undefined}
                >
                  {currentTask.text}
                </span>
              </span>
            </span>
          </>
        ) : (
          <span className="task-banner-empty">+ SET FOCUS TASK</span>
        )}
      </button>
    </section>
  );
}
