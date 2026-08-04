import { useMemo } from 'react';

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
        <button
          type="button"
          className={'task-line' + (currentTask ? '' : ' task-line--empty')}
          onClick={onTaskClick}
          title={currentTask ? 'Change focus task' : 'Set focus task'}
        >
          {currentTask ? (
            <>
              <span className="task-line-dot"></span>
              <span className="task-line-text">{currentTask.text}</span>
            </>
          ) : (
            '+ SET FOCUS TASK'
          )}
        </button>
      </div>
    </section>
  );
}
