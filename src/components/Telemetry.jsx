import SlidePanel from './SlidePanel';
import './Panel.css';
import './Telemetry.css';
import { dayKey, shiftDays } from '../utils/dateKeys';

function WeekChart({ days }) {
  const W = 288;
  const H = 150;
  const padT = 20;
  const padB = 20;
  const n = 7;
  const gap = 10;
  const barW = (W - gap * (n + 1)) / n;

  const vals = [];
  const labels = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = shiftDays(-i);
    vals.push((days[dayKey(d)] || {}).m || 0);
    labels.push(['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]);
  }
  const max = Math.max(30, ...vals);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <line x1={0} y1={H - padB} x2={W} y2={H - padB} stroke="var(--t-hair2)" strokeWidth={1} />
      {vals.map((v, idx) => {
        const x = gap + idx * (barW + gap);
        const isToday = idx === n - 1;
        const h = v > 0 ? Math.max(3, (v / max) * (H - padT - padB)) : 0;
        const y = H - padB - h;
        return (
          <g key={idx}>
            {v > 0 ? (
              <>
                <rect x={x} y={y} width={barW} height={h} rx={2.5} fill="#FF2800" opacity={isToday ? 1 : 0.45} style={isToday ? { filter: 'drop-shadow(0 0 6px rgba(255,40,0,.45))' } : undefined} />
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill="var(--t-muted)" style={{ fontSize: 11.5, fontWeight: 400 }}>
                  {v}
                </text>
              </>
            ) : (
              <rect x={x} y={H - padB - 2} width={barW} height={2} rx={1} fill="#FF2800" opacity={0.18} />
            )}
            <text x={x + barW / 2} y={H - 5} textAnchor="middle" fill="var(--t-muted)" style={{ fontSize: 8, fontFamily: "'Michroma',sans-serif", letterSpacing: '.1em' }}>
              {labels[idx]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Telemetry({ open, onProgress, days, stats, sync, onClose }) {
  const { today, weekM, weekS, streak } = stats;
  const rows = [
    { label: 'TODAY', value: today.m + ' min · ' + today.s + ' lap' + (today.s === 1 ? '' : 's') },
    { label: 'THIS WEEK', value: weekM + ' min · ' + weekS + ' lap' + (weekS === 1 ? '' : 's') },
    { label: 'STREAK', value: streak + ' day' + (streak === 1 ? '' : 's') },
  ];
  const syncText = sync === 'cloud' ? 'CLOUD · SYNCED' : sync === 'local' ? 'SAVED ON THIS DEVICE' : 'OFFLINE — SESSION ONLY';
  const syncOn = sync !== 'off';

  return (
    <SlidePanel side="right" open={open} onClose={onClose} onProgress={onProgress} ariaLabel="Telemetry">
      <div className="panel-header">
        <div className="panel-title">TELEMETRY</div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="Close telemetry">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {rows.map((r) => (
        <div key={r.label} className="stat-row">
          <div className="stat-label">{r.label}</div>
          <span className="stat-value">{r.value}</span>
        </div>
      ))}

      <div className="chart-block">
        <div className="chart-title">LAST 7 DAYS · FOCUS MINUTES</div>
        <WeekChart days={days} />
      </div>

      <div className="sync-row">
        <span
          className="sync-dot"
          style={{
            background: syncOn ? '#4F9457' : 'var(--t-faint)',
            boxShadow: syncOn ? '0 0 6px rgba(79,148,87,.6)' : 'none',
          }}
        ></span>
        <span>{syncText}</span>
      </div>
    </SlidePanel>
  );
}
