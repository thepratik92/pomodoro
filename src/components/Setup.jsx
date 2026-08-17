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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" width="13" height="13" style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.027 17.64 11.72 17.64 9.2Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

export default function Setup({ open, onProgress, settings, uid, userEmail, onSignIn, onSignOut, onClose, onStepSetting, onToggleSetting }) {
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

      <div className="setup-row setup-row--sync">
        <div className="setup-label">
          CLOUD SYNC
          <span className="sync-badge" data-on={uid ? 'true' : 'false'}>{uid ? 'ON' : 'OFF'}</span>
        </div>
        {uid ? (
          <div className="sync-signed-in">
            <span className="sync-email" title={userEmail}>{userEmail}</span>
            <button type="button" className="sync-btn" onClick={onSignOut}>SIGN OUT</button>
          </div>
        ) : (
          <button type="button" className="sync-btn sync-btn--google" onClick={onSignIn}>
            <GoogleIcon />
            SIGN IN
          </button>
        )}
      </div>

      <p className="setup-note">
        Each focus session is a lap — one pomodoro. After the final lap of a set, the long break comes in, then a fresh set begins.
      </p>
    </SlidePanel>
  );
}
