import SlidePanel from './SlidePanel';
import './Panel.css';
import './Setup.css';

const STEPPERS = [
  { key: 'focus', label: 'FOCUS', unit: 'MIN' },
  { key: 'short', label: 'SHORT BREAK', unit: 'MIN' },
  { key: 'long', label: 'LONG BREAK', unit: 'MIN' },
  { key: 'laps', label: 'LAPS PER SET', unit: '' },
];

const SWITCHES = [
  { key: 'autoStart', label: 'AUTO-START NEXT' },
  { key: 'sound', label: 'SOUND' },
];

const THEMES = ['dark', 'light', 'sepia'];

export default function Setup({ open, onProgress, settings, onClose, onStepSetting, onToggleSetting }) {
  return (
    <SlidePanel side="right" open={open} onClose={onClose} onProgress={onProgress} ariaLabel="Set-up">
      <div className="panel-header">
        <div className="panel-title">SET-UP</div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="Close set-up">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {STEPPERS.map((sp) => (
        <div key={sp.key} className="setup-row">
          <div className="setup-label">
            {sp.label}
            {sp.unit && <span className="setup-unit">{sp.unit}</span>}
          </div>
          <div className="stepper">
            <button type="button" className="stepper-btn" onClick={() => onStepSetting(sp.key, -1)} aria-label="Decrease">
              –
            </button>
            <span className="stepper-val">{settings[sp.key]}</span>
            <button type="button" className="stepper-btn" onClick={() => onStepSetting(sp.key, 1)} aria-label="Increase">
              +
            </button>
          </div>
        </div>
      ))}

      {SWITCHES.map((sw) => {
        const on = !!settings[sw.key];
        return (
          <div key={sw.key} className="setup-row">
            <div className="setup-label">{sw.label}</div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              className="switch"
              style={{
                background: on ? 'var(--accent)' : 'var(--t-switch)',
                borderColor: on ? 'var(--accent)' : 'var(--t-hair)',
                boxShadow: on ? '0 0 10px var(--glow)' : 'none',
              }}
              onClick={() => onToggleSetting(sw.key)}
            >
              <span
                className="switch-knob"
                style={{
                  background: on ? '#0B0B0E' : 'var(--t-knob)',
                  transform: on ? 'translateX(19px)' : 'translateX(0)',
                }}
              ></span>
            </button>
          </div>
        );
      })}

      <div className="setup-row">
        <div className="setup-label">THEME</div>
        <div className="theme-row">
          {THEMES.map((k) => {
            const cur = (settings.theme || 'dark') === k;
            return (
              <button
                type="button"
                key={k}
                className="theme-btn"
                style={{
                  borderColor: cur ? 'var(--accent)' : 'var(--t-hair)',
                  color: cur ? 'var(--t-text)' : 'var(--t-muted)',
                }}
                onClick={() => onToggleSetting('theme', k)}
              >
                {k.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <p className="setup-note">
        Each focus session is a lap — one pomodoro. After the final lap of a set, the long break comes in, then a fresh set begins.
      </p>
    </SlidePanel>
  );
}
