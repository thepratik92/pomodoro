import { useCallback } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react';
import './App.css';
import { useTempo } from './hooks/useTempo';
import Header from './components/Header';
import Stage from './components/Stage';
import Footer from './components/Footer';
import Collapse from './components/Collapse';
import PitBoard from './components/PitBoard';
import TaskPicker from './components/TaskPicker';
import Telemetry from './components/Telemetry';
import Setup from './components/Setup';
import WidgetHost from './components/WidgetHost';
import { pipSupported } from './hooks/usePipWindow';

export default function App() {
  const tempo = useTempo();
  const { running, panel, widget, widgetPinned, narrow, days, stats, sync, settings, draft, todos, uid, userEmail } = tempo;

  // Where the mini widget ends up: its own always-on-top OS window when the
  // platform offers one and the user has it pinned, otherwise a floating card
  // inside this window. Only the in-app card displaces the app's own chrome —
  // a picture-in-picture window leaves the full app exactly as it was.
  const widgetInApp = widget && !(widgetPinned && pipSupported);
  const widgetFloatingOut = widget && !widgetInApp;

  const effPanel = widgetInApp ? null : panel;
  const chromeVisible = !widgetInApp;
  const overlayOpen = Boolean(effPanel && effPanel !== 'board');

  // Panel openness as live values (1 = open), fed by the panels' springs and
  // drags, so the scrim and stage shift track the actual motion 1:1.
  const boardProg = useMotionValue(effPanel === 'board' && !narrow ? 1 : 0);
  const telemetryProg = useMotionValue(0);
  const setupProg = useMotionValue(0);
  const onBoardProgress = useCallback((v) => boardProg.set(v), [boardProg]);
  const onTelemetryProgress = useCallback((v) => telemetryProg.set(v), [telemetryProg]);
  const onSetupProgress = useCallback((v) => setupProg.set(v), [setupProg]);

  const stagePad = useTransform(boardProg, (p) => (narrow ? 0 : Math.round(p * 340)) + 'px');
  const scrimOpacity = useTransform(() => Math.max(telemetryProg.get(), setupProg.get()));

  return (
    <motion.div className="app-shell" style={{ paddingLeft: stagePad }}>
      <div
        className="ambient"
        style={{
          opacity: running ? 1 : 0.55,
          animation: running ? 'breathe 9s ease-in-out infinite' : 'none',
        }}
      ></div>

      <Collapse show={chromeVisible}>
        <Header
          onOpenBoard={tempo.openBoard}
          onOpenWidget={tempo.toggleWidget}
          onOpenTelemetry={tempo.openTelemetry}
          onOpenSetup={tempo.openSetup}
        />
      </Collapse>

      <Stage tempo={tempo} lapsVisible={!widgetInApp} />

      <Collapse show={chromeVisible}>
        <Footer />
      </Collapse>

      <AnimatePresence>
        {widgetFloatingOut && (
          <motion.button
            type="button"
            className="undock-btn"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 440, damping: 40 }}
            onClick={tempo.closeWidget}
            aria-label="Close the floating mini widget"
            title="Mini widget is floating on top — click to close it"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="18" x2="12" y2="8"></line>
              <polyline points="8 12 12 8 16 12"></polyline>
              <line x1="5" y1="4" x2="19" y2="4"></line>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        className="scrim"
        style={{ opacity: scrimOpacity, pointerEvents: overlayOpen ? 'auto' : 'none' }}
        onClick={tempo.closePanels}
      ></motion.div>

      <PitBoard
        open={effPanel === 'board'}
        onProgress={onBoardProgress}
        draft={draft}
        todos={todos}
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
        todos={todos}
        currentTaskId={tempo.currentTaskId}
        onPick={tempo.pickTask}
        onAdd={tempo.addTaskAndFocus}
        onStartWithoutTask={tempo.startWithoutTask}
        onClose={tempo.closePicker}
      />

      <Telemetry open={effPanel === 'telemetry'} onProgress={onTelemetryProgress} days={days} stats={stats} sync={sync} onClose={tempo.closePanels} />

      <Setup
        open={effPanel === 'setup'}
        onProgress={onSetupProgress}
        settings={settings}
        uid={uid}
        userEmail={userEmail}
        onSignIn={tempo.signIn}
        onSignOut={tempo.signOut}
        onClose={tempo.closePanels}
        onStepSetting={tempo.stepSetting}
        onToggleSetting={tempo.toggleSetting}
      />

      <WidgetHost tempo={tempo} />
    </motion.div>
  );
}
