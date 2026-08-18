import './MiniWidget.css';

const MODE_NAMES = { focus: 'FOCUS', short: 'SHORT BREAK', long: 'LONG BREAK' };

/** "0m", "45m", "1h 20m" — the metrics row has to stay short at any width. */
function formatFocus(min) {
  const m = Math.max(0, Math.round(min || 0));
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? h + 'h ' + r + 'm' : h + 'h';
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mw-play-icon">
      <path d="M8.5 5.6 19 12 8.5 18.4Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mw-play-icon">
      <rect x="8" y="5.6" width="2.9" height="12.8" rx="1.1" fill="currentColor" />
      <rect x="13.1" y="5.6" width="2.9" height="12.8" rx="1.1" fill="currentColor" />
    </svg>
  );
}

/**
 * The floating mini timer. Pure presentation: the same tree is portalled into
 * a Picture-in-Picture window and rendered into the in-app floating card, so
 * every size rule lives in CSS container queries off `.mw` rather than in
 * whichever host happens to be showing it.
 */
export default function MiniWidget({
  variant = 'floating',
  mode,
  running,
  remainingMs,
  totalMs,
  currentTask,
  todayFocusMin,
  weekFocusMin,
  pinned,
  canPin,
  onToggleRun,
  onTogglePin,
  onClose,
  onDragPointerDown,
  onResizePointerDown,
}) {
  const p = Math.min(1, Math.max(0, 1 - remainingMs / totalMs));
  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const paused = !running && remainingMs < totalMs;

  const label = mode === 'focus' && currentTask ? currentTask.text : MODE_NAMES[mode];
  const isTask = mode === 'focus' && Boolean(currentTask);
  const urgent = mode === 'focus' && running && remainingMs < 60000;

  return (
    <div
      className={'mw mw--' + variant + (running ? ' mw--running' : '')}
      onPointerDown={onDragPointerDown}
    >
      {/* `.mw` is the size container and nothing else: a container cannot
          answer its own queries, and container units inside its own padding
          would be circular. Every laid-out thing lives one level in. */}
      <div className="mw-inner">
        <div className="mw-chrome" data-no-drag="">
          <button
            type="button"
            className={'mw-chrome-btn' + (pinned ? ' is-on' : '')}
            onClick={onTogglePin}
            disabled={!canPin && !pinned}
            aria-pressed={pinned}
            aria-label={pinned ? 'Unpin: keep the widget inside the app window' : 'Pin on top: float above every other window'}
            title={
              !canPin && !pinned
                ? 'Always on top needs a Chromium browser or the installed app'
                : pinned
                  ? 'Always on top — click to keep it inside the app window'
                  : 'Pin on top of every window'
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 3.5h5l-.7 5.2 3.2 3.1H7l3.2-3.1z" />
              <line x1="12" y1="11.8" x2="12" y2="20.5" />
            </svg>
          </button>
          <button type="button" className="mw-chrome-btn" onClick={onClose} aria-label="Close mini widget" title="Back to the full app">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
              <line x1="17.5" y1="6.5" x2="6.5" y2="17.5" />
            </svg>
          </button>
        </div>

        <div className="mw-main">
          <div className="mw-ring">
            <svg viewBox="0 0 100 100" aria-hidden="true" className="mw-ring-svg">
              <circle cx="50" cy="50" r="44" pathLength="100" fill="none" stroke="var(--t-track)" strokeWidth="5" />
              <circle
                cx="50"
                cy="50"
                r="44"
                pathLength="100"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="5"
                strokeLinecap="round"
                className="mw-ring-arc"
                style={{ strokeDasharray: '100 100', strokeDashoffset: 100 - p * 100, opacity: p <= 0.0005 ? 0 : 1 }}
              />
            </svg>
            <button
              type="button"
              className="mw-play"
              data-no-drag=""
              onClick={onToggleRun}
              aria-label={running ? 'Pause' : 'Start'}
              title={running ? 'Pause' : 'Start'}
            >
              {running ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>

          <div className="mw-read">
            <div className={'mw-label' + (isTask ? ' mw-label--task' : '')} title={label}>
              {label}
            </div>
            <div role="timer" className={'mw-time' + (urgent ? ' mw-time--urgent' : '')}>
              {mm}
              <span className="mw-time-colon">:</span>
              {ss}
            </div>
            <div className="mw-state">{running ? '' : paused ? 'PAUSED' : 'READY'}</div>
          </div>
        </div>

        <div className="mw-metrics">
          <div className="mw-metric">
            <span className="mw-metric-key">
              TODAY<span className="mw-key-tail"> FOCUS</span>
            </span>
            <span className="mw-metric-val">{formatFocus(todayFocusMin)}</span>
          </div>
          <span className="mw-metric-sep" aria-hidden="true"></span>
          <div className="mw-metric">
            <span className="mw-metric-key">
              WEEK<span className="mw-key-tail"> FOCUS</span>
            </span>
            <span className="mw-metric-val">{formatFocus(weekFocusMin)}</span>
          </div>
        </div>

        {onResizePointerDown && (
          <span
            className="mw-resize"
            data-no-drag=""
            onPointerDown={onResizePointerDown}
            role="separator"
            aria-label="Resize widget"
            title="Drag to resize"
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <line x1="11" y1="4" x2="4" y2="11" />
              <line x1="11" y1="8.5" x2="8.5" y2="11" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
