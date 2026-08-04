import './App.css';
import { useTempo } from './hooks/useTempo';
import Header from './components/Header';
import Stage from './components/Stage';
import Footer from './components/Footer';
import PitBoard from './components/PitBoard';
import Telemetry from './components/Telemetry';
import Setup from './components/Setup';

export default function App() {
  const tempo = useTempo();
  const { running, panel, docked, narrow, days, stats, sync, settings, draft, todos } = tempo;

  const effPanel = docked ? null : panel;
  const chromeVisible = !docked;
  const overlayOpen = Boolean(effPanel && effPanel !== 'board');
  const stagePad = effPanel === 'board' && !narrow ? '340px' : '0px';
  const panelTf = (name, side) => (effPanel === name ? 'translateX(0)' : side === 'left' ? 'translateX(-103%)' : 'translateX(103%)');

  return (
    <div className="app-shell" style={{ paddingLeft: stagePad }}>
      <div
        className="ambient"
        style={{
          opacity: running ? 1 : 0.55,
          animation: running ? 'breathe 9s ease-in-out infinite' : 'none',
        }}
      ></div>

      <Header
        chromeVisible={chromeVisible}
        onOpenBoard={tempo.openBoard}
        onToggleDock={tempo.toggleDock}
        onOpenTelemetry={tempo.openTelemetry}
        onOpenSetup={tempo.openSetup}
      />

      <Stage tempo={tempo} lapsVisible={!docked} />

      <Footer visible={chromeVisible} />

      <button
        type="button"
        className="undock-btn"
        style={{ display: docked ? 'grid' : 'none' }}
        onClick={tempo.toggleDock}
        aria-label="Undock widget"
        title="Undock"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="18" x2="12" y2="8"></line>
          <polyline points="8 12 12 8 16 12"></polyline>
          <line x1="5" y1="4" x2="19" y2="4"></line>
        </svg>
      </button>

      <div className="scrim" style={{ opacity: overlayOpen ? 1 : 0, pointerEvents: overlayOpen ? 'auto' : 'none' }} onClick={tempo.closePanels}></div>

      <PitBoard
        transform={panelTf('board', 'left')}
        draft={draft}
        todos={todos}
        onClose={tempo.closePanels}
        onDraftChange={tempo.setDraft}
        onAddTodo={tempo.addTodo}
        onToggleTodo={tempo.toggleTodo}
        onDeleteTodo={tempo.delTodo}
        onClearDone={tempo.clearDone}
      />

      <Telemetry transform={panelTf('telemetry', 'right')} days={days} stats={stats} sync={sync} onClose={tempo.closePanels} />

      <Setup
        transform={panelTf('setup', 'right')}
        settings={settings}
        onClose={tempo.closePanels}
        onStepSetting={tempo.stepSetting}
        onToggleSetting={tempo.toggleSetting}
      />
    </div>
  );
}
