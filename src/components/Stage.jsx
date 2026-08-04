import './Stage.css';
import ModeNav from './ModeNav';
import Dial from './Dial';
import Controls from './Controls';
import LapsRow from './LapsRow';

export default function Stage({ tempo, lapsVisible }) {
  const { mode, running, remainingMs, totalMs, focusInCycle, settings, stats, currentTask, setMode, toggleRun, reset, skip, openPicker } = tempo;

  return (
    <main className="stage">
      <ModeNav mode={mode} onPick={setMode} />
      <Dial
        mode={mode}
        running={running}
        remainingMs={remainingMs}
        totalMs={totalMs}
        focusInCycle={focusInCycle}
        laps={settings.laps}
        currentTask={currentTask}
        onTaskClick={() => openPicker('switch')}
      />
      <Controls running={running} onReset={reset} onToggleRun={toggleRun} onSkip={skip} />
      <LapsRow visible={lapsVisible} mode={mode} focusInCycle={focusInCycle} laps={settings.laps} todayCount={stats.today.s || 0} />
    </main>
  );
}
