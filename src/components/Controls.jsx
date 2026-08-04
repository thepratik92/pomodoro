export default function Controls({ running, onReset, onToggleRun, onSkip }) {
  return (
    <section className="controls">
      <button type="button" className="btn-round" onClick={onReset} aria-label="Reset session" title="Reset (R)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
      </button>

      <button type="button" className="btn-engine" onClick={onToggleRun} aria-label="Start or pause">
        <span className="btn-engine-label">ENGINE</span>
        <span className="btn-engine-state">{running ? 'PAUSE' : 'START'}</span>
      </button>

      <button type="button" className="btn-round" onClick={onSkip} aria-label="Skip to next session" title="Skip (S)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
          <polygon points="5 4 15 12 5 20 5 4"></polygon>
          <line x1="19" y1="5" x2="19" y2="19"></line>
        </svg>
      </button>
    </section>
  );
}
