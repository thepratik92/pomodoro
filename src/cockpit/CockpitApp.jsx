import { useCallback, useLayoutEffect, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import './fonts/fonts.css';
import './cockpit.css';
import './skin.css';
import { LapsDial, StintDial, TrendDial } from './Instruments';
import ControlPanel from './ControlPanel';
import { GRAPH_VIEWS, TREND_VIEWS } from './gauge';
import PitBoard from '../components/PitBoard';
import TaskPicker from '../components/TaskPicker';
import Telemetry from '../components/Telemetry';
import Setup from '../components/Setup';
import WidgetHost from '../components/WidgetHost';
import { pipSupported } from '../hooks/usePipWindow';

// Which reading each selectable instrument was left on. Local to this device
// and to this interface, so it stays out of the synced settings.
const PREFS_KEY = 'tempo-cockpit';

function loadPrefs() {
  const prefs = { trend: TREND_VIEWS[0], graph: GRAPH_VIEWS[0] };
  try {
    const p = JSON.parse(window.localStorage?.getItem(PREFS_KEY) || 'null');
    if (p && TREND_VIEWS.includes(p.trend)) prefs.trend = p.trend;
    if (p && GRAPH_VIEWS.includes(p.graph)) prefs.graph = p.graph;
  } catch {
    /* unreadable — start from the defaults */
  }
  return prefs;
}

function after(list, current) {
  return list[(list.indexOf(current) + 1) % list.length];
}

/**
 * The cockpit interface: an instrument binnacle and a control panel, over the
 * same useTempo state as the classic shell. The task picker, pit board,
 * telemetry and set-up are the classic components, re-dressed by skin.css —
 * the beta is a new face, not a second implementation of the app.
 */
export default function CockpitApp({ tempo, ui, onSetUi }) {
  const { mode, running, remainingMs, totalMs, panel, widget, widgetPinned, settings, stats, sync } = tempo;

  const [prefs, setPrefs] = useState(loadPrefs);
  const cycle = useCallback((key, list) => {
    setPrefs((p) => {
      const next = { ...p, [key]: after(list, p[key]) };
      try {
        window.localStorage?.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* private mode — the choice lasts for this visit */
      }
      return next;
    });
  }, []);
  const cycleTrend = useCallback(() => cycle('trend', TREND_VIEWS), [cycle]);
  const cycleGraph = useCallback(() => cycle('graph', GRAPH_VIEWS), [cycle]);

  // The classic shell docks the pit board open beside the dial on a wide
  // window. Here the next tasks are already on the control panel, so the board
  // is a sheet you call up — arriving with it open would cover the cluster.
  // Done before first paint, so it never flashes.
  const [armed, setArmed] = useState(false);
  useLayoutEffect(() => {
    if (panel === 'board') tempo.closePanels();
    setArmed(true);
    // Once, on arrival. Opening the board afterwards is the user's call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same rule as the classic shell: only the in-app card takes over; a
  // picture-in-picture window leaves the app as it was.
  const widgetInApp = widget && !(widgetPinned && pipSupported);
  const effPanel = !armed || widgetInApp ? null : panel;

  // Panel openness (1 = open) from the panels' own springs and drags, so the
  // scrim follows the sheet under the finger rather than a separate timer.
  const boardProg = useMotionValue(0);
  const telemetryProg = useMotionValue(0);
  const setupProg = useMotionValue(0);
  const onBoardProgress = useCallback((v) => boardProg.set(v), [boardProg]);
  const onTelemetryProgress = useCallback((v) => telemetryProg.set(v), [telemetryProg]);
  const onSetupProgress = useCallback((v) => setupProg.set(v), [setupProg]);
  const scrimOpacity = useTransform(() => Math.max(boardProg.get(), telemetryProg.get(), setupProg.get()));

  // The last minute of a focus stint: the signal colour runs to orange.
  const final = mode === 'focus' && running && remainingMs < 60000;

  return (
    <div className="cockpit" data-running={running ? 'true' : 'false'} data-final={final ? 'true' : 'false'}>
      <header className="ck-top">
        <div className="ck-brand">
          <span className="ck-wordmark">TEMPO</span>
          <span className="ck-beta">COCKPIT · BETA</span>
        </div>
        {onSetUi && (
          <button type="button" className="ck-exit" onClick={() => onSetUi('classic')} title="Go back to the classic interface">
            CLASSIC VIEW
          </button>
        )}
      </header>

      <main className="ck-dash">
        <section className="ck-binnacle" aria-label="Instrument cluster">
          <div className="ck-glass">
            <LapsDial mode={mode} focusInCycle={tempo.focusInCycle} laps={settings.laps} />
            <StintDial mode={mode} running={running} remainingMs={remainingMs} totalMs={totalMs} />
            <TrendDial view={prefs.trend} stats={stats} onCycle={cycleTrend} />
            <div className="ck-telltales ck-telltales--left" aria-hidden="true">
              <span data-on={settings.autoStart ? 'true' : 'false'}>AUTO</span>
              <span data-on={settings.sound ? 'true' : 'false'}>SOUND</span>
            </div>
            <div className="ck-telltales ck-telltales--right" aria-hidden="true">
              <span data-on={sync === 'cloud' ? 'true' : 'false'}>CLOUD</span>
              <span data-on={sync === 'local' ? 'true' : 'false'}>LOCAL</span>
            </div>
          </div>
        </section>

        <ControlPanel tempo={tempo} graphView={prefs.graph} onCycleGraph={cycleGraph} panel={effPanel} />
      </main>

      <footer className="ck-foot">
        <span>
          <kbd>SPACE</kbd>START / PAUSE
        </span>
        <span>
          <kbd>R</kbd>RESET
        </span>
        <span>
          <kbd>S</kbd>SKIP
        </span>
      </footer>

      <motion.div className="ck-scrim" style={{ opacity: scrimOpacity, pointerEvents: effPanel ? 'auto' : 'none' }} onClick={tempo.closePanels}></motion.div>

      <PitBoard
        open={effPanel === 'board'}
        onProgress={onBoardProgress}
        draft={tempo.draft}
        todos={tempo.todos}
        currentTaskId={tempo.currentTaskId}
        onClose={tempo.closePanels}
        onDraftChange={tempo.setDraft}
        onAddTodo={tempo.addTodo}
        onToggleTodo={tempo.toggleTodo}
        onDeleteTodo={tempo.delTodo}
        onMoveTodo={tempo.moveTodo}
        onClearDone={tempo.clearDone}
      />

      <TaskPicker
        open={Boolean(tempo.picker)}
        intent={tempo.picker}
        todos={tempo.todos}
        currentTaskId={tempo.currentTaskId}
        onPick={tempo.pickTask}
        onAdd={tempo.addTaskAndFocus}
        onStartWithoutTask={tempo.startWithoutTask}
        onClose={tempo.closePicker}
      />

      <Telemetry open={effPanel === 'telemetry'} onProgress={onTelemetryProgress} days={tempo.days} stats={stats} sync={sync} onClose={tempo.closePanels} />

      <Setup
        open={effPanel === 'setup'}
        onProgress={onSetupProgress}
        settings={settings}
        uid={tempo.uid}
        userEmail={tempo.userEmail}
        onSignIn={tempo.signIn}
        onSignOut={tempo.signOut}
        onClose={tempo.closePanels}
        onStepSetting={tempo.stepSetting}
        onToggleSetting={tempo.toggleSetting}
        ui={ui}
        onSetUi={onSetUi}
      />

      <WidgetHost tempo={tempo} />
    </div>
  );
}
