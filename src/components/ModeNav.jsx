import { Fragment } from 'react';

const MODES = [
  { key: 'focus', label: 'FOCUS' },
  { key: 'short', label: 'SHORT BREAK' },
  { key: 'long', label: 'LONG BREAK' },
];

export default function ModeNav({ mode, onPick }) {
  return (
    <nav aria-label="Session type" className="mode-nav">
      {MODES.map((mo, i) => (
        <Fragment key={mo.key}>
          <button type="button" className="mode-btn" style={{ color: mo.key === mode ? 'var(--t-text)' : 'var(--t-muted)' }} onClick={() => onPick(mo.key)}>
            {mo.label}
            <span className="mode-underline" style={{ opacity: mo.key === mode ? 1 : 0 }}></span>
          </button>
          {i < MODES.length - 1 && <span className="mode-sep"></span>}
        </Fragment>
      ))}
    </nav>
  );
}
