export default function LapsRow({ visible, mode, focusInCycle, laps, todayCount }) {
  const toms = [];
  for (let i = 0; i < laps; i++) {
    const done = i < focusInCycle;
    const cur = mode === 'focus' && i === focusInCycle;
    toms.push({
      fill: done ? '#FF3B24' : 'none',
      stroke: done || cur ? '#FF3B24' : 'var(--t-faint)',
      leaf: done || cur ? '#4F9457' : 'var(--t-faint)',
      filter: done ? 'drop-shadow(0 0 5px rgba(255,59,36,.5))' : 'none',
    });
  }
  const todayLine = todayCount + ' POMODOR' + (todayCount === 1 ? 'O' : 'I') + ' TODAY';

  return (
    <section className="laps" style={{ display: visible ? 'flex' : 'none' }}>
      <div className="laps-row">
        {toms.map((t, i) => (
          <span key={i} className="lap-tomato">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="lap-tomato-svg">
              <circle cx="12" cy="14.2" r="7.4" fill={t.fill} stroke={t.stroke} strokeWidth="1.6" style={{ filter: t.filter }}></circle>
              <path
                d="M12 7 C10.6 5.4 8.6 5 7.2 5.9 C8.8 6.5 10 7.2 10.8 8.3 M12 7 C13.4 5.4 15.4 5 16.8 5.9 C15.2 6.5 14 7.2 13.2 8.3 M12 4.2 L12 7.6"
                fill="none"
                stroke={t.leaf}
                strokeWidth="1.5"
                strokeLinecap="round"
              ></path>
            </svg>
          </span>
        ))}
      </div>
      <div className="today-line">{todayLine}</div>
    </section>
  );
}
