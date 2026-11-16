import Multigraph from './Multigraph';
import { clockTime, formatHM } from './gauge';

const MODES = [
  { key: 'focus', label: 'FOCUS', name: 'Focus' },
  { key: 'short', label: 'SHORT', name: 'Short break' },
  { key: 'long', label: 'LONG', name: 'Long break' },
];

const ICON = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

function BoardIcon() {
  return (
    <svg {...ICON}>
      <line x1="9" y1="6" x2="21" y2="6"></line>
      <line x1="9" y1="12" x2="21" y2="12"></line>
      <line x1="9" y1="18" x2="21" y2="18"></line>
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"></circle>
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"></circle>
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"></circle>
    </svg>
  );
}
function TelemetryIcon() {
  return (
    <svg {...ICON}>
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  );
}
function WidgetIcon() {
  return (
    <svg {...ICON}>
      <rect x="3" y="4" width="18" height="14" rx="3"></rect>
      <rect x="12" y="10.5" width="6.5" height="5" rx="1.2" fill="currentColor" stroke="none"></rect>
    </svg>
  );
}
function SetupIcon() {
  return (
    <svg {...ICON}>
      <line x1="4" y1="21" x2="4" y2="14"></line>
      <line x1="4" y1="10" x2="4" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12" y2="3"></line>
      <line x1="20" y1="21" x2="20" y2="16"></line>
      <line x1="20" y1="12" x2="20" y2="3"></line>
      <line x1="1" y1="14" x2="7" y2="14"></line>
      <line x1="9" y1="8" x2="15" y2="8"></line>
      <line x1="17" y1="16" x2="23" y2="16"></line>
    </svg>
  );
}

/* ---- The screen --------------------------------------------------------- */

function NowTile({ tempo }) {
  const { mode, running, remainingMs, totalMs, focusInCycle, settings, currentTask } = tempo;
  const paused = !running && remainingMs < totalMs;
  let status;
  if (mode === 'focus') status = 'LAP ' + Math.min(focusInCycle + 1, settings.laps) + ' OF ' + settings.laps;
  else status = mode === 'long' ? 'LONG BREAK' : 'SHORT BREAK';
  if (running) status += ' · ENDS ' + clockTime(new Date(Date.now() + remainingMs));
  else if (paused) status += ' · PAUSED';

  return (
    <button
      type="button"
      className={'ck-tile ck-now' + (currentTask ? '' : ' ck-now--empty')}
      onClick={() => tempo.openPicker('switch')}
      title={currentTask ? 'Change focus task' : 'Set focus task'}
    >
      <span className="ck-tile-label">
        <span className="ck-lamp" data-on={running ? 'true' : 'false'}></span>
        {currentTask ? 'CURRENT TASK' : 'NO TASK SET'}
      </span>
      <span className="ck-now-text">{currentTask ? currentTask.text : 'Set a focus task'}</span>
      <span className="ck-now-foot">
        <span>{status}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 6 15 12 9 18"></polyline>
        </svg>
      </span>
    </button>
  );
}

function BoardTile({ tempo }) {
  const open = tempo.todos.filter((t) => !t.done);
  const queue = open.filter((t) => (t.bucket || 'today') === 'today' && t.id !== tempo.currentTaskId);
  return (
    <button type="button" className="ck-tile ck-board" onClick={tempo.openBoard} title="Open the pit board">
      <span className="ck-tile-label">
        UP NEXT
        <span className="ck-count">{queue.length}</span>
      </span>
      {queue.length === 0 ? (
        <span className="ck-board-empty">{open.length === 0 ? 'The board is clear.' : 'Nothing else for today.'}</span>
      ) : (
        <span className="ck-board-list">
          {queue.slice(0, 2).map((t) => (
            <span key={t.id} className="ck-board-item">
              {t.text}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

function TodayTile({ tempo }) {
  const { today } = tempo.stats;
  return (
    <button type="button" className="ck-tile ck-today" onClick={tempo.openTelemetry} title="Open telemetry">
      <span className="ck-tile-label">TODAY</span>
      <span className="ck-today-value">
        {today.s || 0}
        <span className="ck-today-unit">{today.s === 1 ? 'LAP' : 'LAPS'}</span>
      </span>
      <span className="ck-today-sub">{formatHM(today.m || 0)} focused</span>
    </button>
  );
}

function DockButton({ label, ariaLabel, onClick, lit, children }) {
  return (
    <button type="button" className="ck-dock-btn" data-lit={lit ? 'true' : 'false'} onClick={onClick} aria-label={ariaLabel} title={ariaLabel}>
      {children}
      <span>{label}</span>
    </button>
  );
}

/* ---- The shelf ---------------------------------------------------------- */

/** Three detents and a thumb that slides between them. */
function ModeSelector({ mode, onPick }) {
  const index = Math.max(0, MODES.findIndex((m) => m.key === mode));
  return (
    <div className="ck-mode" style={{ '--i': index }}>
      <div className="ck-mode-track" role="radiogroup" aria-label="Session type">
        <span className="ck-mode-thumb" aria-hidden="true"></span>
        {MODES.map((m) => (
          <button type="button" key={m.key} role="radio" aria-checked={m.key === mode} aria-label={m.name} className="ck-mode-stop" onClick={() => onPick(m.key)}>
            <span className="ck-mode-detent"></span>
          </button>
        ))}
      </div>
      <div className="ck-mode-legend" aria-hidden="true">
        {MODES.map((m) => (
          <span key={m.key} data-on={m.key === mode ? 'true' : 'false'}>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The key. Yellow in the hand; pressed home it goes dark and the colour moves
 * into the instruments — idle and running are told apart by where the yellow
 * is, not by a label you have to read.
 */
function StartKey({ running, paused, onToggle }) {
  return (
    <div className="ck-key-dock">
      <button type="button" className="ck-key" data-docked={running ? 'true' : 'false'} onClick={onToggle} aria-label="Start or pause">
        <span className="ck-key-lamp" aria-hidden="true"></span>
        <span className="ck-key-state">{running ? 'PAUSE' : paused ? 'RESUME' : 'START'}</span>
      </button>
    </div>
  );
}

function RoundButton({ label, ariaLabel, title, onClick, children }) {
  return (
    <div className="ck-round">
      <button type="button" className="ck-round-btn" onClick={onClick} aria-label={ariaLabel} title={title}>
        {children}
      </button>
      <span className="ck-engraved" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}

/**
 * The centre console: a glass screen in an aluminium frame, with the controls
 * you reach for without looking — mode, start, reset, skip — kept physical on
 * the shelf beneath it.
 */
export default function ControlPanel({ tempo, graphView, onCycleGraph, panel }) {
  const { mode, running, remainingMs, totalMs } = tempo;
  const paused = !running && remainingMs < totalMs;

  return (
    <section className="ck-cpanel" aria-label="Control panel">
      <div className="ck-screen">
        <div className="ck-screen-top">
          <NowTile tempo={tempo} />
          <Multigraph view={graphView} onCycle={onCycleGraph} running={running} remainingMs={remainingMs} totalMs={totalMs} />
        </div>
        <div className="ck-screen-mid">
          <BoardTile tempo={tempo} />
          <TodayTile tempo={tempo} />
        </div>
        <nav className="ck-dock" aria-label="Panels">
          <DockButton label="BOARD" ariaLabel="Open pit board (to-dos)" onClick={tempo.openBoard} lit={panel === 'board'}>
            <BoardIcon />
          </DockButton>
          <DockButton label="TELEMETRY" ariaLabel="Open telemetry (statistics)" onClick={tempo.openTelemetry} lit={panel === 'telemetry'}>
            <TelemetryIcon />
          </DockButton>
          <DockButton label="MINI" ariaLabel="Open mini widget" onClick={tempo.toggleWidget} lit={tempo.widget}>
            <WidgetIcon />
          </DockButton>
          <DockButton label="SET-UP" ariaLabel="Open set-up" onClick={tempo.openSetup} lit={panel === 'setup'}>
            <SetupIcon />
          </DockButton>
        </nav>
      </div>

      <div className="ck-shelf">
        <ModeSelector mode={mode} onPick={tempo.setMode} />
        <div className="ck-shelf-drive">
          <RoundButton label="RESET" ariaLabel="Reset session" title="Reset (R)" onClick={tempo.reset}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
          </RoundButton>
          <StartKey running={running} paused={paused} onToggle={tempo.toggleRun} />
          <RoundButton label="SKIP" ariaLabel="Skip to next session" title="Skip (S)" onClick={tempo.skip}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="5 4 15 12 5 20 5 4"></polygon>
              <line x1="19" y1="5" x2="19" y2="19"></line>
            </svg>
          </RoundButton>
        </div>
      </div>
      <span className="ck-grip" aria-hidden="true"></span>
    </section>
  );
}
