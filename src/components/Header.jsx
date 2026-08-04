import './Header.css';

export default function Header({ chromeVisible, onOpenBoard, onToggleDock, onOpenTelemetry, onOpenSetup }) {
  return (
    <header className="topbar" style={{ display: chromeVisible ? 'flex' : 'none' }}>
      <div className="topbar-side topbar-side--left">
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenBoard}
          aria-label="Open pit board (to-dos)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="icon-svg">
            <line x1="9" y1="6" x2="21" y2="6"></line>
            <line x1="9" y1="12" x2="21" y2="12"></line>
            <line x1="9" y1="18" x2="21" y2="18"></line>
            <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"></circle>
            <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"></circle>
            <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"></circle>
          </svg>
        </button>
      </div>

      <div className="brand">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="brand-mark">
          <circle cx="12" cy="14.2" r="7.6" fill="none" stroke="#FF3B24" strokeWidth="1.6"></circle>
          <path
            d="M12 6.6 C10.4 4.9 8 4.4 6.3 5.5 C8.2 6.2 9.6 7 10.5 8.2 M12 6.6 C13.6 4.9 16 4.4 17.7 5.5 C15.8 6.2 14.4 7 13.5 8.2 M12 3.4 L12 7.2"
            fill="none"
            stroke="#4F9457"
            strokeWidth="1.5"
            strokeLinecap="round"
          ></path>
        </svg>
        <div>
          <div className="brand-title">TEMPO</div>
          <div className="brand-subtitle">POMODORO&nbsp;GT</div>
        </div>
      </div>

      <div className="topbar-side topbar-side--right">
        <button type="button" className="icon-btn" onClick={onToggleDock} aria-label="Dock as widget" title="Dock as widget">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="icon-svg">
            <line x1="12" y1="3" x2="12" y2="13"></line>
            <polyline points="8 9 12 13 16 9"></polyline>
            <line x1="5" y1="18" x2="19" y2="18"></line>
          </svg>
        </button>
        <button type="button" className="icon-btn" onClick={onOpenTelemetry} aria-label="Open telemetry (statistics)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="icon-svg">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </button>
        <button type="button" className="icon-btn" onClick={onOpenSetup} aria-label="Open set-up">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="icon-svg">
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
        </button>
      </div>
    </header>
  );
}
